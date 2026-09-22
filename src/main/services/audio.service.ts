import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { ONLINE_BGM_TRACKS } from '../../shared/constants';

const execFileAsync = util.promisify(execFile);

export interface BGMTrackInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  filePath: string;
  streamUrl: string;
}

export class AudioService {
  /**
   * Provides 100% royalty-free public domain online BGM streams (Incompetech / Kevin MacLeod).
   * Zero local audio file downloads, zero API keys required.
   */
  static async ensureDefaultBgmTracks(): Promise<BGMTrackInfo[]> {
    return ONLINE_BGM_TRACKS.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      filePath: t.streamUrl,
      streamUrl: t.streamUrl
    }));
  }

  /**
   * Mixes master narration voice with ambient BGM using dynamic sidechain ducking.
   * When voiceover is active, BGM volume automatically ducks to -18dB (or specified level).
   * Supports both direct HTTPS audio streams and local files seamlessly.
   */
  static async mixNarrationAndBgm(
    voiceWavPath: string,
    bgmPath: string,
    outputMasterPath: string,
    duckingRatio: number = 6,
    bgmVolume: number = 0.16
  ): Promise<string> {
    if (!fs.existsSync(voiceWavPath)) {
      throw new Error(`Voice track missing: ${voiceWavPath}`);
    }

    const isOnline = bgmPath && (bgmPath.startsWith('http://') || bgmPath.startsWith('https://'));
    if (!bgmPath || (!isOnline && !fs.existsSync(bgmPath))) {
      // If no valid BGM provided, copy voice track directly
      fs.copyFileSync(voiceWavPath, outputMasterPath);
      return outputMasterPath;
    }

    fs.mkdirSync(path.dirname(outputMasterPath), { recursive: true });

    // Sidechain compression: Input 0 = Voice (Control), Input 1 = BGM (Target)
    const filterComplex = `[1:a]aloop=loop=-1:size=2e+09,volume=${bgmVolume.toFixed(2)}[bgm];` +
      `[bgm][0:a]sidechaincompress=threshold=0.06:ratio=${duckingRatio}:attack=180:release=750[ducked_bgm];` +
      `[0:a][ducked_bgm]amix=inputs=2:duration=first:dropout_transition=2,aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo[outa]`;

    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', voiceWavPath,
        '-i', bgmPath,
        '-filter_complex', filterComplex,
        '-map', '[outa]',
        '-c:a', 'pcm_s16le',
        outputMasterPath
      ]);
    } catch (err) {
      console.warn('[AudioService] Sidechain ducking failed, falling back to simple volume mix:', err);
      // Fallback simple mix
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', voiceWavPath,
        '-i', bgmPath,
        '-filter_complex', `[1:a]aloop=loop=-1:size=2e+09,volume=0.10[b];[0:a][b]amix=inputs=2:duration=first`,
        '-c:a', 'pcm_s16le',
        outputMasterPath
      ]);
    }

    return outputMasterPath;
  }
}