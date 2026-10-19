import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  dataSubdir,
  healthCheckIds,
  imageId,
  mountpoint,
  p2pPort,
  rpcPort,
} from './utils'

/* Shape of Dogecoin Core 1.14's getblockchaininfo. Only the fields this
 * package relies on; the call returns more. */
type ChainInfo = {
  chain: string
  blocks: number
  headers: number
  verificationprogress?: number
  initialblockdownload?: boolean
  size_on_disk?: number
  pruned?: boolean
}

const datadir = `${mountpoint}/${dataSubdir}`

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Dogecoin Core'))

  const store = await storeJson.read().const(effects)

  const sub = await sdk.SubContainer.of(
    effects,
    { imageId },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint,
      readonly: false,
    }),
    imageId,
  )

  /* Config goes to the entrypoint as environment, which writes dogecoin.conf
   * inside the datadir. Not as argv: the RPC password would then be visible
   * in the process list, and dogecoin-cli needs to find the same credentials
   * without being handed them on every call. */
  const env: Record<string, string> = {
    DOGECOIN_DATADIR: datadir,
    RPC_USERNAME: store?.rpcUsername ?? 'dogecoin',
    RPC_PASSWORD: store?.rpcPassword ?? '',
    RPC_PORT: String(rpcPort),
    P2P_PORT: String(p2pPort),
    SHARE_RPC: store?.shareRpc ? '1' : '0',
    PRUNE_MIB: String(store?.pruneMiB ?? 0),
    TXINDEX: store?.txindex ? '1' : '0',
    DBCACHE_MIB: String(store?.dbCacheMiB ?? 450),
    LISTEN: store?.listen === false ? '0' : '1',
  }

  const readChainInfo = async (): Promise<ChainInfo | null> => {
    try {
      const res = await sub.exec(
        ['dogecoin-cli', `-datadir=${datadir}`, 'getblockchaininfo'],
        {},
        20_000,
      )
      const out = String(res.stdout ?? '')
      // Non-zero while the block index loads; that is not an error worth
      // surfacing, the caller reports "starting" instead.
      if (res.exitCode !== 0 || !out.trim()) return null
      return JSON.parse(out) as ChainInfo
    } catch {
      return null
    }
  }

  return sdk.Daemons.of(effects)
    .addDaemon(healthCheckIds.node, {
      subcontainer: sub,
      exec: {
        command: ['/usr/local/bin/docker_entrypoint.sh'],
        env,
        /* Dogecoin Core writes out its UTXO set on shutdown. Cutting that
         * short is how a chainstate gets corrupted and a user loses days of
         * syncing, so allow well past the worst case rather than the default. */
        sigtermTimeout: 600_000,
      },
      ready: {
        display: i18n('Node'),
        // Loading the block index on a large chain takes minutes before RPC
        // answers at all.
        gracePeriod: 120_000,
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, rpcPort, {
            successMessage: i18n('Dogecoin Core is running'),
            errorMessage: i18n('Dogecoin Core is starting'),
          }),
      },
      requires: [],
    })
    .addHealthCheck(healthCheckIds.sync, {
      ready: {
        display: i18n('Chain Sync'),
        // Every probe is a local RPC call, but the answer only changes on the
        // order of seconds, so there is nothing to gain from polling harder.
        trigger: sdk.trigger.statusTrigger(30_000, {
          starting: 10_000,
          failure: 15_000,
        }),
        fn: async () => {
          const info = await readChainInfo()

          if (!info) {
            return {
              result: 'starting' as const,
              message: i18n('Waiting for Dogecoin Core to answer RPC'),
            }
          }

          const { blocks, headers } = info

          if (info.initialblockdownload === false) {
            return {
              result: 'success' as const,
              message: i18n('Synced at block ${height}', {
                height: String(blocks),
              }),
            }
          }

          // Headers arrive long before blocks, so until the header chain is in
          // there is no denominator to report progress against.
          if (!headers || headers <= blocks) {
            return {
              result: 'loading' as const,
              message: i18n('At block ${height}; fetching the header chain', {
                height: String(blocks),
              }),
            }
          }

          /* Percentage from BLOCK COUNT, deliberately not from
           * verificationprogress.
           *
           * verificationprogress is weighted by transaction volume, and
           * Dogecoin's early blocks are nearly empty while its recent ones are
           * not. Early in a sync it reads far lower than the real position: a
           * node 0.5% through by that measure can be several percent through
           * by height. Block count is cruder but it does not mislead. */
          const pct = ((blocks / headers) * 100).toFixed(2)
          return {
            result: 'loading' as const,
            message: i18n('Syncing: block ${height} of ${tip} (${pct}%)', {
              height: String(blocks),
              tip: String(headers),
              pct,
            }),
          }
        },
      },
      requires: [healthCheckIds.node],
    })
})
