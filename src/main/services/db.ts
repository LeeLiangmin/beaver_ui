import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database

function getDbPath(): string {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'beaver.db')
  }
  return path.join(app.getAppPath(), 'beaver.db')
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath())
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    initTables()
  }
  return db
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS history_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      year INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'event',
      desc TEXT NOT NULL DEFAULT '',
      UNIQUE(month, day, year, title)
    );
    CREATE INDEX IF NOT EXISTS idx_history_date ON history_events(month, day);

    CREATE TABLE IF NOT EXISTS env_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'teal',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS env_entries (
      key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      group_id TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (key)
    );
    CREATE INDEX IF NOT EXISTS idx_env_group ON env_entries(group_id);

    CREATE TABLE IF NOT EXISTS env_group_entries (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      group_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_env_group_entries ON env_group_entries(group_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_env_group_entries_unique ON env_group_entries(key, group_id);

    CREATE TABLE IF NOT EXISTS opener_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'teal',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS opener_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      is_dir INTEGER NOT NULL DEFAULT 0,
      group_id TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT 0,
      last_used INTEGER NOT NULL DEFAULT 0,
      use_count INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (group_id) REFERENCES opener_groups(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_opener_items_group ON opener_items(group_id);
  `)
}

export function closeDb() {
  if (db) {
    db.close()
  }
}
