import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  /* The ":N" suffix is the PACKAGE revision, bumped for changes to this
   * packaging rather than to Dogecoin Core. StartOS compares versions to
   * decide whether a sideload is an update, so reinstalling the same string
   * is not an upgrade path. */
  version: '1.14.9:1',
  releaseNotes: {
    en_US:
      'Chain Sync now distinguishes fetching the header chain from downloading blocks, instead of showing a percentage against a denominator that is still growing.',
    es_ES:
      'La sincronización de la cadena ahora distingue la obtención de la cadena de encabezados de la descarga de bloques, en lugar de mostrar un porcentaje sobre un denominador que aún está creciendo.',
    de_DE:
      'Die Kettensynchronisation unterscheidet jetzt zwischen dem Laden der Header-Kette und dem Herunterladen von Blöcken, statt einen Prozentwert gegen einen noch wachsenden Nenner anzuzeigen.',
    pl_PL:
      'Synchronizacja łańcucha odróżnia teraz pobieranie łańcucha nagłówków od pobierania bloków, zamiast pokazywać procent względem wciąż rosnącego mianownika.',
    fr_FR:
      'La synchronisation de la chaîne distingue désormais la récupération de la chaîne d’en-têtes du téléchargement des blocs, au lieu d’afficher un pourcentage calculé sur un dénominateur encore croissant.',
  },
  migrations: {
    /* No data migration: this revision changes only how progress is reported.
     * The chain lives in the `main` volume, which persists across updates —
     * that is what makes a package revision cheap. */
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
