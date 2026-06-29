import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { app } from "electron";
import { getDb } from "./db";
import crypto from "crypto";

const execAsync = promisify(exec);

export interface EnvVar {
  key: string;
  value: string;
  groupId: string;
}

export interface EnvGroup {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: number;
}

export interface EnvBackupMeta {
  fileName: string;
  filePath: string;
  modTime: number;
  size: number;
  itemCount: number;
}

export interface RestoreEnvRequest {
  filePath: string;
  keys: string[];
}

export interface RestoreEnvResult {
  restored: number;
  skipped: number;
}

const BACKUP_DIR = "backup";
const MERGED_FILE = "env-backup.toml";

function getBackupDir(): string {
  const base = app.isPackaged
    ? path.dirname(app.getPath("exe"))
    : app.getAppPath();
  return path.join(base, BACKUP_DIR);
}

export function getBackupDirectory(): string {
  return getBackupDir();
}

function uuid(): string {
  return crypto.randomUUID();
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

// ── Groups ──────────────────────────────────────────────────

export function getGroups(): EnvGroup[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, name, color, sort_order as sortOrder, created_at as createdAt FROM env_groups ORDER BY sort_order",
    )
    .all() as EnvGroup[];
}

export function createGroup(name: string, color: string): EnvGroup {
  const db = getDb();
  const maxOrder =
    (db.prepare("SELECT MAX(sort_order) as m FROM env_groups").get() as any)
      ?.m || 0;
  const group: EnvGroup = {
    id: uuid(),
    name,
    color,
    sortOrder: maxOrder + 1,
    createdAt: now(),
  };
  db.prepare(
    "INSERT INTO env_groups (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(group.id, group.name, group.color, group.sortOrder, group.createdAt);
  return group;
}

export function updateGroup(group: EnvGroup): void {
  const db = getDb();
  db.prepare(
    "UPDATE env_groups SET name=?, color=?, sort_order=? WHERE id=?",
  ).run(group.name, group.color, group.sortOrder, group.id);
}

export function deleteGroup(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM env_group_entries WHERE group_id = ?").run(id);
  // 将被删分组作为主归属的变量，重新分配到剩余分组（如果有的话）
  db.prepare(
    "UPDATE env_entries SET group_id = COALESCE((SELECT group_id FROM env_group_entries WHERE env_group_entries.key = env_entries.key LIMIT 1), '') WHERE group_id = ?",
  ).run(id);
  db.prepare("DELETE FROM env_groups WHERE id = ?").run(id);
}

// ── Registry helpers ────────────────────────────────────────

async function readRegistryEnv(
  root: "HKLM" | "HKCU",
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const hiveRoot =
    root === "HKLM"
      ? "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment"
      : "HKCU\\Environment";
  try {
    const { stdout } = await execAsync(`reg query "${hiveRoot}"`, {
      timeout: 5000,
    });
    for (const line of stdout.split("\n")) {
      const match = line
        .trim()
        .match(/^\s*(.+?)\s+(REG_SZ|REG_EXPAND_SZ)\s+(.+)$/);
      if (match) map.set(match[1], match[3]);
    }
  } catch {}
  return map;
}

// ── Entries ─────────────────────────────────────────────────

export async function getEnvVars(): Promise<EnvVar[]> {
  const merged = new Map<string, string>();

  if (process.platform === "win32") {
    const sysVars = await readRegistryEnv("HKLM");
    for (const [k, v] of sysVars) merged.set(k, v);
    const userVars = await readRegistryEnv("HKCU");
    for (const [k, v] of userVars) merged.set(k, v);
  }
  if (merged.size === 0) {
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) merged.set(k, v);
    }
  }

  // Load group assignments from DB
  const db = getDb();
  const dbEntries = db
    .prepare("SELECT key, value, group_id FROM env_entries")
    .all() as any[];

  const result: EnvVar[] = [];
  for (const [key, value] of merged) {
    const dbEntry = dbEntries.find((e: any) => e.key === key);
    result.push({ key, value, groupId: dbEntry?.group_id || "" });
  }
  result.sort((a, b) => a.key.toLowerCase().localeCompare(b.key.toLowerCase()));
  return result;
}

export async function setEnvVar(key: string, value: string): Promise<void> {
  const k = key.trim();
  if (!k) throw new Error("环境变量名不能为空");
  if (process.platform === "win32") {
    await execAsync(`setx "${k}" "${value}"`, { timeout: 5000 });
  }
  process.env[k] = value;
  // Save to DB
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO env_entries (key, value, group_id) VALUES (?, ?, COALESCE((SELECT group_id FROM env_entries WHERE key = ?), ''))",
  ).run(k, value, k);
}

