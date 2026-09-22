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
  thumbnail_path TEXT,
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
  image_path TEXT,
  image_status TEXT NOT NULL DEFAULT 'PENDING',
  audio_path TEXT,
  audio_duration_ms INTEGER,
  audio_status TEXT NOT NULL DEFAULT 'PENDING',
  voice_id TEXT,
  voice_speed REAL NOT NULL DEFAULT 1.0,
  motion_type TEXT NOT NULL DEFAULT 'AUTO',
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

