import { ParsedScene, ParseResult } from '../../shared/types';

export class ScriptParserService {
  /**
   * Parse timestamp string into milliseconds.
   * Supports:
   *  - mm:ss.SSS (e.g. "00:03.500")
   *  - hh:mm:ss.SSS or hh:mm:ss,SSS (e.g. "00:00:03.500" or SRT "00:00:03,500")
   */
  static parseTimeToMs(str: string): number | null {
    str = str.trim().replace(',', '.');
    const parts = str.split(':');
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const sec = parseFloat(parts[1]);
      if (isNaN(min) || isNaN(sec)) return null;
      return Math.round((min * 60 + sec) * 1000);
    } else if (parts.length === 3) {
      const hr = parseInt(parts[0], 10);
      const min = parseInt(parts[1], 10);
      const sec = parseFloat(parts[2]);
      if (isNaN(hr) || isNaN(min) || isNaN(sec)) return null;
      return Math.round((hr * 3600 + min * 60 + sec) * 1000);
    }
    return null;
  }

  static parseScript(rawContent: string): ParseResult {
    const scenes: ParsedScene[] = [];
    const warnings: string[] = [];

    // Regex matching timestamp range: e.g. 00:00.000 --> 00:05.000 or 00:00:00,000 --> 00:00:05,000
    const tsRegex = /((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)/g;

    const matches: Array<{ startStr: string; endStr: string; matchIndex: number; matchEnd: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = tsRegex.exec(rawContent)) !== null) {
      matches.push({
        startStr: m[1],
        endStr: m[2],
        matchIndex: m.index,
        matchEnd: m.index + m[0].length
      });
    }

    if (matches.length > 0) {
      for (let idx = 0; idx < matches.length; idx++) {
        const cur = matches[idx];
        const next = matches[idx + 1];

        const startMs = this.parseTimeToMs(cur.startStr);
        const endMs = this.parseTimeToMs(cur.endStr);
        const sceneIndex = idx + 1;

        if (startMs === null || endMs === null) {
          warnings.push(`Scene ${sceneIndex}: Invalid timestamp range: "${cur.startStr} --> ${cur.endStr}"`);
          continue;
        }

        if (endMs <= startMs) {
          warnings.push(`Scene ${sceneIndex}: End time (${cur.endStr}) must be greater than start time (${cur.startStr})`);
        }

        // Text between end of this timestamp and start of next timestamp (or end of file)
        const rawSegment = rawContent.substring(cur.matchEnd, next ? next.matchIndex : rawContent.length);

        // Strip leading/trailing whitespace, SRT numerical indices, etc.
        const cleanLines = rawSegment
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !/^\d+$/.test(l));

        const narrationText = cleanLines.join(' ').trim();

        if (!narrationText) {
          warnings.push(`Scene ${sceneIndex}: Missing narration text for timestamp range "${cur.startStr} --> ${cur.endStr}"`);
        }

        const durationMs = Math.max(0, endMs - startMs);

        // Pacing checks: 4 to 6s target for explainer
        if (durationMs < 1000) {
          warnings.push(`Scene ${sceneIndex}: Duration (${(durationMs / 1000).toFixed(1)}s) is below 1.0s minimum`);
        } else if (durationMs > 8000) {
          warnings.push(`Scene ${sceneIndex}: Duration (${(durationMs / 1000).toFixed(1)}s) exceeds target 4-6s explainer pacing`);
        }

        scenes.push({
          index: sceneIndex,
          startMs,
          endMs,
          durationMs,
          text: narrationText
        });
      }
    } else {
      // Resilient fallback for plain line-by-line scripts without timestamps
      const lines = rawContent.split(/\r?\n/);
      let currentOffsetMs = 0;
      let sceneIndex = 1;
      const filteredLines = lines
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !/^\d+$/.test(l));

      for (const line of filteredLines) {
        const wordCount = line.split(/\s+/).length;
        const durationMs = Math.max(3000, Math.min(6500, Math.round(wordCount * 380)));
        const startMs = currentOffsetMs;
        const endMs = startMs + durationMs;
        currentOffsetMs = endMs;

        scenes.push({
          index: sceneIndex,
          startMs,
          endMs,
          durationMs,
          text: line
        });
        sceneIndex++;
      }
    }

    const totalDurationMs = scenes.length > 0 ? scenes[scenes.length - 1].endMs : 0;
    const avgDurationMs = scenes.length > 0 ? Math.round(totalDurationMs / scenes.length) : 0;

    return {
      scenes,
      totalDurationMs,
      avgDurationMs,
      warnings
    };
  }
}
