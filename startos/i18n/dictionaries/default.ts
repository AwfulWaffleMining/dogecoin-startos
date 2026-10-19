export const DEFAULT_LANG = 'en_US'

const dict = {
  // actions/config.ts
  'Share node RPC with other packages': 0,
  'Needed by a solo mining package on this server to build block templates against your own node. The RPC is password-protected, but it also exposes wallet methods, so leave this off unless something needs it.': 1,
  'Accept inbound peers': 2,
  'Let other Dogecoin nodes connect to yours. Outbound peering works either way; this is what lets others sync from you. Turning it off makes your node a consumer of the network rather than a contributor.': 3,
  'Prune to (MiB)': 4,
  'Zero keeps the full chain, which is required to serve blocks to other nodes. A pruned node can still mine — it builds templates from the UTXO set it has — but it cannot help anyone else sync. Minimum useful value is about 2048.': 5,
  'Enabling pruning deletes block data permanently. Going back to a full node afterwards means resyncing the whole chain.': 6,
  'Transaction index': 7,
  'Builds an index of every transaction, which roughly doubles initial sync time. Needed only to look up arbitrary historical transactions by id; mining and wallet use do not require it. Cannot be combined with pruning.': 8,
  'Database cache (MiB)': 9,
  'The single biggest lever on initial sync time, and largely wasted memory afterwards. Raise it while syncing, lower it once synced. Keep it well under the RAM this server actually has free.': 10,
  Settings: 11,
  'RPC sharing, peering, pruning and sync performance': 12,
  'Saving restarts the node if it is running.': 13,

  // interfaces.ts
  Peer: 14,
  'Accepts inbound connections from other Dogecoin nodes. Leave this reachable to help others sync.': 15,
  'JSON-RPC': 16,
  'Dogecoin JSON-RPC, used by a solo mining package to build block templates against this node. Password-protected, but it also exposes wallet methods: share it only with packages on this server that need it.': 17,

  // main.ts
  'Starting Dogecoin Core': 18,
  Node: 19,
  'Dogecoin Core is running': 20,
  'Dogecoin Core is starting': 21,
  'Chain Sync': 22,
  'Waiting for Dogecoin Core to answer RPC': 23,
  'Synced at block ${height}': 24,
  'Fetching the header chain: ${headers} headers so far': 25,
  'Syncing: block ${height} of ${tip} (${pct}%)': 26,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
