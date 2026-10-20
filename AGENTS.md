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

Keep `README.md` (technical reference for an AI support or administering agent), `instructions.md` (end-user docs) and `UPDATING.md` in sync with your changes.

Don't record work in the repo: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you verified, tried and decided belongs in the commit message and the PR body, and anything outstanding belongs in a GitHub issue. (An earlier revision of this package carried a `TODO.md`; `bitcoin-core-startos` forbids the pattern and that is the convention to follow.)

## This repo

- **Keep `dogecoinVersion` and `dogecoinSha256` in `startos/utils.ts` in lockstep.** The Dockerfile verifies the release tarball against the checksum and the build fails if they disagree. Never bump one without re-verifying the other by hand against the checksums published with the release.
- **Install the release binaries; do not build Dogecoin Core from source.** 1.14 needs Berkeley DB 4.8 for wallet compatibility, and a self-built BDB can produce a `wallet.dat` other Dogecoin builds refuse to open.
- **The base image must be glibc.** The release binaries are `x86_64-linux-gnu`; an Alpine base needs a musl shim for no benefit.
- **Never add `curl --retry` to the tarball download.** On retry it restarts into the same partial file and corrupts it. One attempt, then the checksum decides.
- **Never pass `-daemon`.** StartOS supervises the process; the entrypoint runs dogecoind in the foreground and forwards SIGTERM.
- **Do not shorten `sigtermTimeout` in `startos/main.ts`.** Dogecoin Core writes out its UTXO set on shutdown, and cutting that short is how a chainstate gets corrupted and a user loses days of syncing.
- **Never report sync progress from `verificationprogress`.** It is weighted by transaction volume, and Dogecoin's early blocks are nearly empty while recent ones are not — early in a sync it reads far below the node's real position. Use block height against header height.
- **`prune` and `txindex` are mutually exclusive.** Both the config action and the entrypoint reject the combination; keep both checks. dogecoind's own error only arrives after it has begun loading the block index.
- **No password is stored anywhere, and it must stay that way.** Local callers (the sync health check, `dogecoin-cli` in the container) authenticate with the `.cookie` file dogecoind writes itself. External consumers each get an `rpcauth=<user>:<salt>$<hmac>` entry from the Generate RPC User action; the password is shown once and is unrecoverable. A leaked `dogecoin.conf` or `store.json` leaks no credential. This follows `bitcoin-core-startos`, which was adopted after an earlier revision here wrote a shared plaintext `rpcpassword` into the conf.
- **`rpcauth` is computed in TypeScript with `node:crypto`, not by shelling out to `rpcauth.py`.** `bitcoin-core-startos` vendors that script and a Python image; the construction is one HMAC-SHA256 keyed by the salt **as a utf-8 string** (not decoded from hex), so the image is unnecessary. Verified against dogecoind directly: an entry built this way authenticates and a wrong password is refused. Start9 packages can import Node builtins — bitcoin-core's own `main.ts` imports `node:https`.
- **This package is a NODE, not a mining service. Keep mining out of it.** Every Start9 and Umbrel base node package omits mining concerns, and for good reason: contributing to the network by running a node is a different activity from mining against it, and most people installing this want the former. An earlier revision reserved `stratumPort = 3310` here and described the RPC as something "a solo mining package" uses — a port this service never binds, and a dependency stated in the wrong direction. Ports, ids and copy belong to the package that actually mines. The RPC exists for *any* dependent that needs a trusted Dogecoin node.
- **The ids and ports exported from `startos/utils.ts`, and the health check ids, are a PUBLISHED API.** A dependent package imports them — the same split `go-quai-startos` has with `quai-dashboard-startos`. Renaming any of them breaks the sibling.
- **`getDefaultString` charsets are COMMA-SEPARATED ranges**, e.g. `'a-z,A-Z,0-9'`. `'a-zA-Z0-9'` throws `unexpected "A"` at runtime. `charset` is typed as a plain `string`, so this typechecks, bundles, passes the SDK lint, packs into a valid `.s9pk`, and then fails the INSTALL with a bare `Service Runtime Error: Error: unexpected "A"` that names neither the field nor the file. If any code here generates a random string, call the generator once in a scratch script before trusting it.
- **`assets/README.md` must exist.** `start-cli s9pk list-ingredients` lists `assets` as an ingredient and git does not track empty directories, so deleting the only file in there fails the build with `No rule to make target 'assets'` — a message that points at make rather than at the missing directory. This package ships no runtime assets; the README is there to keep the directory tracked.
- **`icon.svg` is a flat mark of a few hundred bytes, and it must carry its own contrast.** The SDK finds the icon by filename — any root-level `icon.*` with an image MIME type — so there is no manifest entry to update, and exactly one `icon.*` must exist or the choice between them is arbitrary. Two things decide the artwork. First, it renders small: a detailed Shiba-on-a-coin illustration traced to 122 paths in 11 shades of gold is 48 KiB, over the 40 KiB limit, and at 48 px the shading resolves to a featureless gold blob — the bytes buy nothing at the size anyone sees. `svgo` cannot fix that, because 81% of those bytes are path data, not slack. Second, StartOS's UI is dark, so a bare dark glyph (the Simple Icons default fill is black) all but disappears; `bitcoin-core-startos` overrides its path to `fill="#fff"` and `go-quai-startos` sits its mark on an opaque rounded rect, and both are legible either way for that reason. What ships here is the official Dogecoin Ð from Simple Icons (CC0) over a white disc, so the knocked-out Ð reads white and the gold coin supplies its own contrast on any background. The white disc is `r="11.4"` against the glyph's `r="12"` deliberately: coincident edges let a renderer bleed a white fringe around the rim, and the Ð is nowhere near that radius, so the shrink is free — verified pixel-identical in the interior.
- **Keep mining imagery out of the icon too.** An earlier revision shipped a coin-and-pickaxe placeholder, which contradicts the node-not-mining-service rule above in the one asset every user sees first.
- **Test `docker_entrypoint.sh` under POSIX `sh`** and keep it ShellCheck-clean (`shellcheck -s sh`). Every check that can fail a start must run before the first write, so a rejected configuration leaves no half-written `dogecoin.conf`.
- **`startos/i18n/dictionaries/default.ts` is generated from the `i18n()` calls in the code.** Regenerate it rather than editing it; a hand-maintained dictionary drifts from the call sites.
- **i18n ids are STABLE and must never be renumbered.** `translations.ts` maps id to foreign string, so reassigning an id silently mistranslates that message — nothing typechecks it and nothing fails at build. A generator that orders keys by file path reshuffles every id when a source file is added; the one in use preserves existing ids and only appends. After any i18n change, verify every language is complete AND that each translation's `${placeholders}` match the English key's, since a renamed placeholder leaves translations referencing a variable the code no longer passes.

