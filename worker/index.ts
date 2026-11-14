// Cloudflare Worker entry. Static files (the app) are served straight from ./dist; only /api/*
// reaches this code (see wrangler.jsonc). All state lives in one Durable Object, so every request
// sees the same campaign and the same passphrase, with no eventual-consistency surprises.
import { DurableObject } from 'cloudflare:workers';
import { Api, type ApiEnv, type Store } from './api';

interface Env extends ApiEnv {
  ASSETS: { fetch(req: Request): Promise<Response> };
  CAMPAIGN: DurableObjectNamespace<CampaignStore>;
}

export class CampaignStore extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const s = this.ctx.storage;
    const store: Store = {
      get: (key) => s.get(key),
      put: (entries) => s.put(entries),
      delete: async (keys) => { if (keys.length) await s.delete(keys); },
    };
    // One request at a time: sync writes compare-and-swap a revision number.
    let res!: Response;
    await this.ctx.blockConcurrencyWhile(async () => { res = await new Api(store, this.env).handle(req); });
    return res;
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return env.CAMPAIGN.get(env.CAMPAIGN.idFromName('solmourn')).fetch(req);
    return env.ASSETS.fetch(req);
  },
};
