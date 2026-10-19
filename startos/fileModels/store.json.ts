import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const shape = z
  .object({
    /* RPC credentials, generated once on install.
     *
     * Cookie auth would avoid storing a password, but the cookie is rewritten
     * on every dogecoind start, so a sibling package holding one would break
     * on every restart of this one. A stored credential is stable, which is
     * what a dependent package needs. */
    rpcUsername: z.string().catch('dogecoin'),
    rpcPassword: z.string().catch(''),

    /* Expose the RPC beyond this container.
     *
     * Off by default. Dogecoin's RPC is password-protected, unlike go-quai's,
     * but it still carries wallet methods, so it is not bound outward unless
     * the operator asks — the same posture that package takes with shareRpc. */
    shareRpc: z.boolean().catch(false),

    /* Prune the chain.
     *
     * 0 keeps the full chain, which is what lets this node serve blocks to
     * peers rather than only consume them. A pruned node can still mine: ask
     * it for a block template and it builds one from the UTXO set it has. It
     * just cannot help anyone else sync. */
    pruneMiB: z.number().int().min(0).catch(0),

    /* Address and transaction index. Off by default: txindex roughly doubles
     * the time to sync and is only needed to look up arbitrary historical
     * transactions, which a mining node never does. */
    txindex: z.boolean().catch(false),

    /* Database cache in MiB. Raising this is the single biggest lever on
     * initial sync time; it is wasted memory afterwards, so it belongs in
     * config rather than hardcoded. */
    dbCacheMiB: z.number().int().min(64).max(16384).catch(450),

    /* Accept inbound peer connections. Leaving this on is how the node gives
     * back to the network rather than only taking from it. */
    listen: z.boolean().catch(true),
  })
  .strip()

export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  shape,
)
