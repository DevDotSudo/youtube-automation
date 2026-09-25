import fs from 'fs';
import path from 'path';
import { getDb } from '../database';
import { Project, ProjectStatus } from '../../../shared/types';

export class ProjectRepository {
  private static resolveThumbnail(r: any): string | undefined {
    if (r.thumbnail_path && fs.existsSync(r.thumbnail_path)) {
      return r.thumbnail_path;
    }
    if (r.project_path) {
      const finalThumb = path.join(r.project_path, 'output', 'thumbnail.png');
      if (fs.existsSync(finalThumb)) return finalThumb;
      const rawThumb = path.join(r.project_path, 'output', 'thumbnail_raw.png');
      if (fs.existsSync(rawThumb)) return rawThumb;
      const beat1 = path.join(r.project_path, 'scenes', '0001', 'beats', 'beat_01.png');
      if (fs.existsSync(beat1)) return beat1;
    }
    return undefined;
  }

  static list(): Project[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status as ProjectStatus,
      projectPath: r.project_path,
      scriptPath: r.script_path,
      durationMs: r.duration_ms,
      sceneCount: r.scene_count,
      voiceId: r.voice_id,
      musicPath: r.music_path,
      thumbnailPath: this.resolveThumbnail(r),
      visualNiche: r.visual_niche || 'stoic_philosophy',
      characterLock: r.character_lock || undefined,
      platform: (r.platform as any) || 'YOUTUBE',
      aspectRatio: (r.aspect_ratio as any) || '16:9',
      captionStyle: r.caption_style_json ? JSON.parse(r.caption_style_json) : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  static getById(id: string): Project | null {
    const db = getDb();
    const r = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      status: r.status as ProjectStatus,
      projectPath: r.project_path,
      scriptPath: r.script_path,
      durationMs: r.duration_ms,
      sceneCount: r.scene_count,
      voiceId: r.voice_id,
      musicPath: r.music_path,
      thumbnailPath: this.resolveThumbnail(r),
      visualNiche: r.visual_niche || 'stoic_philosophy',
      platform: (r.platform as any) || 'YOUTUBE',
      aspectRatio: (r.aspect_ratio as any) || '16:9',
      captionStyle: r.caption_style_json ? JSON.parse(r.caption_style_json) : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  static create(project: Project): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO projects (id, name, status, project_path, script_path, duration_ms, scene_count, voice_id, music_path, thumbnail_path, visual_niche, platform, aspect_ratio, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project.id,
      project.name,
      project.status,
      project.projectPath,
      project.scriptPath || null,
      project.durationMs,
      project.sceneCount,
      project.voiceId || null,
      project.musicPath || null,
      project.thumbnailPath || null,
      project.visualNiche || 'stoic_philosophy',
      project.platform || 'YOUTUBE',
      project.aspectRatio || '16:9',
      project.createdAt,
      project.updatedAt
    );
  }

  static update(id: string, patch: Partial<Project>): void {
    const db = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
    if (patch.status !== undefined) { fields.push('status = ?'); values.push(patch.status); }
    if (patch.durationMs !== undefined) { fields.push('duration_ms = ?'); values.push(patch.durationMs); }
    if (patch.sceneCount !== undefined) { fields.push('scene_count = ?'); values.push(patch.sceneCount); }
    if (patch.voiceId !== undefined) { fields.push('voice_id = ?'); values.push(patch.voiceId); }
    if (patch.musicPath !== undefined) { fields.push('music_path = ?'); values.push(patch.musicPath); }
    if (patch.thumbnailPath !== undefined) { fields.push('thumbnail_path = ?'); values.push(patch.thumbnailPath); }
    if (patch.visualNiche !== undefined) { fields.push('visual_niche = ?'); values.push(patch.visualNiche); }
    if (patch.characterLock !== undefined) { fields.push('character_lock = ?'); values.push(patch.characterLock); }
    if (patch.platform !== undefined) { fields.push('platform = ?'); values.push(patch.platform); }
    if (patch.aspectRatio !== undefined) { fields.push('aspect_ratio = ?'); values.push(patch.aspectRatio); }
    if (patch.captionStyle !== undefined) { fields.push('caption_style_json = ?'); values.push(JSON.stringify(patch.captionStyle)); }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  static delete(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }
}
