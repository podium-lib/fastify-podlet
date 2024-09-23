import { HttpIncoming } from '@podium/utils';

declare module 'fastify' {
    interface PodiumHttpIncomingParameters {
        [key: string]: unknown;
    }

    // @podium/podlet declares what's on the context. We use the same interface names here to inherit them.

    interface PodiumHttpIncomingContext {
        [key: string]: unknown;
    }

    interface PodiumHttpIncomingViewParameters {
        [key: string]: unknown;
    }

    interface PodiumLocals {
        podium: HttpIncoming<
            PodiumHttpIncomingParameters,
            PodiumHttpIncomingContext,
            PodiumHttpIncomingViewParameters
        >;
    }

    interface FastifyReply {
        app: PodiumLocals;

        /**
         * When in development mode this method will wrap the provided fragment in a
         * default HTML document before dispatching. When not in development mode, this
         * method will just dispatch the fragment.
         *
         * @example
         * app.get(podlet.content(), async (req, reply) => {
         *   return reply.podiumSend('<h1>Hello World</h1>');
         * });
         */
        podiumSend(fragment: string, ...args: unknown[]): FastifyReply;
    }
}
