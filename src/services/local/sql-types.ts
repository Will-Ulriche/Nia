/**
 * Type des valeurs liées aux requêtes SQL (moteur SQLite et WebSqlMock).
 * `undefined` est accepté : les appels existants l'utilisent comme synonyme
 * de NULL dans les INSERT/UPDATE à champs optionnels.
 */
export type SqlValue = string | number | boolean | null | undefined;