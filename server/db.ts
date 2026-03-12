import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import * as path from "path";
import * as fs from "fs";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(path.join(dataDir, "digitalhaute.db"));
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
