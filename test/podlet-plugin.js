/* eslint-disable no-param-reassign */

'use strict';

const fastifyForm = require('fastify-formbody');
const { request } = require('@podium/test-utils');
const fastify = require('fastify');
const Podlet = require('@podium/podlet');
const tap = require('tap');
const FastifyPodlet = require('../');

class Server {
    constructor({ podletOptions = {}, pluginOptions = {} } = {}) {
        this.app = fastify();

        const podlet = new Podlet({
            pathname: '/',
            fallback: '/fallback',
            version: '2.0.0',
            name: 'podletContent',
            ...podletOptions,
        });

        podlet.view((incoming, fragment) => {
            return `## ${fragment} ##`;
        });

        podlet.defaults({
            locale: 'nb-NO',
        });

        this.app.register(FastifyPodlet, { podlet, ...pluginOptions });
        this.app.register(fastifyForm); // Needed to handle non GET requests

        this.app.get(podlet.content(), async (req, reply) => {
            if (reply.app.podium.context.locale === 'nb-NO') {
                reply.podiumSend('nb-NO');
                return;
            }
            if (reply.app.podium.context.locale === 'en-NZ') {
                reply.podiumSend('en-NZ');
                return;
            }
            reply.podiumSend('en-US');
        });

        this.app.get(podlet.fallback(), async (req, reply) => {
            reply.podiumSend('fallback');
        });

        this.app.get(podlet.manifest(), async (req, reply) => {
            reply.send(podlet);
        });

        // Dummy endpoints for proxying
        this.app.get('/public', async (req, reply) => {
            reply.send('GET proxy target');
        });

        this.app.post('/public', async (req, reply) => {
            reply.send('POST proxy target');
        });

        this.app.put('/public', async (req, reply) => {
            reply.send('PUT proxy target');
        });

        // Proxy to the dummy endpoints
        podlet.proxy({ target: '/public', name: 'localApi' });
    }