## Building: four things that fail a fresh repo

All four were hit on the way to the first green build of this package. Any new
StartOS package starts with these.

1. **`package-lock.json` must be committed.** The reusable workflow runs
   `npm ci`, which hard-fails without a lockfile rather than falling back to
   `npm install`. Symptom: `DiscoverMatrix` fails in ~15 seconds.
2. **`assets/` must contain at least one file.** `start-cli s9pk
   list-ingredients` lists `assets` as an ingredient and git does not track
   empty directories. Symptom: `make[1]: *** No rule to make target 'assets',
   needed by 'ingredients'` — a message that points at make rather than at the
   empty directory.
3. **The `DEV_KEY` secret must be byte-exact.** Pasting the PEM through a
   Windows clipboard produced UTF-16, and `start-cli s9pk pack` failed with
   `PEM preamble contains invalid data (NUL byte)`. Set it from the file with
   input redirection (`gh secret set DEV_KEY --repo <repo> < key.pem`), never
   through an editor or a PowerShell pipe, which can also rewrite LF as CRLF.
4. **Workflows must name the branch the repo actually uses.** `gh repo create`
   pushed to `master` while the workflows targeted `main`. `workflow_dispatch`
   still ran, so this one fails silently rather than loudly.

Note what CI validates that no local check does: `npm run check`, the SDK lint
and `npm run build` all pass locally, but `make ingredients` (the Docker build)
and `start-cli s9pk pack` have no local equivalent without `start-cli`
installed. A clean local run says nothing about either.
