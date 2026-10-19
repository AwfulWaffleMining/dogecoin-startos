import { sdk } from './sdk'

/**
 * No dependencies: a Dogecoin node needs nothing else on the server.
 *
 * The relationship runs the other way. A solo mining package depends on THIS
 * one, which is why the ids in startos/utils.ts are treated as an API.
 */
export const setDependencies = sdk.setupDependencies(async () => ({}))
