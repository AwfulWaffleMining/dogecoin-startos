# Updating

## What "upstream" means here

Dogecoin Core, from <https://github.com/dogecoin/dogecoin>. This package does
**not** build it — it installs the official `x86_64-linux-gnu` release binaries
and verifies them. See `AGENTS.md` for why building from source is the wrong
choice for 1.14 (Berkeley DB 4.8 wallet compatibility).

## Where the pin lives

Two constants in `startos/utils.ts`, and they move together:

```ts
export const dogecoinVersion = '1.14.9'
export const dogecoinSha256 = '4f22...d4f8'
```

`startos/manifest/index.ts` passes both to the Dockerfile as build args. The
Dockerfile verifies the tarball against the checksum and **fails the build** if
they disagree, so a half-updated pin cannot produce a package.

## Bumping Dogecoin Core

1. Find the new release and **its published checksum** on the upstream
   releases page. Dogecoin publishes a `SHA256SUMS.asc` alongside the
   binaries; take the line for
   `dogecoin-<version>-x86_64-linux-gnu.tar.gz`.
2. **Verify it yourself.** Download the tarball, run `sha256sum`, and compare
   against the published value by eye. Do not copy a checksum from a
   third-party mirror or from a changelog, and do not let a tool compute the
   value from the file you just downloaded — that proves only that the file
   hashes to its own hash.
3. Update `dogecoinVersion` and `dogecoinSha256` in `startos/utils.ts`.
4. Read upstream's release notes for anything that changes behaviour this
   package depends on:
   - the shape of `getblockchaininfo` (the sync health check parses `blocks`,
     `headers` and `initialblockdownload`),
   - `dogecoin.conf` keys written by `docker_entrypoint.sh`
     (`rpcauth`, `rpcbind`, `rpcallowip`, `prune`, `txindex`, `dbcache`,
     `listen`, `port`, `rpcport`),
   - the `rpcauth` format, and whether cookie auth still works for local
     callers,
   - default ports.
5. Bump the version in `startos/versions/current.ts` and write release notes
   in every locale. The `:N` suffix is the **package** revision; reset it to
   `:0` when the upstream version changes.
6. If the data directory layout changed, add a migration. A pure version bump
   with no data change keeps `migrations.up` as a no-op.
7. Build and install on a real StartOS box. A green `tsc` proves the code
   builds, not that the service works — see `AGENTS.md` for the list of
   failures that pass every local gate.

## Bumping the package without bumping Dogecoin

Increment only the `:N` suffix in `startos/versions/current.ts`. StartOS
compares versions to decide whether a sideload is an update, so reinstalling
the same string is not an upgrade path and the install will be refused.

The `main` volume persists across package revisions — verified: updating
`1.14.9:0` to `:1` on a node 36,000 blocks into its initial sync continued
from where it was rather than restarting. Package fixes are therefore cheap.

## aarch64

Not yet supported. Upstream publishes an `aarch64-linux-gnu` tarball and
Dogecoin Core runs well on ARM, but it needs its own checksum verified by hand
before being pinned, and `ARCHES` in the `Makefile` widened. Do not guess the
hash.
