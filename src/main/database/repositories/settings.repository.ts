import { getDb } from '../database';
import { AppSettings, MotionType } from '../../../shared/types';
import { app } from 'electron';
import path from 'path';

export class SettingsRepository {
  static getDefaultSettings(): AppSettings {
    const docs = (app && typeof app.getPath === 'function') ? app.getPath('documents') : path.join(process.env.USERPROFILE || 'C:/Users/Davie', 'Documents');
    const defaultWorkspace = path.join(docs, 'GhibliForge');
    return {
      workspacePath: defaultWorkspace,
      defaultVoiceId: 'en-US-AndrewMultilingualNeural',
      pixazoResolution: '1280x720',
      parrotAiResolution: '1280x720',
      defaultMotion: MotionType.STATIC,
      subtitleMode: 'BURN',
      musicVolumePercent: 12,
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
      verboseLogging: false,
      visualStyle: 'Studio Ghibli Hand-Painted Anime',
      backgroundColor: 'White',
      characterStyle: 'Studio Ghibli Storytelling Characters',
      textOverlayEnabled: false, // Text in images disabled - captions rendered by video pipeline
      overlayHighlightColor: 'Golden amber storybook accent',
      defaultEditStyle: 'Studio Ghibli Gentle Dissolves & Scenic Drifts',
      imageAspectRatio: '16:9',
      narrationStyle: 'Warm, evocative storytelling'
    };
  }

  static get(): AppSettings {
    const db = getDb();
    const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('app_settings') as any;
    const defaults = this.getDefaultSettings();
    if (!row) {
      this.save(defaults);
      return defaults;
    }
    try {
      return { ...defaults, ...JSON.parse(row.value_json) };
    } catch {
      return defaults;
    }
  }

  static save(settings: AppSettings): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO settings (key, value_json) VALUES ('app_settings', ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json
    `).run(JSON.stringify(settings));
  }
}
