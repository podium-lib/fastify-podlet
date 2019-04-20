'use strict';

const { HttpIncoming } = require('@podium/utils');
const utils = require('@podium/utils');
const fp = require('fastify-plugin')

const podiumPodletFastifyPlugin = (fastify, podlet, done) => {

    // Decorate reply with .app.podium we can write to throught the request
    fastify.decorateReply('app', {
        podium: {},
    });

    // Run parsers on request and store state object on reply.app.podium
    fastify.addHook('onRequest', async (request, reply) => {
        const incoming = new HttpIncoming(request.req, reply.res, reply.app.params);
        reply.app.podium = await podlet.process(incoming);
        return;
    });

    // Set http headers on response
    fastify.addHook('preHandler', async (request, reply) => {
        reply.header('podlet-version', podlet.version);
        return;
    });

    // Decorate response with .podiumSend() method
    fastify.decorateReply('podiumSend', function (payload) {
        this.type('text/html'); // "this" here is the fastify 'Reply' object
        this.send(payload);
    })

    // Mount proxy route as an instance so its executed only on
    // the registered path. Iow: the proxy check is not run on
    // any other routes
    fastify.register((instance, opts, next) => {
        const pathname = utils.pathnameBuilder(
            podlet.httpProxy.pathname,
            podlet.httpProxy.prefix,
            '/*',
        );

        instance.addHook('preHandler', async (req, reply) => {
            const incoming = await podlet.httpProxy.process(
                reply.app.podium,
            );

            // If a HttpIncoming object is returned, there was
            // nothing to proxy..
            if (incoming) {
                return incoming;
            }

            return;
        })

        instance.all(pathname, (req, reply) => {
           reply.code(404).send('Not found');
        });

        next()
    });

    done();
}

module.exports = fp(podiumPodletFastifyPlugin, {
    fastify: '^2.0.0',
    name: 'podium-podlet'
});