export async function deleteEnvVar(key: string): Promise<void> {
  const k = key.trim();
  if (!k) throw new Error("环境变量名不能为空");
  if (process.platform === "win32") {
    for (const hive of ["HKCU", "HKLM"]) {
      const hiveRoot =
        hive === "HKLM"
          ? "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment"
          : "HKCU\\Environment";
      try {
        await execAsync(`reg delete "${hiveRoot}" /v "${k}" /f`, {
          timeout: 5000,
        });
      } catch {}
    }
  }
  delete process.env[k];
  const db = getDb();
  db.prepare("DELETE FROM env_entries WHERE key = ?").run(k);
}

export async function setEnvVars(
  items: EnvVar[],
): Promise<{ success: number; failed: number }> {
  let success = 0,
    failed = 0;
  for (const item of items) {
    try {
      await setEnvVar(item.key, item.value);
      success++;
    } catch {
      failed++;
    }
  }
  return { success, failed };
}

// ── Group assignment (纯分组标签，不涉及备份) ───────────────

export function moveToGroup(key: string, groupId: string): void {
  const db = getDb();
  const currentValue = process.env[key] ?? "";

  // 更新实时表中的分组归属（主列表显示最新加入的分组）
  db.prepare(
    "INSERT OR REPLACE INTO env_entries (key, value, group_id) VALUES (?, ?, ?)",
  ).run(key, currentValue, groupId);

  // 在备份表中为该分组创建独立快照（不影响其他分组）
  db.prepare(
    "INSERT OR REPLACE INTO env_group_entries (id, key, value, group_id, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(uuid(), key, currentValue, groupId, now());
}

export function removeFromGroup(key: string, groupId: string): void {
  const db = getDb();
  // 只删除该变量在指定分组中的备份快照
  db.prepare("DELETE FROM env_group_entries WHERE key = ? AND group_id = ?").run(
    key,
    groupId,
  );
  // 检查该变量是否还属于其他分组
  const remaining = db
    .prepare(
      "SELECT group_id FROM env_group_entries WHERE key = ? LIMIT 1",
    )
    .get(key) as { group_id: string } | undefined;
  // 更新主列表显示：有剩余分组则显示第一个，无则清空
  db.prepare(
    "UPDATE env_entries SET group_id = ? WHERE key = ?",
  ).run(remaining?.group_id || "", key);
}

// ── 分组内条目（备份快照，独立于实时数据）───────────────────

export function getGroupEntries(groupId: string): EnvVar[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT key, value, group_id as groupId FROM env_group_entries WHERE group_id = ?",
    )
    .all(groupId) as EnvVar[];
}

// ── 显式备份/恢复（操作 env_group_entries）──────────────────

