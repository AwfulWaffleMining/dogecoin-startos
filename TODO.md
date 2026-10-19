# TODO

Worked from top to bottom. Items are ordered so that each one is testable
before the next depends on it.

## Before a first build on hardware

- [x] **Build the `.s9pk` in CI.** Green as of the first successful run;
      see AGENTS.md "Building: four things that fail a fresh repo" for what it
      took. The Docker build, the manifest validation and the signing all pass.
- [ ] **Install it on a StartOS box.** This is the first time any of
      `interfaces.ts`, the health checks, the entrypoint's config generation or
      the RPC credential seeding runs for real. Nothing below has
      been exercised on real StartOS yet; the package typechecks and bundles,
      which is not the same thing. Expect the first install to surface
      something in `startos/interfaces.ts`, since bind semantics are the part
      hardest to get right from the docs alone.
- [ ] **Confirm the sync health check against a real initial block download.**
      The progress figure comes from block height over header height. Watch
      that the "fetching the header chain" branch clears promptly rather than
      sticking, which is what would happen if Dogecoin 1.14 reports `headers`
      differently than assumed.
- [ ] **Verify `initialblockdownload` exists in this Dogecoin version's
      `getblockchaininfo`.** It is present in 1.14.9 output observed in
      testing, but the sync check treats a missing field as "still syncing",
      so a rename upstream would leave the check permanently yellow.
- [ ] **Time a stop under load.** `sigtermTimeout` is 600s on the assumption
      that a large chainstate flush can be slow. Measure it on a synced node
      and record the real figure here.

## Correctness and safety

- [ ] **Add a smoke test for anything with a runtime-parsed string.** The
      charset bug (`'a-zA-Z0-9'` instead of `'a-z,A-Z,0-9'`) passed tsc, the
      SDK lint, the bundle and `s9pk pack`, and only failed at install with an
      error naming neither the field nor the file. A three-line script that
      calls `getDefaultString` would have caught it in a second.

- [ ] **Exercise the non-writable-datadir guard as a non-root uid.** It cannot
      fire during local testing because root ignores the mode bits, so that
      branch is currently unverified.
- [ ] **Decide whether the wallet should be enabled at all.** It is on by
      default, which means `wallet.dat` exists and is the one thing in the
      backup that cannot be re-derived. A mining-only node does not need it if
      payouts go to an address held elsewhere — but disabling it removes
      `getnewaddress`, which the solo mining flow currently relies on.
- [ ] **Add an explicit "rotate RPC password" action.** The credential is
      generated once and deliberately never rotated silently. There is
      currently no supported way to change it, which there should be.

## Once accepted upstream

- [ ] **Add `tagAndRelease.yml` and `syncNext.yml`**, copying the versions in
      `go-quai-startos`. Both assume a package already published to a registry
      with a maintained `next` branch, so they are deliberately absent until
      this one is accepted rather than shipped non-functional.

## Follow-on work

- [ ] **aarch64 support.** Dogecoin Core runs well on ARM SBCs and the
      release publishes an `aarch64-linux-gnu` tarball, but it needs its
      checksum verified by hand before it can be pinned, and `Makefile`'s
      `ARCHES` widened. Do not guess the hash.
- [x] **Decided: the stratum ships as a separate package.** Same shape as
      `go-quai-startos` / `quai-dashboard-startos`, and as the BCH and BTC
      solo packages. Someone can then run just a node. The consequences for
      this package:
      - `shareRpc` is the supported way for the sibling to reach this node,
        and is already implemented.
      - `stratumPort` (3310) and `stratumInterfaceId` stay reserved in
        `startos/utils.ts` so the sibling has a stable id to bind, even
        though nothing in this package binds them.
      - The ids and health check ids in `startos/utils.ts` are now load
        bearing for a second package. Treat them as published.
      - The sibling needs the RPC credential across a package boundary.
        Recipes: "Depend on Another Service", "Reach Another Service",
        and possibly "Mount Volumes from Another Service" if reading
        `store.json` directly turns out cleaner than passing it.
- [ ] **ZMQ block notification instead of polling for work.** The stratum
      server polls `getblocktemplate`; on a 60-second block target a 5-second
      poll wastes roughly 8% of hashrate on stale work. `-zmqpubhashblock`
      would remove it. The stratum server already counts stale solutions, so
      the benefit is measurable rather than assumed.
- [ ] **Have the translations reviewed.** `startos/i18n/dictionaries/translations.ts`
      was written without a native speaker's review and says so. Technical
      terms were deliberately left untranslated; the surrounding prose has not
      been checked.
- [ ] **Consider a bootstrap/snapshot option.** `go-quai-startos` has one
      because syncing Quai from genesis takes weeks. Dogecoin's initial sync
      is a few days, so this is a convenience rather than a necessity — and a
      snapshot means asking users to trust a third party for chain data they
      would otherwise verify themselves. Not obviously worth it.
