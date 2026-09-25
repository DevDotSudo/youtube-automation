import { getDb } from '../database';
import { VisualBeat, VisualShotType } from '../../../shared/types';

export class VisualBeatRepository {
  static listBySceneId(sceneId: string): VisualBeat[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM visual_beats WHERE scene_id = ? ORDER BY beat_index ASC').all(sceneId) as any[];
    return rows.map(this.mapRow);
  }

  static listByProjectId(projectId: string): VisualBeat[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT vb.* FROM visual_beats vb
      LEFT JOIN scenes s ON vb.scene_id = s.id
      WHERE vb.project_id = ?
      ORDER BY COALESCE(s.scene_index, 0) ASC, vb.start_offset_ms ASC, vb.beat_index ASC
    `).all(projectId) as any[];
    return rows.map(this.mapRow);
  }

  static getById(id: string): VisualBeat | null {
    const db = getDb();
    const r = db.prepare('SELECT * FROM visual_beats WHERE id = ?').get(id) as any;
    if (!r) return null;
    return this.mapRow(r);
  }

  static create(beat: VisualBeat): VisualBeat {
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO visual_beats (
        id, scene_id, project_id, beat_index, start_offset_ms, end_offset_ms,
        duration_ms, shot_type, visual_concept, environment_description, image_prompt,
        image_path, generation_status, motion, transition, transition_duration_ms, keyword, keyword_enabled, video_effect, in_animation, out_animation, in_animation_duration_ms, out_animation_duration_ms, script_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      beat.id,
      beat.sceneId,
      beat.projectId,
      beat.beatIndex,
      beat.startOffsetMs,
      beat.endOffsetMs,
      beat.durationMs,
      beat.shotType,
      beat.visualConcept,
      beat.environmentDescription,
      beat.imagePrompt,
      beat.imagePath || null,
      beat.generationStatus,
      beat.motion,
      beat.transition,
      beat.transitionDurationMs || 0,
      beat.keyword || null,
      beat.keywordEnabled ? 1 : 0,
      beat.videoEffect || 'none',
      beat.inAnimation || 'NONE',
      beat.outAnimation || 'NONE',
      beat.inAnimationDurationMs ?? 400,
      beat.outAnimationDurationMs ?? 400,
      beat.scriptText || null
    );
    return beat;
  }

  static createMany(beats: VisualBeat[]): void {
    if (beats.length === 0) return;
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO visual_beats (
        id, scene_id, project_id, beat_index, start_offset_ms, end_offset_ms,
        duration_ms, shot_type, visual_concept, environment_description, image_prompt,
        image_path, generation_status, motion, transition, transition_duration_ms, keyword, keyword_enabled, video_effect, in_animation, out_animation, in_animation_duration_ms, out_animation_duration_ms, script_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items: VisualBeat[]) => {
      for (const b of items) {
        insert.run(
          b.id,
          b.sceneId,
          b.projectId,
          b.beatIndex,
          b.startOffsetMs,
          b.endOffsetMs,
          b.durationMs,
          b.shotType,
          b.visualConcept,
          b.environmentDescription,
          b.imagePrompt,
          b.imagePath || null,
          b.generationStatus,
          b.motion,
          b.transition,
          b.transitionDurationMs || 0,
          b.keyword || null,
          b.keywordEnabled ? 1 : 0,
          b.videoEffect || 'none',
          b.inAnimation || 'NONE',
          b.outAnimation || 'NONE',
          b.inAnimationDurationMs ?? 400,
          b.outAnimationDurationMs ?? 400,
          b.scriptText || null
        );
      }
    });

    transaction(beats);
  }

  static update(id: string, updates: Partial<VisualBeat>): VisualBeat | null {
    const db = getDb();
    const existing = this.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    db.prepare(`
      UPDATE visual_beats SET
        start_offset_ms = ?,
        end_offset_ms = ?,
        duration_ms = ?,
        shot_type = ?,
        visual_concept = ?,
        environment_description = ?,
        image_prompt = ?,
        image_path = ?,
        generation_status = ?,
        motion = ?,
        transition = ?,
        transition_duration_ms = ?,
        keyword = ?,
        keyword_enabled = ?,
        video_effect = ?,
        in_animation = ?,
        out_animation = ?,
        in_animation_duration_ms = ?,
        out_animation_duration_ms = ?,
        script_text = ?
      WHERE id = ?
    `).run(
      merged.startOffsetMs,
      merged.endOffsetMs,
      merged.durationMs,
      merged.shotType,
      merged.visualConcept,
      merged.environmentDescription,
      merged.imagePrompt,
      merged.imagePath || null,
      merged.generationStatus,
      merged.motion,
      merged.transition,
      merged.transitionDurationMs || 0,
      merged.keyword || null,
      merged.keywordEnabled ? 1 : 0,
      merged.videoEffect || 'none',
      merged.inAnimation || 'NONE',
      merged.outAnimation || 'NONE',
      merged.inAnimationDurationMs ?? 400,
      merged.outAnimationDurationMs ?? 400,
      merged.scriptText || null,
      id
    );

    return this.getById(id);
  }

  static deleteBySceneId(sceneId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM visual_beats WHERE scene_id = ?').run(sceneId);
  }

  static deleteByProjectId(projectId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM visual_beats WHERE project_id = ?').run(projectId);
  }

  private static mapRow(r: any): VisualBeat {
    return {
      id: r.id,
      sceneId: r.scene_id,
      projectId: r.project_id,
      beatIndex: r.beat_index,
      startOffsetMs: r.start_offset_ms,
      endOffsetMs: r.end_offset_ms,
      durationMs: r.duration_ms,
      shotType: r.shot_type as VisualShotType,
      visualConcept: r.visual_concept,
      environmentDescription: r.environment_description,
      imagePrompt: r.image_prompt,
      imagePath: r.image_path || undefined,
      generationStatus: r.generation_status,
      motion: r.motion,
      transition: r.transition,
      transitionDurationMs: r.transition_duration_ms || 0,
      keyword: r.keyword || undefined,
      keywordEnabled: Boolean(r.keyword_enabled),
      videoEffect: r.video_effect || 'none',
      inAnimation: (r.in_animation as any) || 'NONE',
      outAnimation: (r.out_animation as any) || 'NONE',
      inAnimationDurationMs: r.in_animation_duration_ms ?? 400,
      outAnimationDurationMs: r.out_animation_duration_ms ?? 400,
      scriptText: r.script_text || undefined
    };
  }
}