export async function backupGroup(
  groupId: string,
): Promise<{ backedUp: number }> {
  const db = getDb();
  // 从备份表获取该分组实际包含的 key（支持多分组）
  const keys = db
    .prepare("SELECT key FROM env_group_entries WHERE group_id = ?")
    .all(groupId) as { key: string }[];
  for (const { key } of keys) {
    // 读取当前实时值来更新快照
    const entry = db
      .prepare("SELECT value FROM env_entries WHERE key = ?")
      .get(key) as { value: string } | undefined;
    const currentValue = entry?.value ?? process.env[key] ?? "";
    db.prepare(
      "INSERT OR REPLACE INTO env_group_entries (id, key, value, group_id, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(uuid(), key, currentValue, groupId, now());
  }
  return { backedUp: keys.length };
}

export async function backupGroupItem(
  groupId: string,
  key: string,
): Promise<void> {
  const db = getDb();
  const entry = db
    .prepare(
      "SELECT key, value FROM env_entries WHERE group_id = ? AND key = ?",
    )
    .get(groupId, key) as { key: string; value: string } | undefined;
  if (!entry) throw new Error(`分组内不存在变量: ${key}`);
  db.prepare(
    "INSERT OR REPLACE INTO env_group_entries (id, key, value, group_id, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(uuid(), entry.key, entry.value, groupId, now());
}

export async function restoreGroup(
  groupId: string,
): Promise<{ restored: number }> {
  const db = getDb();
  const items = db
    .prepare("SELECT key, value FROM env_group_entries WHERE group_id = ?")
    .all(groupId) as { key: string; value: string }[];
  for (const item of items) {
    await setEnvVar(item.key, item.value);
  }
  return { restored: items.length };
}

export async function restoreGroupItem(
  groupId: string,
  key: string,
): Promise<void> {
  const db = getDb();
  const backup = db
    .prepare(
      "SELECT key, value FROM env_group_entries WHERE group_id = ? AND key = ?",
    )
    .get(groupId, key) as { key: string; value: string } | undefined;
  if (!backup) throw new Error(`该变量无备份: ${key}`);
  await setEnvVar(backup.key, backup.value);
}

// ── TOML Backup (legacy, not used in UI) ─────────────────────

function escapeToml(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function unescapeToml(s: string): string {
  return s
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function buildBackupToml(items: EnvVar[]): string {
  let t = `generated_at = "${new Date().toISOString()}"\ncount = ${items.length}\n\n`;
  for (const item of items) {
    t += "[[items]]\n";
    t += `key = "${escapeToml(item.key)}"\n`;
    t += `value = "${escapeToml(item.value)}"\n\n`;
  }
  return t;
}

function parseBackupToml(content: string): EnvVar[] {
  const lines = content.split("\n");
  const items: EnvVar[] = [];
  let current: Partial<EnvVar> = {};
  let inItem = false;
  const flush = () => {
    if (inItem && current.key) {
      items.push({ key: current.key, value: current.value || "", groupId: "" });
      current = {};
      inItem = false;
    }
  };
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (t === "[[items]]") {
      flush();
      inItem = true;
      continue;
    }
    if (!inItem) continue;
    if (t.startsWith("key =")) {
      const v = t.slice(5).trim();
      if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"')
        current.key = unescapeToml(v.slice(1, -1));
    } else if (t.startsWith("value =")) {
      const v = t.slice(7).trim();
      if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"')
        current.value = unescapeToml(v.slice(1, -1));
    }
  }
  flush();
  return items;
}

export async function backupEnvVars(targetDir?: string): Promise<string> {
  const absDir = path.resolve(targetDir || getBackupDir());
  fs.mkdirSync(absDir, { recursive: true });
  const items = await getEnvVars();
  fs.writeFileSync(
    path.join(absDir, MERGED_FILE),
    buildBackupToml(items),
    "utf-8",
  );
  return absDir;
}

export async function backupEnvVar(
  key: string,
  targetDir?: string,
): Promise<string> {
  const k = key.trim();
  if (!k) throw new Error("环境变量名不能为空");
  const value = process.env[k];
  if (value === undefined) throw new Error(`环境变量不存在: ${k}`);
  const absDir = path.resolve(targetDir || getBackupDir());
  fs.mkdirSync(absDir, { recursive: true });
  const fp = path.join(absDir, MERGED_FILE);
  let items: EnvVar[] = [];
  if (fs.existsSync(fp)) {
    try {
      items = parseBackupToml(fs.readFileSync(fp, "utf-8"));
    } catch {}
  }
  const idx = items.findIndex((it) => it.key === k);
  if (idx >= 0) items[idx].value = value;
  else items.push({ key: k, value, groupId: "" });
  items.sort((a, b) => a.key.toLowerCase().localeCompare(b.key.toLowerCase()));
  fs.writeFileSync(fp, buildBackupToml(items), "utf-8");
  return fp;
}

export async function listEnvBackups(
  targetDir?: string,
): Promise<EnvBackupMeta[]> {
  const absDir = path.resolve(targetDir || getBackupDir());
  const fp = path.join(absDir, MERGED_FILE);
  if (!fs.existsSync(fp)) return [];
  const stat = fs.statSync(fp);
  let count = 0;
  try {
    count = parseBackupToml(fs.readFileSync(fp, "utf-8")).length;
  } catch {}
  return [
    {
      fileName: MERGED_FILE,
      filePath: fp,
      modTime: stat.mtimeMs,
      size: stat.size,
      itemCount: count,
    },
  ];
}

export async function getEnvBackupItems(filePath: string): Promise<EnvVar[]> {
  if (!filePath.trim()) throw new Error("备份文件路径不能为空");
  return parseBackupToml(fs.readFileSync(filePath, "utf-8"));
}

export async function restoreEnvVarsFromBackup(
  req: RestoreEnvRequest,
): Promise<RestoreEnvResult> {
  const items = await getEnvBackupItems(req.filePath);
  const selected = new Set(req.keys.map((k) => k.trim()).filter(Boolean));
  const restoreAll = selected.size === 0;
  let restored = 0,
    skipped = 0;
  for (const item of items) {
    if (!restoreAll && !selected.has(item.key)) {
      skipped++;
      continue;
    }
    await setEnvVar(item.key, item.value);
    restored++;
  }
  return { restored, skipped };
}

export function deleteBackupFile(filePath: string): void {
  if (!filePath.trim()) throw new Error("备份文件路径不能为空");
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function deleteBackupItem(filePath: string, key: string): void {
  if (!filePath.trim()) throw new Error("备份文件路径不能为空");
  const items = parseBackupToml(fs.readFileSync(filePath, "utf-8")).filter(
    (it) => it.key !== key,
  );
  fs.writeFileSync(filePath, buildBackupToml(items), "utf-8");
}
