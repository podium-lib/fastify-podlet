declare module 'fastify' {
    interface PodiumLocals {} // this is declared in @podium/podlet, we just hook onto it here

    interface FastifyReply {
        app: PodiumLocals;

        /**
         * Calls the send / write method on the `http.ServerResponse` object.
         *
         * When in development mode this method will wrap the provided fragment in a
         * default HTML document before dispatching. When not in development mode, this
         * method will just dispatch the fragment.
         *
         * @example
         * app.get(podlet.content(), async (req, reply) => {
         *   reply.podiumSend('<h1>Hello World</h1>');
         *   await reply;
         * });
         */
        podiumSend(fragment: string, ...args: unknown[]): Response;
    }
}
