import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

export interface AlignedWord {
  word: string;
  startMs: number;
  endMs: number;
  prob?: number;
}

export interface AlignedScene {
  id: string;
  sceneIndex: number;
  scriptText: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  speechStartMs: number;
  speechEndMs: number;
  words: AlignedWord[];
}

export interface AutoCaptionResult {
  totalDurationMs: number;
  scenes: AlignedScene[];
  segments?: Array<{ startMs: number; endMs: number; text: string }>;
}

export class AutoCaptionService {
  /**
   * Aligns unbroken speech audio with script scenes using faster-whisper.
   * Extracts millisecond-accurate startMs, endMs, durationMs, and words for each scene.
   * Tries HTTP sidecar first (port 8880), with CLI fallback.
   */
  static async alignScenesToAudio(
    audioPath: string,
    scenes: Array<{ id: string; sceneIndex: number; scriptText: string }>,
    projectRoot?: string
  ): Promise<AutoCaptionResult> {
    if (!fs.existsSync(audioPath)) {
      throw new Error(`AutoCaptionService: Audio file not found at: ${audioPath}`);
    }

    const payloadScenes = scenes.map((s) => ({
      id: s.id,
      index: s.sceneIndex,
      text: s.scriptText
    }));

    // 1. Try Kokoro HTTP sidecar (/autocaption)
    try {
      return await this.callHttpAutoCaption(audioPath, payloadScenes);
    } catch (httpErr: any) {
      console.warn(`[AutoCaptionService] HTTP /autocaption failed (${httpErr.message}), trying CLI fallback...`);
      return await this.callCliAutoCaption(audioPath, payloadScenes, projectRoot);
    }
  }

  private static async callHttpAutoCaption(
    audioPath: string,
    payloadScenes: any[]
  ): Promise<AutoCaptionResult> {
    const payload = JSON.stringify({
      audio_path: audioPath,
      scenes: payloadScenes,
      model_size: 'tiny.en'
    });

    const options = {
      hostname: '127.0.0.1',
      port: 8880,
      path: '/autocaption',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 120000 // 2 minutes timeout
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Server returned ${res.statusCode}: ${body}`));
            return;
          }
          try {
            const parsed = JSON.parse(body);
            resolve(this.normalizeResult(parsed));
          } catch (e: any) {
            reject(new Error(`Failed to parse autocaption JSON response: ${e.message}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('HTTP /autocaption request timed out'));
      });

      req.write(payload);
      req.end();
    });
  }

  private static async callCliAutoCaption(
    audioPath: string,
    payloadScenes: any[],
    projectRoot?: string
  ): Promise<AutoCaptionResult> {
    const root = projectRoot || process.cwd();
    const scriptPath = path.join(root, 'services', 'kokoro', 'transcribe.py');
    const tempJson = path.join(path.dirname(audioPath), `scenes_align_${Date.now()}.json`);

    try {
      fs.writeFileSync(tempJson, JSON.stringify(payloadScenes), 'utf8');

      const { stdout, stderr } = await execFileAsync('py', [
        '-3.13',
        scriptPath,
        '--audio', audioPath,
        '--scenes', tempJson
      ], {
        maxBuffer: 20 * 1024 * 1024,
        timeout: 180000
      });

      if (stderr && stderr.includes('Traceback')) {
        console.warn('[AutoCaptionService CLI Stderr]', stderr);
      }

      // Find JSON block in stdout
      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error(`No JSON found in transcribe.py output: ${stdout}`);
      }

      const jsonStr = stdout.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      return this.normalizeResult(parsed);
    } finally {
      try {
        if (fs.existsSync(tempJson)) fs.unlinkSync(tempJson);
      } catch {}
    }
  }

  private static normalizeResult(raw: any): AutoCaptionResult {
    const scenes: AlignedScene[] = (raw.scenes || []).map((s: any) => ({
      id: s.id || '',
      sceneIndex: s.index || 1,
      scriptText: s.text || '',
      startMs: s.start_ms ?? 0,
      endMs: s.end_ms ?? 0,
      durationMs: s.duration_ms ?? 0,
      speechStartMs: s.speech_start_ms ?? s.start_ms ?? 0,
      speechEndMs: s.speech_end_ms ?? s.end_ms ?? 0,
      words: (s.words || []).map((w: any) => ({
        word: w.word || '',
        startMs: w.start_ms ?? 0,
        endMs: w.end_ms ?? 0,
        prob: w.prob
      }))
    }));

    return {
      totalDurationMs: raw.total_duration_ms || (scenes.length > 0 ? scenes[scenes.length - 1].endMs : 0),
      scenes,
      segments: (raw.segments || []).map((seg: any) => ({
        startMs: seg.start_ms ?? 0,
        endMs: seg.end_ms ?? 0,
        text: seg.text || ''
      }))
    };
  }
}
