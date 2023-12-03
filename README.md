# @podium/fastify-podlet

Fastify plugin for @podium/podlet.

[![GitHub Actions status](https://github.com/podium-lib/fastify-podlet/workflows/Run%20Lint%20and%20Tests/badge.svg)](https://github.com/podium-lib/fastify-podlet/actions?query=workflow%3A%22Run+Lint+and+Tests%22)
[![Known Vulnerabilities](https://snyk.io/test/github/podium-lib/fastify-podlet/badge.svg)](https://snyk.io/test/github/podium-lib/fastify-podlet)

Module for building [@podium/podlet] servers with [fastify]. For writing podlets,
please see the [Podium documentation].

## Installation

```bash
$ npm install @podium/fastify-podlet
```

## Requirements

This module require Fastify v2.0.0 or newer.

## Simple usage

Build a simple podlet server:

```js
import fastifyPodletPlugin from '@podium/fastify-podlet';
import fastify from 'fastify';
import Podlet from '@podium/podlet';

const app = fastify();

const podlet = new Podlet({
    pathname: '/',
    version: '2.0.0',
    name: 'podletContent',
});

// Register the plugin, with the podlet as the option
app.register(fastifyPodletPlugin, podlet);

app.get(podlet.content(), async (request, reply) => {
    if (reply.app.podium.context.locale === 'nb-NO') {
        reply.podiumSend('<h2>Hei verden</h2>');
        return;
    }
    reply.podiumSend('<h2>Hello world</h2>');
});

app.get(podlet.manifest(), async (request, reply) => {
    reply.send(podlet);
});

const start = async () => {
  try {
    await app.listen(7100)
    app.log.info(`server listening on ${app.server.address().port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
};
start();
```

## Register plugin

The plugin is registered by passing an instance of this plugin to the [fastify]
server `.register()` method together with an instance of the [@podium/podlet]
class.

```js
app.register(fastifyPodletPlugin, podlet);
```

## Request params

On each request [@podium/podlet] will run a set of operations, such as
deserialization of the [@podium/context], on the request. When doing so
[@podium/podlet] will write parameters to `reply.app.podium` which is
accessible inside a request handelers.

```js
app.get(podlet.content(), async (request, reply) => {
    if (reply.app.podium.context.locale === 'nb-NO') {
        reply.podiumSend('<h2>Hei verden</h2>');
        return;
    }
    reply.podiumSend('<h2>Hello world</h2>');
});
```

## reply.podiumSend(fragment)

When in development mode this method will wrap the provided fragment in a
default HTML document before dispatching. When not in development mode, this
method will just dispatch the fragment.

See [development mode] for further information.

## License

Copyright (c) 2019 FINN.no

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[development mode]: https://github.com/podium-lib/podlet/blob/master/README.md#development-mode 'Development mode'
[@podium/context locale parser]: https://github.com/podium-lib/context#locale-1 '@podium/context locale parser'
[Podium documentation]: https://podium-lib.io/ 'Podium documentation'
[@podium/context]: https://github.com/podium-lib/context '@podium/context'
[@podium/podlet]: https://github.com/podium-lib/podlet '@podium/podlet'
[fastify]: https://www.fastify.io/ 'Fastify'
