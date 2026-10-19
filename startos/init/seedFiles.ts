import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

/**
 * Seeds the store on install, update and restore, so main.ts always reads a
 * complete config rather than defaulting field by field at the call site.
 *
 * The RPC credential is generated here rather than in the entrypoint so that
 * it is STABLE. A sibling package holding it in order to reach this node's
 * RPC must not find it changed underneath on every container start — which is
 * also why this package does not use dogecoind's cookie auth, since the
 * cookie is rewritten on every start by design.
 *
 * Recipe: "Auto-Generate Internal Secrets".
 */
export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (!kind) return

  // Fills in any field the schema has a default for without disturbing ones
  // the operator has set.
  await storeJson.merge(effects, {})

  const existing = await storeJson.read().once()

  /* Generated once, never rotated silently: overwriting it would break a
   * dependent package that already holds it. Rotation belongs in an explicit
   * action the operator invokes, not in a code path that runs on every
   * update. */
  if (!existing?.rpcPassword) {
    await storeJson.merge(effects, {
      rpcUsername: existing?.rpcUsername || 'dogecoin',
      /* 44 alphanumerics. No punctuation on purpose: this value is written
       * into dogecoin.conf as `rpcpassword=...`, which Dogecoin parses to
       * end-of-line, and it also passes through a shell in the entrypoint.
       * Narrowing the charset removes both classes of quoting bug instead of
       * trusting the escaping to be right in both places.
       *
       * The charset is COMMA-SEPARATED ranges. 'a-zA-Z0-9' is not a valid
       * spec and throws `unexpected "A"` — the parser finishes the a-z range,
       * meets 'A' with nowhere to put it, and gives up. It typechecks either
       * way, because charset is just a string, so the only way this surfaces
       * is at install time as a Service Runtime Error. */
      rpcPassword: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 44 }),
    })
    console.info('Generated the Dogecoin RPC credential')
  }
})
