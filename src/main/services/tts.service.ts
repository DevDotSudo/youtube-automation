import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { TimingService } from './timing.service';

const execFileAsync = util.promisify(execFile);

export class TTSService {
  /**
   * Safely writes/overwrites a file with retry logic to avoid Windows EBUSY file-lock errors.
   */
  static async safeCopyOrOverwrite(sourcePath: string, destPath: string, maxRetries = 5): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        fs.copyFileSync(sourcePath, destPath);
        return;
      } catch (err: any) {
        if (err.code === 'EBUSY' && attempt < maxRetries) {
          console.warn(`[TTSService] File locked: ${destPath}, retrying in 350ms (attempt ${attempt}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, 350));
        } else {
          throw err;
        }
      }
    }
  }

  /**
   * Resolves any voice identifier to the highest-quality human Multilingual Neural voice.
   */
  static resolveVoice(voice?: string): string {
    if (!voice) return 'en-US-AndrewMultilingualNeural';
    if (voice.includes('MultilingualNeural') || voice.includes('Neural')) {
      if (voice === 'en-US-ChristopherNeural') return 'en-US-AndrewMultilingualNeural';
      return voice;
    }

    const aliasMap: Record<string, string> = {
      bm_george: 'en-GB-RyanNeural',
      bm_fable: 'en-GB-ThomasNeural',
      bm_lewis: 'en-GB-RyanNeural',
      bm_daniel: 'en-GB-ThomasNeural',
      af_heart: 'en-US-AvaMultilingualNeural',
      af_bella: 'en-US-AvaMultilingualNeural',
      af_nicole: 'en-US-AvaMultilingualNeural',
      af_sarah: 'en-US-AvaMultilingualNeural',
      af_sky: 'en-US-EmmaNeural',
      af_river: 'en-US-EmmaNeural',
      am_adam: 'en-US-AndrewMultilingualNeural',
      am_michael: 'en-US-BrianMultilingualNeural',
      am_onyx: 'en-US-BrianMultilingualNeural',
      am_echo: 'en-US-AndrewMultilingualNeural',
      am_eric: 'en-US-GuyNeural',
      am_liam: 'en-US-AndrewMultilingualNeural',
      bf_emma: 'en-GB-SoniaNeural',
      bf_isabella: 'en-GB-SoniaNeural',
      bf_alice: 'en-GB-SoniaNeural',
      bf_lily: 'en-GB-SoniaNeural'
    };

    return aliasMap[voice] || 'en-US-AndrewMultilingualNeural';
  }

  /**
   * Synthesizes expressive, human-like narration using Microsoft's premier Neural voices.
   * Features:
   * - Flagship Multilingual Neural models (AndrewMultilingual, AvaMultilingual, BrianMultilingual, Emma)
   * - Expressive storytelling prosody pacing (-4% natural speaking rate for storytelling weight)
   * - Studio acoustic EQ mastering (subtle proximity bass warmth, de-harshness, broadcast leveling)
   * 100% Free, zero API keys, no local model downloads.
   */
  static async generateEdgeTTS(
    text: string,
    voice: string,
    outputWavPath: string,
    speed: number = 1.0,
    maxRetries: number = 3
  ): Promise<string> {
    const cleanVoice = this.resolveVoice(voice);
    let lastErr: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const tempDir = path.join(
        path.dirname(outputWavPath),
        `edge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      );
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
        const tts = new MsEdgeTTS();
        await tts.setMetadata(cleanVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

        const ratePercent = speed !== 1.0 ? Math.round((speed - 1.0) * 100) : -4;
        const rateString = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

        const result = await tts.toFile(tempDir, text.trim(), {
          rate: rateString,
          pitch: '+0Hz',
          volume: '+0%'
        });

        const mp3Path = result.audioFilePath;
        if (!fs.existsSync(mp3Path) || fs.statSync(mp3Path).size < 100) {
          throw new Error('Edge TTS returned empty or invalid audio data');
        }

        // Studio mastering chain: warmth EQ, de-harshness filter, broadcast presence limiter
        const studioFilter =
          'equalizer=f=220:width_type=o:width=1.2:g=1.5,' +
          'equalizer=f=6000:width_type=o:width=1.5:g=-1.0,' +
          'compand=attacks=0.02:decays=0.2:points=-80/-80|-24/-20|0/-3:gain=1.5,' +
          'aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo';

        await execFileAsync('ffmpeg', [
          '-y',
          '-i', mp3Path,
          '-af', studioFilter,
          '-c:a', 'pcm_s16le',
          outputWavPath
        ]);

        return outputWavPath;
      } catch (err: any) {
        lastErr = err;
        console.warn(`[TTSService] Edge TTS attempt ${attempt}/${maxRetries} failed: ${err.message || err}`);
        if (attempt < maxRetries) {
          const delayMs = attempt * 1500;
          await new Promise((r) => setTimeout(r, delayMs));
        }
      } finally {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {}
      }
    }

    throw lastErr || new Error('Edge TTS synthesis failed after maximum retries');
  }

  static async generateSceneNarration(
    text: string,
    voice: string,
    sceneDir: string,
    _targetDurationMs?: number,
    speed: number = 1.0
  ): Promise<{ finalWavPath: string; durationMs: number; needsReview: boolean }> {
    fs.mkdirSync(sceneDir, { recursive: true });
    const rawPath = path.join(sceneDir, 'voice.raw.wav');
    const finalPath = path.join(sceneDir, 'voice.wav');

    // 1. Generate Raw WAV: Premier Multilingual Neural Voice with expressive storytelling pacing & studio mastering
    await this.generateEdgeTTS(text, voice, rawPath, speed);

    // 2. Add natural 300ms breath transition between scenes and format to 48kHz stereo PCM
    const rawDurationMs = await TimingService.getAudioDurationMs(rawPath);
    const naturalDurationMs = (rawDurationMs || 3000) + 300;
    const padSec = 0.3;

    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', rawPath,
        '-af', `apad=pad_dur=${padSec.toFixed(3)},aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo`,
        '-c:a', 'pcm_s16le',
        finalPath
      ]);
    } catch (err) {
      console.warn('[TTSService] ffmpeg apad failed, copying raw:', err);
      fs.copyFileSync(rawPath, finalPath);
    }

    const exactDurationMs = await TimingService.getAudioDurationMs(finalPath);

    return {
      finalWavPath: finalPath,
      durationMs: exactDurationMs || naturalDurationMs,
      needsReview: false
    };
  }

  /**
   * Synthesizes the full narrative script as 1 continuous, uncut audio stream.
   * Does NOT cut or fragment the text. Uses safe atomic write to prevent Windows EBUSY locks.
   */
  static async generateUncutContinuousNarration(
    fullScript: string,
    voice: string,
    outputWavPath: string,
    speed: number = 1.0
  ): Promise<{ finalWavPath: string; totalDurationMs: number }> {
    fs.mkdirSync(path.dirname(outputWavPath), { recursive: true });
    const rawTempPath = outputWavPath + '.raw.tmp.wav';
    const normTempPath = outputWavPath + '.norm.tmp.wav';

    try {
      console.log(`[TTSService] Synthesizing UNCUT continuous narration (${fullScript.length} chars, voice: ${voice})...`);
      // Synthesize with Premier Multilingual Neural Voice and studio mastering
      await this.generateEdgeTTS(fullScript, voice, rawTempPath, speed);

      // 2. Normalize to standard 48kHz stereo 16-bit PCM WAV
      try {
        await execFileAsync('ffmpeg', [
          '-y',
          '-i', rawTempPath,
          '-af', 'aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo',
          '-c:a', 'pcm_s16le',
          normTempPath
        ]);
        if (fs.existsSync(normTempPath) && fs.statSync(normTempPath).size > 1000) {
          await this.safeCopyOrOverwrite(normTempPath, outputWavPath);
        } else {
          await this.safeCopyOrOverwrite(rawTempPath, outputWavPath);
        }
      } catch (normErr) {
        console.warn('[TTSService] ffmpeg normalization warning, using raw audio:', normErr);
        await this.safeCopyOrOverwrite(rawTempPath, outputWavPath);
      }
    } finally {
      // Clean up temp files
      try { if (fs.existsSync(rawTempPath)) fs.unlinkSync(rawTempPath); } catch {}
      try { if (fs.existsSync(normTempPath)) fs.unlinkSync(normTempPath); } catch {}
    }

    const totalDurationMs = await TimingService.getAudioDurationMs(outputWavPath);
    return { finalWavPath: outputWavPath, totalDurationMs: totalDurationMs || 10000 };
  }

  static async buildMasterContinuousVoice(
    sceneWavPaths: string[],
    outputMasterPath: string
  ): Promise<string> {
    fs.mkdirSync(path.dirname(outputMasterPath), { recursive: true });
    const listFile = outputMasterPath + '.txt';
    const validPaths = sceneWavPaths.filter((p) => fs.existsSync(p) && fs.statSync(p).size > 500);

    if (validPaths.length === 0) {
      throw new Error('No valid audio files to concatenate into master voice');
    }

    const fileEntries = validPaths
      .map((p) => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');

    fs.writeFileSync(listFile, fileEntries, 'utf8');

    const tempConcat = outputMasterPath + '.concat.tmp.wav';
    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', listFile,
        '-af', 'aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo',
        '-c:a', 'pcm_s16le',
        tempConcat
      ]);
      await this.safeCopyOrOverwrite(tempConcat, outputMasterPath);
    } finally {
      try { if (fs.existsSync(listFile)) fs.unlinkSync(listFile); } catch {}
      try { if (fs.existsSync(tempConcat)) fs.unlinkSync(tempConcat); } catch {}
    }

    return outputMasterPath;
  }
}