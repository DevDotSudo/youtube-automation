import { getDb } from '../database';
import { Scene, AssetStatus, ApprovalStatus, MotionType, TransitionType } from '../../../shared/types';

export class SceneRepository {
  static listByProjectId(projectId: string): Scene[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_index ASC').all(projectId) as any[];
    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      sceneIndex: r.scene_index,
      startMs: r.start_ms,
      endMs: r.end_ms,
      durationMs: r.duration_ms,
      scriptText: r.script_text,
      imagePrompt: r.image_prompt,
      overlayText: r.overlay_text || '',
      captionText: r.caption_text !== undefined && r.caption_text !== null ? r.caption_text : r.script_text,
      captionEnabled: r.caption_enabled !== undefined && r.caption_enabled !== null ? Boolean(r.caption_enabled) : true,
      imagePath: r.image_path,
      imageStatus: r.image_status as AssetStatus,
      audioPath: r.audio_path,
      audioDurationMs: r.audio_duration_ms,
      audioStatus: r.audio_status as AssetStatus,
      voiceId: r.voice_id,
      voiceSpeed: r.voice_speed,
      motionType: (r.motion_type as MotionType) || MotionType.STATIC,
      transitionType: (r.transition_type as TransitionType) || TransitionType.CUT,
      transitionDurationMs: r.transition_duration_ms || 150,
      approvalStatus: r.approval_status as ApprovalStatus,
      errorMessage: r.error_message,
      words: r.words_json ? JSON.parse(r.words_json) : undefined,
      speechStartMs: r.speech_start_ms !== null && r.speech_start_ms !== undefined ? r.speech_start_ms : undefined,
      speechEndMs: r.speech_end_ms !== null && r.speech_end_ms !== undefined ? r.speech_end_ms : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  static getById(id: string): Scene | null {
    const db = getDb();
    const r = db.prepare('SELECT * FROM scenes WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      projectId: r.project_id,
      sceneIndex: r.scene_index,
      startMs: r.start_ms,
      endMs: r.end_ms,
      durationMs: r.duration_ms,
      scriptText: r.script_text,
      imagePrompt: r.image_prompt,
      overlayText: r.overlay_text || '',
      captionText: r.caption_text !== undefined && r.caption_text !== null ? r.caption_text : r.script_text,
      captionEnabled: r.caption_enabled !== undefined && r.caption_enabled !== null ? Boolean(r.caption_enabled) : true,
      imagePath: r.image_path,
      imageStatus: r.image_status as AssetStatus,
      audioPath: r.audio_path,
      audioDurationMs: r.audio_duration_ms,
      audioStatus: r.audio_status as AssetStatus,
      voiceId: r.voice_id,
      voiceSpeed: r.voice_speed,
      motionType: (r.motion_type as MotionType) || MotionType.STATIC,
      transitionType: (r.transition_type as TransitionType) || TransitionType.CUT,
      transitionDurationMs: r.transition_duration_ms || 150,
      approvalStatus: r.approval_status as ApprovalStatus,
      errorMessage: r.error_message,
      words: r.words_json ? JSON.parse(r.words_json) : undefined,
      speechStartMs: r.speech_start_ms !== null && r.speech_start_ms !== undefined ? r.speech_start_ms : undefined,
      speechEndMs: r.speech_end_ms !== null && r.speech_end_ms !== undefined ? r.speech_end_ms : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  static createMany(scenes: Scene[]): void {
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO scenes (
        id, project_id, scene_index, start_ms, end_ms, duration_ms, script_text,
        image_prompt, overlay_text, caption_text, caption_enabled, image_path, image_status,
        audio_path, audio_duration_ms, audio_status, voice_id, voice_speed, motion_type,
        transition_type, transition_duration_ms, approval_status, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction((items: Scene[]) => {
      for (const s of items) {
        insert.run(
          s.id,
          s.projectId,
          s.sceneIndex,
          s.startMs,
          s.endMs,
          s.durationMs,
          s.scriptText,
          s.imagePrompt,
          s.overlayText || '',
          s.captionText || s.scriptText,
          s.captionEnabled !== false ? 1 : 0,
          s.imagePath || null,
          s.imageStatus,
          s.audioPath || null,
          s.audioDurationMs || null,
          s.audioStatus,
          s.voiceId || null,
          s.voiceSpeed,
          s.motionType || 'STATIC',
          s.transitionType || 'CUT',
          s.transitionDurationMs || 150,
          s.approvalStatus,
          s.errorMessage || null,
          s.createdAt,
          s.updatedAt
        );
      }
    });

    tx(scenes);
  }

  static update(id: string, patch: Partial<Scene>): void {
    const db = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (patch.startMs !== undefined) { fields.push('start_ms = ?'); values.push(patch.startMs); }
    if (patch.endMs !== undefined) { fields.push('end_ms = ?'); values.push(patch.endMs); }
    if (patch.durationMs !== undefined) { fields.push('duration_ms = ?'); values.push(patch.durationMs); }
    if (patch.scriptText !== undefined) { fields.push('script_text = ?'); values.push(patch.scriptText); }
    if (patch.imagePrompt !== undefined) { fields.push('image_prompt = ?'); values.push(patch.imagePrompt); }
    if (patch.overlayText !== undefined) { fields.push('overlay_text = ?'); values.push(patch.overlayText); }
    if (patch.captionText !== undefined) { fields.push('caption_text = ?'); values.push(patch.captionText); }
    if (patch.captionEnabled !== undefined) { fields.push('caption_enabled = ?'); values.push(patch.captionEnabled ? 1 : 0); }
    if (patch.imagePath !== undefined) { fields.push('image_path = ?'); values.push(patch.imagePath); }
    if (patch.imageStatus !== undefined) { fields.push('image_status = ?'); values.push(patch.imageStatus); }
    if (patch.audioPath !== undefined) { fields.push('audio_path = ?'); values.push(patch.audioPath); }
    if (patch.audioDurationMs !== undefined) { fields.push('audio_duration_ms = ?'); values.push(patch.audioDurationMs); }
    if (patch.audioStatus !== undefined) { fields.push('audio_status = ?'); values.push(patch.audioStatus); }
    if (patch.voiceId !== undefined) { fields.push('voice_id = ?'); values.push(patch.voiceId); }
    if (patch.voiceSpeed !== undefined) { fields.push('voice_speed = ?'); values.push(patch.voiceSpeed); }
    if (patch.motionType !== undefined) { fields.push('motion_type = ?'); values.push(patch.motionType); }
    if (patch.transitionType !== undefined) { fields.push('transition_type = ?'); values.push(patch.transitionType); }
    if (patch.transitionDurationMs !== undefined) { fields.push('transition_duration_ms = ?'); values.push(patch.transitionDurationMs); }
    if (patch.approvalStatus !== undefined) { fields.push('approval_status = ?'); values.push(patch.approvalStatus); }
    if (patch.errorMessage !== undefined) { fields.push('error_message = ?'); values.push(patch.errorMessage); }
    if (patch.words !== undefined) { fields.push('words_json = ?'); values.push(patch.words ? JSON.stringify(patch.words) : null); }
    if (patch.speechStartMs !== undefined) { fields.push('speech_start_ms = ?'); values.push(patch.speechStartMs); }
    if (patch.speechEndMs !== undefined) { fields.push('speech_end_ms = ?'); values.push(patch.speechEndMs); }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE scenes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  static approveAllByProjectId(projectId: string): Scene[] {
    const db = getDb();
    db.prepare("UPDATE scenes SET approval_status = 'APPROVED', updated_at = ? WHERE project_id = ?").run(
      new Date().toISOString(),
      projectId
    );
    return this.listByProjectId(projectId);
  }

  static deleteByProjectId(projectId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM scenes WHERE project_id = ?').run(projectId);
  }
}
