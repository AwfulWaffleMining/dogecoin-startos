import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  /* The ":N" suffix is the PACKAGE revision, bumped for changes to this
   * packaging rather than to Dogecoin Core. StartOS compares versions to
   * decide whether a sideload is an update, so reinstalling the same string
   * is not an upgrade path. */
  version: '1.14.9:4',
  releaseNotes: {
    en_US:
      'RPC access now follows Bitcoin Core: no password is stored anywhere. Local callers use the cookie file, and each external consumer gets its own credential from the Generate RPC User action, shown once and held only as a salted hash. Removes mining-specific ports and wording \u2014 this package is a Dogecoin node. Chain Sync distinguishes fetching the header chain from downloading blocks.',
    es_ES:
      'El acceso RPC ahora sigue a Bitcoin Core: no se almacena ninguna contraseña. Los llamadores locales usan el archivo cookie y cada consumidor externo obtiene su propia credencial mediante la acción Generar usuario RPC, mostrada una sola vez y conservada solo como hash con sal.',
    de_DE:
      'Der RPC-Zugang folgt nun Bitcoin Core: es wird kein Passwort gespeichert. Lokale Aufrufer nutzen die Cookie-Datei, und jeder externe Verbraucher erhält über die Aktion „RPC-Benutzer erzeugen“ eigene Zugangsdaten, die einmal angezeigt und nur als gesalzener Hash gehalten werden.',
    pl_PL:
      'Dostęp RPC działa teraz jak w Bitcoin Core: żadne hasło nie jest przechowywane. Lokalni klienci używają pliku cookie, a każdy zewnętrzny odbiorca otrzymuje własne dane uwierzytelniające z akcji Utwórz użytkownika RPC, pokazywane raz i przechowywane tylko jako skrót z solą.',
    fr_FR:
      'L’accès RPC suit désormais Bitcoin Core : aucun mot de passe n’est stocké. Les appelants locaux utilisent le fichier cookie, et chaque consommateur externe obtient ses propres identifiants via l’action Créer un utilisateur RPC, affichés une seule fois et conservés uniquement sous forme d’empreinte salée.',
  },
  migrations: {
    /* No explicit migration, but this revision does change the store shape:
     * `rpcUsername` and `rpcPassword` are gone. Nothing needs to move them,
     * because the seed-file `merge()` on update reparses store.json through
     * the zod shape, which strips keys the shape no longer declares, and
     * writes the result back whenever it differs from what was on disk. The
     * :1 plaintext password is therefore removed from disk by the update
     * rather than merely ignored — verified by running a :1-shaped store
     * through the shape and confirming the secret is absent from the output
     * while shareRpc, dbCacheMiB and listen survive.
     *
     * Anything that authenticated with the :1 credential stops working and
     * needs a new one from the Generate RPC User action. Nothing ships that
     * consumes it yet, so there is nothing to coordinate.
     *
     * The chain itself lives in the `main` volume, which persists across
     * updates — that is what makes a package revision cheap. */
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
