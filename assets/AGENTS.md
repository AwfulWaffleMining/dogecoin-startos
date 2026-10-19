# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (technical reference for an AI support or administering agent) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Keep `dogecoinVersion` and `dogecoinSha256` in `startos/utils.ts` in lockstep.** The Dockerfile verifies the release tarball against the checksum and the build fails if they disagree. Never bump one without re-verifying the other by hand against the checksums published with the release.
- **Install the release binaries; do not build Dogecoin Core from source.** 1.14 needs Berkeley DB 4.8 for wallet compatibility, and a self-built BDB can produce a `wallet.dat` other Dogecoin builds refuse to open.
- **The base image must be glibc.** The release binaries are `x86_64-linux-gnu`; an Alpine base needs a musl shim for no benefit.
- **Never add `curl --retry` to the tarball download.** On retry it restarts into the same partial file and corrupts it. One attempt, then the checksum decides.
- **Never pass `-daemon`.** StartOS supervises the process; the entrypoint runs dogecoind in the foreground and forwards SIGTERM.
- **Do not shorten `sigtermTimeout` in `startos/main.ts`.** Dogecoin Core writes out its UTXO set on shutdown, and cutting that short is how a chainstate gets corrupted and a user loses days of syncing.
- **Never report sync progress from `verificationprogress`.** It is weighted by transaction volume, and Dogecoin's early blocks are nearly empty while recent ones are not — early in a sync it reads far below the node's real position. Use block height against header height.
- **`prune` and `txindex` are mutually exclusive.** Both the config action and the entrypoint reject the combination; keep both checks. dogecoind's own error only arrives after it has begun loading the block index.
- **The RPC password is generated once in `startos/init/seedFiles.ts` and never rotated silently.** A dependent package holds it. This is also why cookie auth is not used: the cookie is rewritten on every start.
- **The RPC password charset is alphanumeric on purpose.** It is written into `dogecoin.conf` as `rpcpassword=...` (parsed to end-of-line) and passes through a shell in the entrypoint. Widening the charset reintroduces two classes of quoting bug.
- **The ids and ports exported from `startos/utils.ts`, and the health check ids, are a PUBLISHED API.** The solo mining stratum ships as a separate package that imports them, decided deliberately so a user can run just a node — the same split `go-quai-startos` has with `quai-dashboard-startos`, and the same shape as the BCH and BTC solo packages. Renaming any of them breaks the sibling.
- **The stratum port is 3310, not 3333.** On a StartOS box running the neighbouring mining packages, 3301–3306 is go-quai and 3333–3336 is Public Pool. The reference stratum server defaults to 3333 for local testing, which collides with Public Pool on exactly the machines most likely to install this.
- **`assets/README.md` must exist.** `start-cli s9pk list-ingredients` lists `assets` as an ingredient and git does not track empty directories, so deleting the only file in there fails the build with `No rule to make target 'assets'` — a message that points at make rather than at the missing directory. This package ships no runtime assets; the README is there to keep the directory tracked.
- **Test `docker_entrypoint.sh` under POSIX `sh`** and keep it ShellCheck-clean (`shellcheck -s sh`). Every check that can fail a start must run before the first write, so a rejected configuration leaves no half-written `dogecoin.conf`.
- **`startos/i18n/dictionaries/default.ts` is generated from the `i18n()` calls in the code.** Regenerate it rather than editing it; a hand-maintained dictionary drifts from the call sites.
