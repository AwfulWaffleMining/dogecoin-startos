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
   * inside the datadir. Not as argv, where it would be visible in the host
   * process list.
   *
   * RPC_AUTH is newline-separated because dogecoin.conf takes one `rpcauth=`
   * line per consumer and there may be several. Each is already a hash, so
   * nothing secret travels here. */
  const env: Record<string, string> = {
    DOGECOIN_DATADIR: datadir,
    RPC_AUTH: (store?.rpcAuth ?? []).join('\n'),
    RPC_PORT: String(rpcPort),
    P2P_PORT: String(p2pPort),
    SHARE_RPC: store?.shareRpc ? '1' : '0',
    PRUNE_MIB: String(store?.pruneMiB ?? 0),
    TXINDEX: store?.txindex ? '1' : '0',
    DBCACHE_MIB: String(store?.dbCacheMiB ?? 450),
    LISTEN: store?.listen === false ? '0' : '1',
  }

  /* Highest `headers` seen so far. Dogecoin fetches the header chain in
   * batches, so during the first few minutes `headers` is "how many headers
   * have arrived", not the network tip — and block/headers hovers near a
   * constant small percentage while BOTH numbers climb. Comparing successive
   * probes is how we tell "still collecting headers" from "headers done, now
   * downloading blocks", which are the two phases a user actually wants
   * distinguished. */
  let maxHeaders = 0
  let headersStable = 0

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

          if (headers > maxHeaders) {
            maxHeaders = headers
            headersStable = 0
          } else {
            headersStable += 1
          }

          /* Phase 1: the header chain is still arriving, so there is no
             trustworthy denominator. Report the headers themselves — that
             number climbing is the honest signal of progress — and do NOT
             compute a percentage against a moving target. */
          if (headersStable < 2 || !headers || headers <= blocks) {
            return {
              result: 'loading' as const,
              message: i18n(
                'Fetching the header chain: ${headers} headers so far',
                { headers: String(headers || 0) },
              ),
            }
          }

          /* Phase 2: headers have settled, so they are the network tip and
           * block/headers is a real percentage.
           *
           * Deliberately NOT verificationprogress, which is weighted by
           * transaction volume: Dogecoin's early blocks are nearly empty and
           * its recent ones are not, so early in a sync that field reads far
           * below the node's real position. Block count is cruder and does
           * not mislead. */
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
