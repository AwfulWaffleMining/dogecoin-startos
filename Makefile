# Dogecoin Core is modest: it runs well on aarch64 SBCs as well as x86_64.
# aarch64 stays out until its release tarball checksum is verified by hand
# the same way the x86_64 one was — see TODO.md.
ARCHES := x86
# overrides to s9pk.mk must precede the include statement
include node_modules/@start9labs/start-sdk/s9pk.mk
