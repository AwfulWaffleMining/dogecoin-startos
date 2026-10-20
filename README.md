# dogecoin-startos

A StartOS service package for [Dogecoin Core](https://github.com/dogecoin/dogecoin).

This file is the technical reference for an agent or administrator working on
the package. End-user documentation lives in `instructions.md`; conventions and
hard-won constraints live in `AGENTS.md`; outstanding work is tracked in this
repository's GitHub issues.

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
| `startos/actions/rpcUser.ts` | create and revoke per-consumer RPC users |
| `startos/init/seedFiles.ts` | fills in store defaults; generates no credential |
| `startos/fileModels/store.json.ts` | config schema and defaults |
| `startos/backups.ts` | what is and is not worth backing up |
| `docker_entrypoint.sh` | writes `dogecoin.conf`, supervises dogecoind |
| `Dockerfile` | fetch, verify, install the release binaries |

## Ports

| port | purpose | exposure |
| --- | --- | --- |
| 22556 | P2P | always bound; same external port as internal |
| 22555 | JSON-RPC | bound only when **Share node RPC** is on |

Dogecoin's own mainnet defaults are used for P2P and RPC so that documentation
written for `dogecoind` applies unchanged.

This package binds **no other ports**. It is a node, not a mining service:
anything that mines against it is a separate package, and reserving a port
here for a service this one never runs would be stating a dependency that
does not exist.

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
not a place to hand-edit, and it is excluded from backups because it is derived
state, rebuilt from `store.json` on the next start.

Config reaches the entrypoint as environment rather than argv, so nothing
lands in the host process list and `dogecoin-cli` finds the node from
`-datadir` without being handed anything per call.

`prune` and `txindex` cannot both be enabled. The config action rejects the
combination at the form, and the entrypoint rejects it again before writing
anything — dogecoind's own error for it only arrives after the block index has
started loading.

## RPC credentials

**No password is stored anywhere**, in `store.json`, in `dogecoin.conf`, or in
a backup. The package follows `bitcoin-core-startos` here, splitting local from
external callers:

- **Local callers** — the `sync` health check and `dogecoin-cli` inside the
  container — authenticate with the `.cookie` file dogecoind writes itself.
  Cookie auth is correct for them precisely because `.cookie` is rewritten on
  every start: a caller that reads it per call always has the current one.
- **External consumers** each get their own entry from the **Generate RPC
  User** action, stored as Dogecoin's `rpcauth=<user>:<salt>$<hmac>`. The
  password is displayed once, at creation, and is unrecoverable afterwards.
  A leaked `dogecoin.conf` or `store.json` therefore leaks no credential.

The HMAC is computed in TypeScript with `node:crypto` rather than by shelling
out to upstream's `rpcauth.py`, which would mean carrying a Python image for
one hash. The construction is HMAC-SHA256 keyed by the salt **as a utf-8
string**, not decoded from hex — that detail is what makes it interoperable
with Dogecoin's own parser, and it was verified against a live dogecoind: an
entry built this way authenticates and a wrong password is refused.

Rotation is delete-and-recreate: revoke with **Delete RPC User**, then issue a
new one. Both actions take effect on the next restart, since the conf is
written at start.

Upgrading from `1.14.9:1`, which did store a plaintext `rpcpassword`, removes
it: the store is reparsed through a schema that no longer declares the field
and written back without it. Anything still using that credential must be
issued a new one.

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

Installed on StartOS hardware by sideload and syncing mainnet. The update path
has been exercised in place: a package revision bump kept the `main` volume and
resumed from the height already on disk rather than resyncing.

Verified against a live dogecoind rather than assumed: the release checksum and
tarball layout, the AuxPoW RPC surface, and `rpcauth` generation (a generated
entry authenticates, a wrong password is refused, no plaintext appears in the
conf, and `.cookie` is mode 0600).

Still unconfirmed, tracked in GitHub issues: that `initialblockdownload` going
false flips the `sync` check to green — that branch has not fired yet on this
box; a backup and restore round trip; and the aarch64 release checksum, which
is why `arch` is `x86_64` only.
