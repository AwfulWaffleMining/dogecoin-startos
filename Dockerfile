# Dogecoin Core for StartOS, from the pinned upstream release tarball.
#
# Not built from source. Dogecoin Core 1.14 needs Berkeley DB 4.8 for wallet
# compatibility, and building that from source produces a wallet.dat that
# other Dogecoin builds may refuse. The official release binaries are the
# artifact the network actually runs, so this image verifies and installs
# those instead of producing a different one.
#
# The version and checksum are passed from startos/manifest/index.ts, which
# reads them from startos/utils.ts. They move together.
ARG DOGECOIN_VERSION=1.14.9
ARG DOGECOIN_SHA256

FROM debian:bookworm-slim AS fetch
ARG DOGECOIN_VERSION
ARG DOGECOIN_SHA256
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /dl
# No curl --retry here: on retry it restarts into the same partial file and
# corrupts it. One attempt, then the checksum decides.
RUN set -eu; \
    url="https://github.com/dogecoin/dogecoin/releases/download/v${DOGECOIN_VERSION}/dogecoin-${DOGECOIN_VERSION}-x86_64-linux-gnu.tar.gz"; \
    echo "fetching ${url}"; \
    curl -fsSL -o dogecoin.tar.gz "$url"; \
    echo "${DOGECOIN_SHA256}  dogecoin.tar.gz" > SHA256; \
    sha256sum -c SHA256; \
    tar -xzf dogecoin.tar.gz; \
    mv "dogecoin-${DOGECOIN_VERSION}" /opt/dogecoin

# Glibc base, because the release binaries are x86_64-linux-gnu. An Alpine
# base would need the musl shim and is not worth the surprise.
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Only the two binaries this package runs. The release tarball also carries
# dogecoin-qt and dogecoin-tx, which have no use in a headless service and
# would pull in X11 dependencies if they were ever invoked.
COPY --from=fetch /opt/dogecoin/bin/dogecoind /usr/local/bin/dogecoind
COPY --from=fetch /opt/dogecoin/bin/dogecoin-cli /usr/local/bin/dogecoin-cli

COPY docker_entrypoint.sh /usr/local/bin/docker_entrypoint.sh
RUN chmod +x /usr/local/bin/docker_entrypoint.sh \
             /usr/local/bin/dogecoind \
             /usr/local/bin/dogecoin-cli

# Fail the build rather than ship an image whose binary will not run.
RUN dogecoind --version | head -1
