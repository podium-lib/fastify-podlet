import { HttpIncoming, pathnameBuilder } from '@podium/utils';
import fp from 'fastify-plugin';

export default fp(
    /**
     * @type {import('fastify').FastifyPluginCallback<import('@podium/podlet').default>}
     */
    (fastify, podlet, done) => {
        // Decorate reply with .app.podium we can write to throught the request
        fastify.decorateReply('app', null);
        fastify.addHook('onRequest', async (request, reply) => {
            // @ts-ignore We decorate this above
            reply.app = {
                podium: {},
            };
        });

        // Run parsers on pre handler and store state object on reply.app.podium
        fastify.addHook('preHandler', async (request, reply) => {
            const incoming = new HttpIncoming(
                request.raw,
                reply.raw,
                // @ts-ignore
                reply.app.params,
            );
            // @ts-ignore We decorate this above
            reply.app.podium = await podlet.process(incoming, { proxy: false });
        });

        // Set http headers on response
        fastify.addHook('preHandler', async (request, reply) => {
            reply.header('podlet-version', podlet.version);
        });

        // Decorate response with .podiumSend() method
        fastify.decorateReply('podiumSend', function podiumSend(payload) {
            this.type('text/html; charset=utf-8'); // "this" here is the fastify 'Reply' object
            return this.send(
                podlet.render(
                    // @ts-ignore We decorate this above
                    this.app.podium,
                    payload,
                ),
            );
        });

        // Mount proxy route as an instance so its executed only on
        // the registered path. Iow: the proxy check is not run on
        // any other routes
        fastify.register((instance, opts, next) => {
            const pathname = pathnameBuilder(
                podlet.httpProxy.pathname,
                podlet.httpProxy.prefix,
                '/*',
            );

            // Allow all content types for proxy requests
            // https://github.com/fastify/fastify/blob/main/docs/ContentTypeParser.md#catch-all
            instance.addContentTypeParser('*', (req, payload, cb) => {
                // @ts-ignore
                cb();
            });

            instance.addHook('preHandler', async (req, reply) => {
                const incoming = await podlet.httpProxy.process(
                    // @ts-ignore We decorate this above
                    reply.app.podium,
                );
                if (incoming.proxy) return;
                return incoming;
            });

            instance.all(pathname, (req, reply) => {
                reply.code(404).send('Not found');
            });

            next();
        });

        done();
    },
    {
        name: 'podium-podlet',
    },
);