    listen() {
        return new Promise((resolve, reject) => {
            this.app
                .listen(0)
                .then(() => {
                    const address = this.app.server.address();
                    const url = `http://${address.address}:${address.port}`;
                    resolve(url);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    close() {
        return new Promise(resolve => {
            this.app.close(() => {
                resolve();
            });
        });
    }
}

tap.test(
    'request "manifest" url - should return content of "manifest" url',
    async t => {
        const server = new Server();
        const address = await server.listen();
        const result = await request({ address, pathname: '/manifest.json' });
        const parsed = JSON.parse(result.body);

        t.equal(parsed.version, '2.0.0');
        t.equal(parsed.fallback, '/fallback');
        t.equal(parsed.content, '/');
        t.equal(parsed.name, 'podletContent');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "content" url - development: false - should return default content of "content" url',
    async t => {
        const server = new Server({ podletOptions: { development: false } });
        const address = await server.listen();
        const result = await request({ address });

        t.equal(result.body, 'en-US');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "content" url - development: true - should return context aware content of "content" url',
    async t => {
        const server = new Server({ podletOptions: { development: true } });
        const address = await server.listen();
        const result = await request({ address });

        t.equal(result.body, '## nb-NO ##');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "content" url - development: true - should return development mode decorated content of "content" url',
    async t => {
        const server = new Server({ podletOptions: { development: true } });
        const address = await server.listen();
        const result = await request({ address });

        t.equal(result.body, '## nb-NO ##');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "fallback" url - development: false - should return content of "fallback" url',
    async t => {
        const server = new Server();
        const address = await server.listen();
        const result = await request({ address, pathname: '/fallback' });

        t.equal(result.body, 'fallback');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "fallback" url - development: false - should return development mode decorated content of "fallback" url',
    async t => {
        const server = new Server({ podletOptions: { development: true } });
        const address = await server.listen();
        const result = await request({ address, pathname: '/fallback' });

        t.equal(result.body, '## fallback ##');

        await server.close();
        t.end();
    },
);

tap.test('request "manifest" url - should have version header', async t => {
    const server = new Server();
    const address = await server.listen();
    const result = await request({ address, pathname: '/manifest.json' });

    t.equal(result.headers['podlet-version'], '2.0.0');

    await server.close();
    t.end();
});

tap.test('request "content" url - should have version header', async t => {
    const server = new Server();
    const address = await server.listen();
    const result = await request({ address });

    t.equal(result.headers['podlet-version'], '2.0.0');

    await server.close();
    t.end();
});

tap.test('request "fallback" url - should have version header', async t => {
    const server = new Server();
    const address = await server.listen();
    const result = await request({ address, pathname: '/fallback' });

    t.equal(result.headers['podlet-version'], '2.0.0');

    await server.close();
    t.end();
});

tap.test(
    'request "content" url - set a context parameter - should alter content of "content" url based on context',
    async t => {
        const server = new Server();
        const address = await server.listen();
        const result = await request({
            address,
            headers: {
                'podium-locale': 'en-NZ',
            },
        });

        t.equal(result.body, 'en-NZ');

        await server.close();
        t.end();
    },
);

tap.test(
    'GET "proxy" url - development: false - should not proxy content',
    async t => {
        const server = new Server();
        const address = await server.listen();
        const result = await request({
            address,
            pathname: '/podium-resource/podletContent/localApi',
        });

        t.equal(result.body, 'Not found');

        await server.close();
        t.end();
    },
);

tap.test(
    'GET "proxy" url - development: true - should proxy content',
    async t => {
        const server = new Server({ podletOptions: { development: true } });
        const address = await server.listen();
        const result = await request({
            address,
            pathname: '/podium-resource/podletContent/localApi',
        });

        t.equal(result.body, 'GET proxy target');

        await server.close();
        t.end();
    },
);

tap.test(
    'GET "proxy" url - development: true - should have version header',
    async t => {
        const server = new Server({ podletOptions: { development: true } });
        const address = await server.listen();
        const result = await request({
            address,
            pathname: '/podium-resource/podletContent/localApi',
        });

        t.equal(result.headers['podlet-version'], '2.0.0');

        await server.close();
        t.end();
    },
);

tap.test(
    'POST to "proxy" url - development: true - should proxy content',
    async t => {
        const server = new Server({ podletOptions: { development: true } });
        const address = await server.listen();
        const result = await request(
            {
                address,
                method: 'POST',
                pathname: '/podium-resource/podletContent/localApi',
            },
            'payload',
        );

        t.equal(result.body, 'POST proxy target');

        await server.close();
        t.end();
    },
);

tap.test(
    'PUT to "proxy" url - development: true - should proxy content',
    async t => {
        const server = new Server({ podletOptions: { development: true } });
        const address = await server.listen();
        const result = await request(
            {
                address,
                method: 'PUT',
                pathname: '/podium-resource/podletContent/localApi',
            },
            'payload',
        );

        t.equal(result.body, 'PUT proxy target');

        await server.close();
        t.end();
    },
);

tap.test('Enable dev tool', async t => {
    const server = new Server({
        podletOptions: { development: true },
        pluginOptions: {
            devTool: { enabled: true, port: 6543 },
        },
    });
    await server.listen();
    const result = await request({
        address: `http://localhost:6543`,
        pathname: '/',
        json: true,
    });

    t.same(result.body, { version: '4.0.0', enabled: true });

    await server.close();
    t.end();
});

tap.test('Disabled dev tool', async t => {
    const server = new Server({
        podletOptions: { development: true },
        pluginOptions: {
            devTool: { enabled: false, port: 6543 },
        },
    });
    await server.listen();
    const result = await request({
        address: `http://localhost:6543`,
        pathname: '/',
        json: true,
    });

    t.same(result.body, { version: '4.0.0', enabled: false });

    await server.close();
    t.end();
});
