import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDatabasePath(): string {
  const userData = (app && typeof app.getPath === 'function') ? app.getPath('userData') : path.join(process.env.APPDATA || process.cwd(), 'youtube-automation');
  const dbDir = path.join(userData, 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'docuforge.db');
}

export function initDatabase(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = getDatabasePath();
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Auto-migration: ensure thumbnail_path column exists in projects table
  try {
    const tableInfo = db.prepare('PRAGMA table_info(projects)').all() as any[];
    if (!tableInfo.some((c) => c.name === 'thumbnail_path')) {
      db.prepare('ALTER TABLE projects ADD COLUMN thumbnail_path TEXT').run();
    }
  } catch (migErr) {
    console.warn('[Database] thumbnail_path migration check:', migErr);
  }

  // Initialize schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  let schema = '';
  if (fs.existsSync(schemaPath)) {
    schema = fs.readFileSync(schemaPath, 'utf8');
  } else {
    // Fallback embedded schema
    schema = `
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        project_path TEXT NOT NULL,
        script_path TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        scene_count INTEGER NOT NULL DEFAULT 0,
        voice_id TEXT,
        music_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scenes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        scene_index INTEGER NOT NULL,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        script_text TEXT NOT NULL,
        image_prompt TEXT NOT NULL DEFAULT '',
        overlay_text TEXT NOT NULL DEFAULT '',
        caption_text TEXT,
        caption_enabled INTEGER NOT NULL DEFAULT 1,
        image_path TEXT,
        image_status TEXT NOT NULL DEFAULT 'PENDING',
        audio_path TEXT,
        audio_duration_ms INTEGER,
        audio_status TEXT NOT NULL DEFAULT 'PENDING',
        voice_id TEXT,
        voice_speed REAL NOT NULL DEFAULT 1.0,
        motion_type TEXT NOT NULL DEFAULT 'STATIC',
        transition_type TEXT NOT NULL DEFAULT 'CUT',
        transition_duration_ms INTEGER NOT NULL DEFAULT 150,
        approval_status TEXT NOT NULL DEFAULT 'UNREVIEWED',
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, scene_index)
      );

      CREATE TABLE IF NOT EXISTS renders (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL,
        output_path TEXT,
        progress REAL NOT NULL DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        error_message TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
      );
    `;
  }

  db.exec(schema);

  
  // Safe migration for visual_beats table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS visual_beats (
        id TEXT PRIMARY KEY,
        scene_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        beat_index INTEGER NOT NULL,
        start_offset_ms INTEGER NOT NULL,
        end_offset_ms INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        shot_type TEXT NOT NULL,
        visual_concept TEXT NOT NULL,
        environment_description TEXT NOT NULL,
        image_prompt TEXT NOT NULL,
        image_path TEXT,
        generation_status TEXT NOT NULL DEFAULT 'PENDING',
        motion TEXT NOT NULL DEFAULT 'STATIC',
        transition TEXT NOT NULL DEFAULT 'CUT',
        transition_duration_ms INTEGER NOT NULL DEFAULT 0,
        keyword TEXT,
        keyword_enabled INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(scene_id, beat_index)
      );
    `);
  } catch (err) {
    console.error('[Database] Migration error for visual_beats:', err);
  }

  // Safe migrations for new caption & transition fields
  try { db.exec("ALTER TABLE scenes ADD COLUMN overlay_text TEXT NOT NULL DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE scenes ADD COLUMN caption_text TEXT"); } catch {}
  try { db.exec("ALTER TABLE scenes ADD COLUMN caption_enabled INTEGER NOT NULL DEFAULT 1"); } catch {}
  try { db.exec("ALTER TABLE scenes ADD COLUMN transition_type TEXT NOT NULL DEFAULT 'CUT'"); } catch {}
  try { db.exec("ALTER TABLE scenes ADD COLUMN transition_duration_ms INTEGER NOT NULL DEFAULT 150"); } catch {}
  try { db.exec("ALTER TABLE projects ADD COLUMN caption_style_json TEXT"); } catch {}
  try { db.exec("ALTER TABLE scenes ADD COLUMN words_json TEXT"); } catch {}
  try { db.exec("ALTER TABLE scenes ADD COLUMN speech_start_ms INTEGER"); } catch {}
  try { db.exec("ALTER TABLE scenes ADD COLUMN speech_end_ms INTEGER"); } catch {}
  // Safe migrations for video effects
  try { db.exec("ALTER TABLE visual_beats ADD COLUMN video_effect TEXT NOT NULL DEFAULT 'none'"); } catch {}
  try { db.exec("ALTER TABLE scenes ADD COLUMN video_effect TEXT NOT NULL DEFAULT 'none'"); } catch {}
  try { db.exec("ALTER TABLE projects ADD COLUMN default_video_effect TEXT NOT NULL DEFAULT 'none'"); } catch {}
  try { db.exec("ALTER TABLE projects ADD COLUMN visual_niche TEXT DEFAULT 'stoic_philosophy'"); } catch {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id)"); } catch {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_visual_beats_project_id ON visual_beats(project_id)"); } catch {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_visual_beats_scene_id ON visual_beats(scene_id)"); } catch {}



  dbInstance = db;
  return db;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}
