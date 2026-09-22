import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { app } from 'electron';
import { TimingService } from './timing.service';

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
   * Features automatic fallback to heuristic proportional timing if Python/Whisper is unavailable.
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

    // Direct call to Whisper CLI alignment with graceful fallback
    return await this.callCliAutoCaption(audioPath, payloadScenes, projectRoot);
  }

  private static getScriptPath(): string {
    const candidateRoots: string[] = [];

    try {
      if (app && typeof app.getAppPath === 'function') {
        candidateRoots.push(app.getAppPath());
        candidateRoots.push(path.join(app.getAppPath(), '..'));
      }
    } catch {}

    if (process.resourcesPath) {
      candidateRoots.push(process.resourcesPath);
      candidateRoots.push(path.join(process.resourcesPath, 'app.asar.unpacked'));
    }

    candidateRoots.push(process.cwd());
    candidateRoots.push(path.resolve(__dirname, '..', '..', '..'));
    candidateRoots.push(path.resolve(__dirname, '..', '..'));

    for (const r of candidateRoots) {
      const p = path.join(r, 'services', 'transcription', 'transcribe.py');
      if (fs.existsSync(p)) return p;
    }

    return path.join(process.cwd(), 'services', 'transcription', 'transcribe.py');
  }

  private static async getPythonCommand(): Promise<string[]> {
    if (process.env.PYTHON_PATH) {
      return [process.env.PYTHON_PATH];
    }

    const candidates: string[][] = [
      ['py', '-3.13'],
      ['py', '-3'],
      ['python3'],
      ['python']
    ];

    for (const cmd of candidates) {
      try {
        await execFileAsync(cmd[0], [...cmd.slice(1), '--version'], { timeout: 3000 });
        return cmd;
      } catch {}
    }

    return ['python'];
  }

  private static async generateHeuristicAlignment(
    audioPath: string,
    payloadScenes: any[]
  ): Promise<AutoCaptionResult> {
    console.warn('[AutoCaptionService] Engaging resilient proportional timing fallback for audio timeline...');
    const measuredDuration = await TimingService.getAudioDurationMs(audioPath);
    const totalDurationMs = measuredDuration > 0 ? measuredDuration : 10000;

    const totalChars = payloadScenes.reduce((sum, s) => sum + (s.text || '').length, 0) || 1;
    let curStartMs = 0;

    const scenes: AlignedScene[] = payloadScenes.map((s, idx) => {
      const charLen = (s.text || '').length || 1;
      const ratio = charLen / totalChars;
      const isLast = idx === payloadScenes.length - 1;
      const durationMs = isLast
        ? Math.max(1000, totalDurationMs - curStartMs)
        : Math.max(1000, Math.round(ratio * totalDurationMs));
      const startMs = curStartMs;
      const endMs = startMs + durationMs;
      curStartMs = endMs;

      const rawWords = (s.text || '').split(/\s+/).filter(Boolean);
      const wordCount = rawWords.length;
      const wordDuration = wordCount > 0 ? durationMs / wordCount : durationMs;

      const words: AlignedWord[] = rawWords.map((w: string, wIdx: number) => ({
        word: w,
        startMs: Math.round(startMs + wIdx * wordDuration),
        endMs: Math.round(startMs + (wIdx + 1) * wordDuration),
        prob: 0.95
      }));

      return {
        id: s.id || '',
        sceneIndex: s.index || (idx + 1),
        scriptText: s.text || '',
        startMs,
        endMs,
        durationMs,
        speechStartMs: startMs,
        speechEndMs: endMs,
        words
      };
    });

    return {
      totalDurationMs,
      scenes,
      segments: scenes.map((sc) => ({ startMs: sc.startMs, endMs: sc.endMs, text: sc.scriptText }))
    };
  }

  private static async callCliAutoCaption(
    audioPath: string,
    payloadScenes: any[],
    _projectRoot?: string
  ): Promise<AutoCaptionResult> {
    const scriptPath = this.getScriptPath();
    const tempJson = path.join(path.dirname(audioPath), `scenes_align_${Date.now()}.json`);

    try {
      if (!fs.existsSync(scriptPath)) {
        console.warn(`[AutoCaptionService] Script transcribe.py not found at: ${scriptPath}`);
        return await this.generateHeuristicAlignment(audioPath, payloadScenes);
      }

      fs.writeFileSync(tempJson, JSON.stringify(payloadScenes), 'utf8');
      const pyCmd = await this.getPythonCommand();

      const { stdout, stderr } = await execFileAsync(
        pyCmd[0],
        [...pyCmd.slice(1), scriptPath, '--audio', audioPath, '--scenes', tempJson],
        {
          maxBuffer: 20 * 1024 * 1024,
          timeout: 180000
        }
      );

      if (stderr && stderr.includes('Traceback')) {
        console.warn('[AutoCaptionService CLI Stderr]', stderr);
      }

      // Find JSON block in stdout
      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        console.warn(`[AutoCaptionService] No valid JSON in Whisper output. Falling back to heuristic timing.`);
        return await this.generateHeuristicAlignment(audioPath, payloadScenes);
      }

      const jsonStr = stdout.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      return this.normalizeResult(parsed);
    } catch (cliErr) {
      console.warn('[AutoCaptionService] Whisper alignment error, engaging heuristic fallback:', cliErr);
      return await this.generateHeuristicAlignment(audioPath, payloadScenes);
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
