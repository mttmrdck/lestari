// A real SQLite database behind the D1 API, so the Worker's SQL runs for real in tests.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type SqliteDb = { exec(sql: string): void; prepare(sql: string): { all(...p: unknown[]): unknown[]; run(...p: unknown[]): { changes: number | bigint } } };
const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as unknown as { DatabaseSync: new (path: string) => SqliteDb };

class Stmt {
  private params: unknown[] = [];
  private db: SqliteDb;
  private sql: string;
  constructor(db: SqliteDb, sql: string) {
    this.db = db;
    this.sql = sql;
  }
  bind(...p: unknown[]) { this.params = p; return this; }
  // D1 numbers parameters ?1, ?2; node:sqlite accepts the same when given positionally per index.
  private stmt() { return this.db.prepare(this.sql); }
  async all<T>() { return { results: this.stmt().all(...this.params) as T[] }; }
  async first<T>() { return (this.stmt().all(...this.params)[0] as T) ?? null; }
  async run() {
    if (/\bRETURNING\b/i.test(this.sql)) { const rows = this.stmt().all(...this.params); return { meta: { changes: rows.length } }; }
    return { meta: { changes: Number(this.stmt().run(...this.params).changes) } };
  }
}

export function createD1() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(readFileSync(join(import.meta.dirname, '../../migrations/0001_initial.sql'), 'utf8'));
  return {
    prepare: (sql: string) => new Stmt(db, sql),
    batch: async (stmts: Stmt[]) => Promise.all(stmts.map((s) => s.run())),
    raw: db,
  };
}
