import { sdk } from './sdk'
import { dataSubdir } from './utils'

/**
 * Recipe: "Back Up and Restore Data".
 *
 * The chain is excluded. It is tens of gigabytes, it is byte-for-byte
 * reproducible from the network, and including it would make the backup both
 * enormous and stale. What is NOT reproducible is the wallet and the
 * settings, so those are what get kept.
 *
 * Everything under the datadir is excluded by name except the wallet, rather
 * than the reverse, so a future Dogecoin release that adds a new chain
 * directory does not silently start landing in backups.
 */
export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.ofVolumes('main').setOptions({
    exclude: [
      `${dataSubdir}/blocks/`,
      `${dataSubdir}/chainstate/`,
      `${dataSubdir}/indexes/`,
      `${dataSubdir}/database/`,
      `${dataSubdir}/debug.log`,
      `${dataSubdir}/peers.dat`,
      `${dataSubdir}/banlist.dat`,
      `${dataSubdir}/mempool.dat`,
      `${dataSubdir}/fee_estimates.dat`,
      `${dataSubdir}/.lock`,
      `${dataSubdir}/dogecoind.pid`,
      // Regenerated from store.json on every start, and it holds the RPC
      // password in cleartext — no reason to copy it into a backup.
      `${dataSubdir}/dogecoin.conf`,
    ],
  }),
)
