// Minimal ambient type declarations for Node's built-in `node:sqlite` module.
// @types/node@20 does not yet ship types for this (added in Node 22.5+ / @types/node@22+).
// Remove this file once the project's @types/node is upgraded to a version that includes it.

declare module "node:sqlite" {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResultingChanges;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    iterate(...params: unknown[]): IterableIterator<unknown>;
    setAllowBareNamedParameters(enabled: boolean): void;
    setReadBigInts(enabled: boolean): void;
    sourceSQL: string;
    expandedSQL: string;
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    open(): void;
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    function(name: string, fn: (...args: unknown[]) => unknown): void;
    createSession(options?: Record<string, unknown>): unknown;
    applyChangeset(changeset: Uint8Array, options?: Record<string, unknown>): boolean;
  }
}
