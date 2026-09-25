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
        } else if (durationMs > 25000) {
          warnings.push(`Scene ${sceneIndex}: Duration (${(durationMs / 1000).toFixed(1)}s) is long; images will dynamically alternate every 3-6s`);
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
      // Check first if the user provided paired Script + Text-to-Image prompts
      const pairedScenes = this.parsePairedScriptAndPrompts(rawContent);

      if (pairedScenes && pairedScenes.length > 0) {
        let currentOffsetMs = 0;
        for (let i = 0; i < pairedScenes.length; i++) {
          const item = pairedScenes[i];
          const wordCount = item.text.split(/\s+/).filter(Boolean).length;
          const durationMs = Math.max(3000, Math.round(wordCount * 380));
          const startMs = currentOffsetMs;
          const endMs = startMs + durationMs;
          currentOffsetMs = endMs;

          scenes.push({
            index: i + 1,
            startMs,
            endMs,
            durationMs,
            text: item.text,
            customPrompt: item.customPrompt
          });
        }
      } else {
        // Natural scene segmentation:
        // Every line from start to full stop or comma (when clause has >= 5 words) is a separate scene.
        const segments = this.splitScriptIntoNaturalScenes(rawContent);
        let currentOffsetMs = 0;
        let sceneIndex = 1;

        for (const seg of segments) {
          const wordCount = seg.split(/\s+/).filter(Boolean).length;
          const durationMs = Math.max(3000, Math.round(wordCount * 380));
          const startMs = currentOffsetMs;
          const endMs = startMs + durationMs;
          currentOffsetMs = endMs;

          scenes.push({
            index: sceneIndex,
            startMs,
            endMs,
            durationMs,
            text: seg
          });
          sceneIndex++;
        }
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

  /**
   * Detects and parses paired Script + Text-to-Image Prompts.
   * Supports:
   * 1. scene 1 (Script line) \n Prompt line
   * 2. Scene 1: \n Script: ... \n Prompt: ...
   * 3. [Script] ... \n [Prompt] ...
   * 4. Script line | Prompt line
   */
  static parsePairedScriptAndPrompts(rawText: string): Array<{ text: string; customPrompt: string }> | null {
    if (!rawText || !rawText.trim()) return null;

    const cleanSpoken = (t: string) =>
      t.replace(/^(?:scene\s*\d+[:.\s-]*|\d+[\.:\s-]+)/i, '')
       .replace(/^\[?(?:Script|Narration)\]?[:.\s-]*/i, '')
       .trim();

    // Format 1: scene 1 (line of script) \n prompt
    const format1Matches: Array<{ text: string; customPrompt: string }> = [];
    const format1Regex = /(?:^|\n)\s*scene\s*\d+\s*\(([^)]+)\)\s*:?\s*([^\n\r]+(?:\n(?!\s*scene\s*\d+\s*\()[^\n\r]+)*)/gi;
    let match: RegExpExecArray | null;
    while ((match = format1Regex.exec(rawText)) !== null) {
      const scriptText = cleanSpoken(match[1]);
      const promptText = match[2].trim();
      if (scriptText && promptText) {
        format1Matches.push({ text: scriptText, customPrompt: promptText });
      }
    }
    if (format1Matches.length > 0) return format1Matches;

    // Format 2: Explicit [Script]/Script: paired with [Prompt]/Prompt:
    const format2Matches: Array<{ text: string; customPrompt: string }> = [];
    const format2Regex = /(?:^|\n)\s*(?:scene\s*\d+[:.\s]*)?\[?(?:Script|Narration)\]?[:.\s]+([^\n\r]+(?:\n(?!\s*\[?(?:Prompt|Image\s*Prompt)\]?[:.\s])[^\n\r]+)*)\s*\[?(?:Prompt|Image\s*Prompt)\]?[:.\s]+([^\n\r]+(?:\n(?!\s*(?:scene\s*\d+|\[?(?:Script|Narration)\]?[:.\s]))[^\n\r]+)*)/gi;
    while ((match = format2Regex.exec(rawText)) !== null) {
      const scriptText = cleanSpoken(match[1]);
      const promptText = match[2].trim();
      if (scriptText && promptText) {
        format2Matches.push({ text: scriptText, customPrompt: promptText });
      }
    }
    if (format2Matches.length > 0) return format2Matches;

    // Format 3: Pipe delimiter per line (e.g. "Scene 1: Spoken script | Text-to-image prompt")
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const pipeMatches: Array<{ text: string; customPrompt: string }> = [];
    let pipeValid = true;
    if (lines.length > 0) {
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length === 2 && parts[0].trim().length > 0 && parts[1].trim().length >= 3) {
          pipeMatches.push({ text: cleanSpoken(parts[0]), customPrompt: parts[1].trim() });
        } else {
          pipeValid = false;
          break;
        }
      }
      if (pipeValid && pipeMatches.length > 0) return pipeMatches;
    }

    // Format 4: Scene blocks with Narration text followed by Prompt: line
    const format4Matches: Array<{ text: string; customPrompt: string }> = [];
    const sceneBlocks = rawText.split(/(?:^|\n)(?=scene\s*\d+[:.\s]|\d+[\.:\s-]+)/i).map((b) => b.trim()).filter(Boolean);
    if (sceneBlocks.length > 0) {
      for (const block of sceneBlocks) {
        const pMatch = block.match(/^(.*?)(?:\[?(?:Prompt|Image\s*Prompt)\]?[:.\s]+)(.+)$/is);
        if (pMatch) {
          const sText = cleanSpoken(pMatch[1]);
          const pText = pMatch[2].trim();
          if (sText && pText) {
            format4Matches.push({ text: sText, customPrompt: pText });
          }
        }
      }
      if (format4Matches.length === sceneBlocks.length && format4Matches.length > 0) {
        return format4Matches;
      }
    }

    return null;
  }

  /**
   * Splits plain script text into natural scenes:
   * 1. Every full stop, exclamation mark, or question mark forms a new scene.
   * 2. Commas also split scenes IF the preceding clause has 5 or more words.
   *    If the comma is after 1-4 words, it remains part of the current scene.
   */
  static splitScriptIntoNaturalScenes(rawText: string): string[] {
    const lines = (rawText || '').split(/\r?\n/);
    const scenes: string[] = [];

    for (const rawLine of lines) {
      const cleanLine = rawLine.trim();
      if (!cleanLine || /^\d+$/.test(cleanLine)) continue;

      // Split into sentences on full stops, exclamation marks, question marks
      const sentences = cleanLine.split(/(?<=[.!?])\s+/).filter(Boolean);

      for (const sent of sentences) {
        const commaSplits = sent.split(/,\s*/);
        if (commaSplits.length <= 1) {
          if (sent.trim()) scenes.push(sent.trim());
          continue;
        }

        let currentChunk = '';
        for (let i = 0; i < commaSplits.length; i++) {
          const piece = commaSplits[i].trim();
          if (!piece) continue;

          if (!currentChunk) {
            currentChunk = piece;
          } else {
            const wordCount = currentChunk.split(/\s+/).filter(Boolean).length;
            if (wordCount >= 5) {
              scenes.push(currentChunk.trim());
              currentChunk = piece;
            } else {
              currentChunk = `${currentChunk}, ${piece}`;
            }
          }
        }
        if (currentChunk.trim()) {
          scenes.push(currentChunk.trim());
        }
      }
    }

    return scenes.filter((s) => s.length > 0);
  }
}
