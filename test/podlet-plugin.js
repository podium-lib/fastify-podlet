import fastifyForm from '@fastify/formbody';
import { request } from '@podium/test-utils';
import fastify from 'fastify';
import Podlet from '@podium/podlet';
import tap from 'tap';
import fastifyPodletPlugin from '../lib/podlet-plugin.js';

class Server {
    constructor(options = {}) {
        this.app = fastify();

        const podlet = new Podlet({
            pathname: '/',
            fallback: '/fallback',
            version: '2.0.0',
            name: 'podletContent',
            ...options,
        });

        podlet.view((incoming, fragment) => `## ${fragment} ##`);

        podlet.defaults({
            locale: 'nb-NO',
        });

        this.app.register(fastifyPodletPlugin, podlet);
        this.app.register(fastifyForm); // Needed to handle non GET requests

        this.app.get(podlet.content(), async (req, reply) => {
            // @ts-ignore
            if (reply.app.podium.context.locale === 'nb-NO') {
                // @ts-ignore
                return reply.podiumSend('nb-NO');
            }
            // @ts-ignore
            if (reply.app.podium.context.locale === 'en-NZ') {
                // @ts-ignore
                return reply.podiumSend('en-NZ');
            }
            // @ts-ignore
            return reply.podiumSend('en-US');
        });

        this.app.get(podlet.fallback(), async (req, reply) => {
            // @ts-ignore
            return reply.podiumSend('fallback');
        });

        this.app.get(podlet.manifest(), async (req, reply) => {
            return reply.send(podlet);
        });

        // Dummy endpoints for proxying
        this.app.get('/public', async (req, reply) => {
            return reply.send('GET proxy target');
        });

        this.app.post('/public', async (req, reply) => {
            return reply.send('POST proxy target');
        });

        this.app.put('/public', async (req, reply) => {
            return reply.send('PUT proxy target');
        });

        // Proxy to the dummy endpoints
        podlet.proxy({ target: '/public', name: 'localApi' });
    }

    listen() {
        return new Promise((resolve, reject) => {
            this.app
                .listen({ port: 0, host: '127.0.0.1' })
                .then(() => {
                    const address = this.app.server.address();
                    // @ts-ignore
                    const url = `http://${address.address}:${address.port}`;
                    resolve(url);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    close() {
        return new Promise((resolve) => {
            this.app.close(() => {
                resolve();
            });
        });
    }
}

tap.test(
    'request "manifest" url - should return content of "manifest" url',
    async (t) => {
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
    async (t) => {
        const server = new Server({ development: false });
        const address = await server.listen();
        const result = await request({ address });

        t.equal(result.body, 'en-US');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "content" url - development: true - should return context aware content of "content" url',
    async (t) => {
        const server = new Server({ development: true });
        const address = await server.listen();
        const result = await request({ address });

        t.equal(result.body, '## nb-NO ##');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "content" url - development: true - should return development mode decorated content of "content" url',
    async (t) => {
        const server = new Server({ development: true });
        const address = await server.listen();
        const result = await request({ address });

        t.equal(result.body, '## nb-NO ##');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "fallback" url - development: false - should return content of "fallback" url',
    async (t) => {
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
    async (t) => {
        const server = new Server({ development: true });
        const address = await server.listen();
        const result = await request({ address, pathname: '/fallback' });

        t.equal(result.body, '## fallback ##');

        await server.close();
        t.end();
    },
);

tap.test('request "manifest" url - should have version header', async (t) => {
    const server = new Server();
    const address = await server.listen();
    const result = await request({ address, pathname: '/manifest.json' });

    t.equal(result.headers['podlet-version'], '2.0.0');

    await server.close();
    t.end();
});

tap.test('request "content" url - should have version header', async (t) => {
    const server = new Server();
    const address = await server.listen();
    const result = await request({ address });

    t.equal(result.headers['podlet-version'], '2.0.0');

    await server.close();
    t.end();
});

tap.test('request "fallback" url - should have version header', async (t) => {
    const server = new Server();
    const address = await server.listen();
    const result = await request({ address, pathname: '/fallback' });

    t.equal(result.headers['podlet-version'], '2.0.0');

    await server.close();
    t.end();
});

tap.test(
    'request "content" url - set a context parameter - should alter content of "content" url based on context',
    async (t) => {
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
    async (t) => {
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
    async (t) => {
        const server = new Server({ development: true });
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
    async (t) => {
        const server = new Server({ development: true });
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
    async (t) => {
        const server = new Server({ development: true });
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
    async (t) => {
        const server = new Server({ development: true });
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
