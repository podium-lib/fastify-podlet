/* eslint-disable no-param-reassign */

'use strict';

const utils = require('@podium/utils');
const fp = require('fastify-plugin');

const podiumPodletFastifyPlugin = (fastify, podlet, done) => {
    // Decorate reply with .app.podium we can write to throught the request
    fastify.decorateReply('app', {
        podium: {},
    });

    // Run parsers on request and store state object on reply.app.podium
    fastify.addHook('onRequest', async (request, reply) => {
        const incoming = new utils.HttpIncoming(
            request.req,
            reply.res,
            reply.app.params,
        );
        reply.app.podium = await podlet.process(incoming);
    });

    // Set http headers on response
    fastify.addHook('preHandler', async (request, reply) => {
        reply.header('podlet-version', podlet.version);
    });

    // Decorate response with .podiumSend() method
    fastify.decorateReply('podiumSend', function podiumSend(payload) {
        this.type('text/html'); // "this" here is the fastify 'Reply' object
        this.send(podlet.render(this.app.podium, payload));
    });

    // Mount proxy route as an instance so its executed only on
    // the registered path. Iow: the proxy check is not run on
    // any other routes
    fastify.register((instance, opts, next) => {
        const pathname = utils.pathnameBuilder(
            podlet.httpProxy.pathname,
            podlet.httpProxy.prefix,
            '/*',
        );

        // Allow all content types for proxy requests
        // https://github.com/fastify/fastify/blob/master/docs/ContentTypeParser.md#catch-all
        instance.addContentTypeParser('*', (req, cb) => {
            cb();
        });

        instance.addHook('preHandler', async (req, reply) => {
            const incoming = await podlet.httpProxy.process(reply.app.podium);
            if (incoming.proxy) return;
            return incoming;
        });

        instance.all(pathname, (req, reply) => {
            reply.code(404).send('Not found');
        });

        next();
    });

    done();
};

module.exports = fp(podiumPodletFastifyPlugin, {
    fastify: '^2.0.0',
    name: 'podium-podlet',
});
