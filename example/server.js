'use strict';

const FastifyPodlet = require('../');
const fastify = require('fastify');
const Podlet = require('@podium/podlet');

const app = fastify({ logger: true })

const podlet = new Podlet({
    pathname: '/',
    fallback: '/fallback',
    version: `2.0.0-${Date.now().toString()}`,
    logger: console,
    name: 'podletContent',
    development: true,
});

podlet.defaults({
    locale: 'nb-NO',
});

app.register(FastifyPodlet, podlet);

app.get(podlet.content(), async (request, reply) => {
    if (reply.app.podium.context.locale === 'nb-NO') {
        reply.podiumSend('<h2>Hei verden</h2>');
        return;
    }
    reply.podiumSend('<h2>Hello world</h2>');
});

app.get(podlet.fallback(), async (request, reply) => {
    reply.podiumSend('<h2>We are sorry but we can not display this!</h2>');
});

app.get(podlet.manifest(), async (request, reply) => {
    reply.send(podlet);
});

app.get('/public', async (request, reply) => {
  reply.send({ say: 'Hello world' });
});

// Test URL: http://localhost:7100/podium-resource/podletContent/localApi
podlet.proxy({ target: '/public', name: 'localApi' });
// Test URL: http://localhost:7100/podium-resource/podletContent/remoteApi
podlet.proxy({ target: 'https://api.ipify.org', name: 'remoteApi' });

// Run the server!
const start = async () => {
  try {
    await app.listen(7100)
    app.log.info(`server listening on ${app.server.address().port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}
start()