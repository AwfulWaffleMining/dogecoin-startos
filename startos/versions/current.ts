import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  /* The ":N" suffix is the PACKAGE revision, bumped for changes to this
   * packaging rather than to Dogecoin Core. StartOS compares versions to
   * decide whether a sideload is an update, so reinstalling the same string
   * is not an upgrade path. */
  version: '1.14.9:5',
  releaseNotes: {
    en_US:
      'Fixes Chain Sync reporting. It could sit on \u201cFetching the header chain\u201d indefinitely once the node reached the tip, and flipped between that and a percentage while blocks were still downloading. RPC access now follows Bitcoin Core: no password is stored anywhere \u2014 local callers use the cookie file, and each external consumer gets its own credential from the Generate RPC User action, shown once and held only as a salted hash. Upgrading removes the plaintext password a 1.14.9:1 install left in its store. Also drops mining-specific ports and wording; this package is a Dogecoin node.',
    es_ES:
      'Corrige el informe de Sincronizaci\u00f3n de la cadena, que pod\u00eda quedarse indefinidamente en \u00abobteniendo la cadena de encabezados\u00bb al alcanzar la punta y alternaba con un porcentaje durante la descarga de bloques. El acceso RPC ahora sigue a Bitcoin Core: no se almacena ninguna contrase\u00f1a; los llamadores locales usan el archivo cookie y cada consumidor externo obtiene su propia credencial mediante la acci\u00f3n Generar usuario RPC, mostrada una sola vez y conservada solo como hash con sal. La actualizaci\u00f3n elimina la contrase\u00f1a en texto plano que dej\u00f3 una instalaci\u00f3n 1.14.9:1.',
    de_DE:
      'Behebt die Anzeige der Kettensynchronisation, die nach Erreichen der Spitze dauerhaft auf \u201eHeader-Kette wird geladen\u201c stehen bleiben konnte und w\u00e4hrend des Blockdownloads zwischen dieser Meldung und einem Prozentwert wechselte. Der RPC-Zugang folgt nun Bitcoin Core: es wird kein Passwort gespeichert \u2014 lokale Aufrufer nutzen die Cookie-Datei, und jeder externe Verbraucher erh\u00e4lt \u00fcber die Aktion \u201eRPC-Benutzer erzeugen\u201c eigene Zugangsdaten, die einmal angezeigt und nur als gesalzener Hash gehalten werden. Das Update entfernt das Klartextpasswort, das eine 1.14.9:1-Installation hinterlassen hat.',
    pl_PL:
      'Naprawia raportowanie synchronizacji \u0142a\u0144cucha, kt\u00f3re po osi\u0105gni\u0119ciu czubka mog\u0142o utkn\u0105\u0107 na \u201epobieranie \u0142a\u0144cucha nag\u0142\u00f3wk\u00f3w\u201d, a w trakcie pobierania blok\u00f3w prze\u0142\u0105cza\u0142o si\u0119 mi\u0119dzy tym komunikatem a warto\u015bci\u0105 procentow\u0105. Dost\u0119p RPC dzia\u0142a teraz jak w Bitcoin Core: \u017cadne has\u0142o nie jest przechowywane \u2014 lokalni klienci u\u017cywaj\u0105 pliku cookie, a ka\u017cdy zewn\u0119trzny odbiorca otrzymuje w\u0142asne dane uwierzytelniaj\u0105ce z akcji Utw\u00f3rz u\u017cytkownika RPC, pokazywane raz i przechowywane tylko jako skr\u00f3t z sol\u0105. Aktualizacja usuwa has\u0142o zapisane jawnie przez instalacj\u0119 1.14.9:1.',
    fr_FR:
      'Corrige l\u2019affichage de la synchronisation de la cha\u00eene, qui pouvait rester ind\u00e9finiment sur \u00ab r\u00e9cup\u00e9ration de la cha\u00eene d\u2019en-t\u00eates \u00bb une fois la pointe atteinte et alternait avec un pourcentage pendant le t\u00e9l\u00e9chargement des blocs. L\u2019acc\u00e8s RPC suit d\u00e9sormais Bitcoin Core : aucun mot de passe n\u2019est stock\u00e9 \u2014 les appelants locaux utilisent le fichier cookie, et chaque consommateur externe obtient ses propres identifiants via l\u2019action Cr\u00e9er un utilisateur RPC, affich\u00e9s une seule fois et conserv\u00e9s uniquement sous forme d\u2019empreinte salt\u00e9e. La mise \u00e0 jour supprime le mot de passe en clair laiss\u00e9 par une installation 1.14.9:1.',
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
