# Assistant worker

The Anthropic key lives here because GitHub Pages serves static files and cannot
hold a secret. The browser talks to this worker; only this worker talks to
Anthropic.

## Deploy

This has all been done once already, on 2026-09-05. The worker is deployed, the
secret is set and the KV namespace exists and is bound. What follows is the
recipe for doing it again from nothing.

```
cd worker
npx wrangler secret put ANTHROPIC_API_KEY     # paste the key, never commit it
npx wrangler kv namespace create RATE          # then paste the id into wrangler.toml
npx wrangler deploy                            # first time only: creates the script
```

After the first deploy, use the versions pair instead — `wrangler deploy` on an
existing worker does not always move traffic, and `wrangler secret put` creates a
new version WITHOUT deploying it, which is how a correct key can sit on the
account while the live worker still answers 500:

```
npx wrangler versions upload
npx wrangler versions deploy <version-id>@100% --yes
npx wrangler deployments status                # confirm the version you expect
```

The endpoint the site calls is NOT an environment variable. It is a literal in
`src/i18n/assistant-ui.ts` (`ASSISTANT_CONFIG.endpoint`) — change it there and
rebuild. An earlier version of this file described a `PUBLIC_ASSISTANT_ENDPOINT`
build variable; nothing has ever read it.

## system-prompt.js is generated

Do not edit it. It is written by `scripts/gen-system-prompt.mjs` from
`src/data/assistant-knowledge.ts`, which reads the site's own data — company.ts,
the nine product records, the harvested page copy, its English translation and
the verified press list. Every business fact has one home and it is not this
folder. `npm run build` regenerates it.

## Origins

The worker answers only requests carrying an `Origin` it recognises. The live
list is the two larssonkorgmakare.se hostnames and the GitHub Pages host.

`http://localhost:4321` and `http://localhost:8000` are NOT in that list. They
are accepted only when the deployment sets

    TILLAT_LOKALT = "1"

as a plain (non-secret) variable. Set it on a development worker and never on
the live one: any page served from localhost on any machine in the world can
otherwise drive the worker and spend the API key.

## Known limits

- The rate limiter is a read-modify-write over KV, and KV has no atomic
  increment. It holds against sequential traffic; a simultaneous burst from one
  address can exceed the per-IP ceiling. Making it exact needs a Durable Object
  or Cloudflare's own rate-limiting binding. TODO(launch) if the endpoint ever
  sees real abuse.
- The KV namespace EXISTS and is bound (`wrangler.toml`, created 2026-09-05),
  so the counters are shared. Should the binding ever be removed, the worker
  falls back to an in-isolate counter — Cloudflare runs many isolates, so the
  real ceiling would then be looser than the constant says, and an isolate that
  has served DAG_TAK requests would refuse everyone for the rest of the UTC day.
- `compatibility_date` in `wrangler.toml` is pinned to the day this was written.
  Change it deliberately, never as a side effect: it decides runtime semantics.

## Logs

`npx wrangler tail` shows the key length (never the key), rate-limit hits, any
enquiry the tool produced, and upstream failures. Nothing of that reaches the
browser: the client only ever sees a generic error message.

## Tests

`node worker/test/run.mjs` (from the project root) runs the whole worker without
a key, without the network and without deploying: `globalThis.fetch` is stubbed
to impersonate the Anthropic API, `env` is built in the harness and the KV
namespace is an in-memory fake that honours `expirationTtl`. It exits non-zero
if anything regresses. The abort test hijacks `AbortController`/`setTimeout` and
fires the worker's own 30 s timer immediately, so the suite finishes in a few
seconds without ever waiting out a timeout.
