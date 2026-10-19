# dogecoin-startos

A StartOS service package for [Dogecoin Core](https://github.com/dogecoin/dogecoin).

This file is the technical reference for an agent or administrator working on
the package. End-user documentation lives in `instructions.md`; conventions and
hard-won constraints live in `AGENTS.md`; outstanding work is in `TODO.md`.

## What it runs

Dogecoin Core **1.14.9**, installed from the official `x86_64-linux-gnu`
release tarball and verified against a SHA256 pinned in `startos/utils.ts`.
The package does not build Core from source — 1.14 requires Berkeley DB 4.8
for wallet compatibility and a self-built BDB can produce a `wallet.dat` that
other Dogecoin builds refuse to open.

Default posture is a **full, unpruned, listening node**: it validates the
whole chain itself and serves blocks to peers. Both of those are configurable
and both default to the contributing choice rather than the cheap one.

## Layout

| path | role |
| --- | --- |
| `startos/utils.ts` | version, checksum, ports, ids. **Cross-package API** |
| `startos/manifest/` | package metadata and descriptions |
| `startos/main.ts` | daemon definition and the two health checks |
| `startos/interfaces.ts` | P2P (always) and RPC (opt-in) interfaces |
| `startos/actions/config.ts` | the operator-facing settings form |
| `startos/init/seedFiles.ts` | generates the RPC credential on install |
| `startos/fileModels/store.json.ts` | config schema and defaults |
| `startos/backups.ts` | what is and is not worth backing up |
| `docker_entrypoint.sh` | writes `dogecoin.conf`, supervises dogecoind |
| `Dockerfile` | fetch, verify, install the release binaries |

## Ports

| port | purpose | exposure |
| --- | --- | --- |
| 22556 | P2P | always bound; same external port as internal |
| 22555 | JSON-RPC | bound only when **Share node RPC** is on |
| 3310 | Scrypt stratum | **reserved, not yet used** — see `TODO.md` |

Dogecoin's own mainnet defaults are used for P2P and RPC so that documentation
written for `dogecoind` applies unchanged.

3310 for stratum is deliberate and **not 3333**. On a StartOS box running the
neighbouring mining packages, 3301–3306 belongs to `go-quai` and 3333–3336 to
Public Pool. The reference stratum server defaults to 3333 for local testing,
which would collide with Public Pool on exactly the machines most likely to
install this.

## Health checks

**`dogecoind`** — port-listening on the RPC port, with a 120-second grace
period because loading the block index on a large chain takes minutes before
RPC answers at all.

**`sync`** — parses `getblockchaininfo` and reports:

- `initialblockdownload === false` → success, with the height
- no header chain yet → loading, "fetching the header chain"
- otherwise → loading, with **block height over header height** as a percentage

That last point is load-bearing. Progress is *not* taken from
`verificationprogress`, which is weighted by transaction volume: Dogecoin's
early blocks are nearly empty and its recent ones are not, so early in a sync
that field reads far below the node's real position. A node several percent
through by height can report a small fraction of a percent by that measure.
Block count is cruder and does not mislead.

## Configuration

Config lives in `store.json` and is rendered into `dogecoin.conf` by the
entrypoint on every start. The conf file is **regenerated each time** — it is
not a place to hand-edit, and it is excluded from backups because it holds the
RPC password in cleartext.

Config reaches the entrypoint as environment rather than argv so the RPC
password stays out of the host process list, and so `dogecoin-cli` finds the
same credentials from `-datadir` without being handed them per call.

`prune` and `txindex` cannot both be enabled. The config action rejects the
combination at the form, and the entrypoint rejects it again before writing
anything — dogecoind's own error for it only arrives after the block index has
started loading.

## The RPC credential

Generated once in `startos/init/seedFiles.ts` and never rotated silently,
because a dependent package holds it. This is also why **cookie auth is not
used**: `.cookie` is rewritten on every dogecoind start by design, so a
sibling holding one would break on every restart of this service.

The charset is alphanumeric on purpose. The value is written into
`dogecoin.conf` as `rpcpassword=...`, which Dogecoin parses to end-of-line,
and it also passes through a shell in the entrypoint. Narrowing the charset
removes both classes of quoting bug rather than trusting the escaping to be
correct in both places.

There is currently no supported way to rotate it. That is a known gap, listed
in `TODO.md`.

## Backups

The chain is excluded: tens of gigabytes, byte-for-byte reproducible from the
network, and stale the moment it is written. What is kept is the wallet and the
settings, which are not reproducible.

Chain directories are excluded **by name** rather than keeping an allowlist, so
that a future Dogecoin release adding a new chain directory does not silently
start landing in backups. If that happens, add it to the exclude list in
`startos/backups.ts`.

## Building

```bash
npm install
npm run check    # tsc --noEmit
npm run build    # ncc bundle -> javascript/
make             # produce the .s9pk
```

`shellcheck -s sh docker_entrypoint.sh` must be clean.

## Status

Typechecks and bundles. **Not yet installed on StartOS hardware** — see
`TODO.md`, which is ordered so the untested parts come first.
