// Pinned upstream release. The Dockerfile verifies the tarball against
// dogecoinSha256 below; both move together or not at all.
export const dogecoinVersion = '1.14.9'

// SHA256 of dogecoin-1.14.9-x86_64-linux-gnu.tar.gz, verified by hand against
// the checksum published with the release. Never update one of these without
// re-verifying the other.
export const dogecoinSha256 =
  '4f227117b411a7c98622c970986e27bcfc3f547a72bef65e7d9e82989175d4f8'

export const dogecoinReleaseUrl = (version: string, arch: string) =>
  `https://github.com/dogecoin/dogecoin/releases/download/v${version}/dogecoin-${version}-${arch}-linux-gnu.tar.gz`

/* ── ports ─────────────────────────────────────────────────────────────────
 *
 * Dogecoin Core's own mainnet defaults, so miner and wallet documentation
 * written for dogecoind applies unchanged.
 */
export const p2pPort = 22556
export const rpcPort = 22555

/* The Scrypt stratum port, reserved here so the id is stable before the
 * stratum ships (see TODO.md).
 *
 * NOT 3333. Three ranges are already taken on a StartOS box that runs the
 * neighbouring mining packages: 3301-3306 by go-quai (SHA-256, Scrypt,
 * KawPoW, stats API), and 3333-3336 by Public Pool. The reference stratum
 * server this package will wrap defaults to 3333 for local testing, which
 * would collide with Public Pool on exactly the machines most likely to
 * install this. 3310 is clear of both.
 */
export const stratumPort = 3310

export const mountpoint = '/data'

// Where dogecoind keeps its datadir inside the volume. Kept in its own
// subdirectory so store.json and future siblings can live alongside it
// without dogecoind treating them as chain files.
export const dataSubdir = 'dogecoin'

/* ── ids ───────────────────────────────────────────────────────────────────
 *
 * These are an API. A sibling package (the solo mining portal) imports them
 * to find this node's RPC and to depend on its health checks. Renaming one
 * breaks that package — the same contract go-quai-startos has with
 * quai-dashboard-startos.
 */
export const mainHostId = 'main'
export const rpcHostId = 'rpc'

export const rpcInterfaceId = 'rpc'
export const p2pInterfaceId = 'p2p'
export const stratumInterfaceId = 'stratum-scrypt'

// Health check ids, also part of the cross-package contract.
export const healthCheckIds = {
  node: 'dogecoind',
  sync: 'sync',
} as const

export const imageId = 'dogecoin'
