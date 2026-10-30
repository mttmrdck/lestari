// Local-only helper for scripts/build-embeddings.ts. Never deployed.
export default {
  async fetch(req, env) {
    const { texts } = await req.json();
    return Response.json(await env.AI.run('@cf/baai/bge-m3', { text: texts }));
  },
};
