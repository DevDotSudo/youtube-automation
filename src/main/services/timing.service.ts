import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';

const execFileAsync = util.promisify(execFile);

export class TimingService {
  /**
   * Measure audio duration in milliseconds.
   * For standard PCM WAV files, computes duration directly from the RIFF header in <1ms without subprocess overhead.
   * Falls back to ffprobe for other formats or if header parsing fails.
   */
  static async getAudioDurationMs(filePath: string): Promise<number> {
    if (!fs.existsSync(filePath)) return 0;

    // Fast-path: parse RIFF WAV header directly in memory (<0.1ms, zero child process)
    if (filePath.toLowerCase().endsWith('.wav')) {
      try {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(1024);
        const bytesRead = fs.readSync(fd, buf, 0, 1024, 0);
        fs.closeSync(fd);

        if (bytesRead >= 44 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') {
          let pos = 12;
          let byteRate = 0;
          let dataSize = 0;
          while (pos < bytesRead - 8) {
            const chunkId = buf.toString('ascii', pos, pos + 4);
            const chunkSize = buf.readUInt32LE(pos + 4);
            if (chunkId === 'fmt ') {
              byteRate = buf.readUInt32LE(pos + 16);
            } else if (chunkId === 'data') {
              dataSize = chunkSize;
              break;
            }
            pos += 8 + chunkSize;
          }
          if (byteRate > 0 && dataSize > 0) {
            return Math.round((dataSize / byteRate) * 1000);
          }
        }
      } catch {
        // Fall back to ffprobe on any parsing error
      }
    }

    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
      ]);
      const sec = parseFloat(stdout.trim());
      if (isNaN(sec)) return 0;
      return Math.round(sec * 1000);
    } catch (err) {
      console.error('[TimingService] ffprobe error:', err);
      return 0;
    }
  }

  /**
   * Aligns raw audio to exact target milliseconds:
   * - Adjusts tempo slightly if necessary (0.92x to 1.08x)
   * - Trims or pads silence so duration exactly matches targetDurationMs
   * - Normalizes output to 48kHz PCM WAV
   */
  static async alignAudio(
    rawWavPath: string,
    outputWavPath: string,
    targetDurationMs: number
  ): Promise<{ exactDurationMs: number; needsReview: boolean }> {
    const rawDurationMs = await this.getAudioDurationMs(rawWavPath);
    const targetSec = targetDurationMs / 1000;
    const targetSpeechSec = Math.max(0.5, targetSec - 0.10);
    const rawSec = rawDurationMs / 1000;

    let filter = 'aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo';
    let needsReview = false;

    if (rawSec > 0 && targetSpeechSec > 0) {
      const requiredSpeed = rawSec / targetSpeechSec;
      if (requiredSpeed >= 0.92 && requiredSpeed <= 1.08 && Math.abs(requiredSpeed - 1.0) > 0.02) {
        // Speed within safe natural documentary speech range
        filter += `,atempo=${requiredSpeed.toFixed(4)}`;
      } else if (requiredSpeed < 0.92 || requiredSpeed > 1.08) {
        needsReview = true;
      }
    }

    // Pad with silence to match exact target duration
    filter += `,apad=whole_dur=${targetSec.toFixed(3)},atrim=end=${targetSec.toFixed(3)}`;

    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', rawWavPath,
        '-filter_complex', filter,
        '-c:a', 'pcm_s16le',
        outputWavPath
      ]);

      const finalDurationMs = await this.getAudioDurationMs(outputWavPath);
      return { exactDurationMs: finalDurationMs || targetDurationMs, needsReview };
    } catch (err) {
      console.error('[TimingService] ffmpeg align error:', err);
      // Fallback: copy raw
      fs.copyFileSync(rawWavPath, outputWavPath);
      return { exactDurationMs: rawDurationMs, needsReview: true };
    }
  }
}
