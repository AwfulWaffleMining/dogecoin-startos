import { setupManifest } from '@start9labs/start-sdk'
import { dogecoinSha256, dogecoinVersion, imageId } from '../utils'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'dogecoin',
  title: 'Dogecoin Core',
  license: 'MIT',
  packageRepo: 'https://github.com/Start9-Community/dogecoin-startos',
  upstreamRepo: 'https://github.com/dogecoin/dogecoin',
  marketingUrl: 'https://dogecoin.com',
  donationUrl:
    'https://github.com/Start9-Community/dogecoin-startos/blob/main/DONATE.md',
  description: { short, long },
  volumes: ['main'],
  images: {
    [imageId]: {
      source: {
        dockerBuild: {
          buildArgs: {
            DOGECOIN_VERSION: dogecoinVersion,
            DOGECOIN_SHA256: dogecoinSha256,
          },
        },
      },
      // x86_64 only for now: the aarch64 release tarball needs its checksum
      // verified by hand before it can be pinned. See TODO.md.
      arch: ['x86_64'],
    },
  },
  hardwareRequirements: {
    // Dogecoin Core is far lighter than an EVM node. 2 GB is comfortable for
    // a full node; the constraint is disk, not memory, and StartOS surfaces
    // free space separately.
    ram: 2048,
  },
  dependencies: {},
})
