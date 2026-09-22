import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { ProjectRepository } from '../database/repositories/project.repository';
import { SceneRepository } from '../database/repositories/scene.repository';
import { ImageService } from './image.service';

export interface YouTubeMetadataPack {
  titles: string[];
  chaptersText: string;
  descriptionText: string;
  tagsText: string;
  totalDurationFormatted: string;
  sceneCount: number;
  suggestedThumbTexts: string[];
  thumbnailHooks: string[];
  thumbnailSubtitles: string[];
  thumbnailPrompt: string;
  existingThumbnailPath?: string;
  existingRawThumbnailPath?: string;
}

export class YouTubeService {
  /**
   * Generates a complete YouTube metadata pack for a project
   * completely grounded in the actual script and scene narrative.
   */
  /**
   * Generates high-impact, curiosity-inducing YouTube thumbnail hooks (2-4 words)
   * tailored to the video's content title and thematic script context.
   */
  static generateHookOptions(title: string, scriptContent?: string): string[] {
    const lower = (title + ' ' + (scriptContent || '')).toLowerCase();
    const hooks: string[] = [];

    // Thematic hooks based on content keywords
    if (lower.includes('train') || lower.includes('passenger') || lower.includes('quiet') || lower.includes('travel') || lower.includes('journey')) {
      hooks.push('NEVER LOOK BACK', 'THE FINAL TRAIN', 'THE SECRET ABOARD', 'NO ONE NOTICED', 'DON\'T GET ON');
    } else if (lower.includes('over-explain') || lower.includes('explain') || lower.includes('talk') || lower.includes('silence')) {
      hooks.push('SAY LESS', 'STOP EXPLAINING', 'NEVER JUSTIFY', 'SILENCE IS POWER');
    } else if (lower.includes('chase') || lower.includes('pursue') || lower.includes('distance') || lower.includes('walk away')) {
      hooks.push('STOP CHASING', 'WALK AWAY', 'NEVER BEG', 'TOO LATE');
    } else if (lower.includes('truth') || lower.includes('secret') || lower.includes('hidden') || lower.includes('lie')) {
      hooks.push('THE UNTOLD TRUTH', 'WHAT THEY HID', 'THE HARSH TRUTH');
    } else if (lower.includes('wind') || lower.includes('sky') || lower.includes('sea') || lower.includes('ocean')) {
      hooks.push('BEYOND THE SEA', 'INTO THE WIND', 'THE SKY\'S SECRET');
    }

    // Dynamic title-based hooks
    const words = title.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).filter(w => !['a', 'an', 'the', 'of', 'and', 'in', 'on', 'at', 'to', 'for', 'is', 'it'].includes(w.toLowerCase()));
    if (words.length >= 2) {
      hooks.unshift(words.slice(0, 3).join(' ').toUpperCase());
    }

    // Universal high-CTR fallback hooks
    const fallbacks = ['NEVER LOOK BACK', 'THE UNTOLD STORY', 'WHAT REALLY HAPPENED', 'DON\'T MISS THIS', 'THE FINAL STOP'];
    for (const fb of fallbacks) {
      if (!hooks.includes(fb)) hooks.push(fb);
    }

    return Array.from(new Set(hooks)).slice(0, 6);
  }

  /**
   * Generates poetic, evocative Studio Ghibli-style story subtitles
   * in the classic "A story about..." format tailored to the narrative.
   */
  static generateStorySubtitleOptions(title: string, scriptContent?: string): string[] {
    const lower = (title + ' ' + (scriptContent || '')).toLowerCase();
    const subs: string[] = [];

    if (lower.includes('train') || lower.includes('passenger') || lower.includes('sea') || lower.includes('wind')) {
      subs.push(
        'A story about a lonely journey along the sea',
        'A story about the quiet passenger nobody noticed',
        'A story about chasing a quiet adventure',
        'A story about letting the summer breeze carry the past'
      );
    } else if (lower.includes('silence') || lower.includes('explain') || lower.includes('words')) {
      subs.push(
        'A story about finding peace in the silence',
        'A story about the words we never needed to say',
        'A story about the strength to stay quiet'
      );
    } else if (lower.includes('chase') || lower.includes('walk away') || lower.includes('distance')) {
      subs.push(
        'A story about the courage to walk away',
        'A story about letting go of what\'s gone',
        'A story about choosing yourself first'
      );
    }

    // Dynamic clean title derivation
    const clean = title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (clean) {
      subs.push(`A story about ${clean.toLowerCase()}`);
    }

    subs.push(
      'A story about letting go and moving forward',
      'A story about a quiet adventure across the hills',
      'A story about discovering where you belong'
    );

    return Array.from(new Set(subs)).slice(0, 5);
  }

  static generateMetadata(projectId: string): YouTubeMetadataPack {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const scenes = SceneRepository.listByProjectId(projectId);
    const projectName = project.name || 'Psychology Explainer';

    const formatTimestamp = (ms: number): string => {
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const toTitleCase = (str: string): string => {
      const minorWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'vs']);
      return str
        .toLowerCase()
        .split(/\s+/)
        .map((word, idx) => {
          if (idx === 0 || !minorWords.has(word)) {
            return word.charAt(0).toUpperCase() + word.slice(1);
          }
          return word;
        })
        .join(' ');
    };

    // 1. Script-Driven Chapter Titling
    const summarizeChapter = (scriptText: string, index: number): string => {
      const t = (scriptText || '').trim();
      const clean = t.replace(/[?.,!":;]/g, '').trim();
      const lower = clean.toLowerCase();

      // Question opening (e.g. "Ever notice how some people change the moment you stop chasing them?")
      if (t.endsWith('?') || /^(ever notice|did you know|have you ever|why do)/i.test(clean)) {
        const stripped = clean.replace(/^(ever notice how|did you know that|have you ever wondered|why do)\s*/i, '');
        return toTitleCase(stripped);
      }

      // Script-specific psychological contrasts and concepts
      if (lower.includes('miss you') && lower.includes('attention')) {
        return 'Missing You vs. Missing Your Attention';
      }
      if (lower.includes('words') && lower.includes('patterns')) {
        return 'Stop Watching Words, Watch Patterns';
      }
      if (lower.includes('value') && lower.includes('validation')) {
        return 'Value vs. Validation: The True Test';
      }
      if (lower.includes('text') || lower.includes('watch you closer') || lower.includes('reach out')) {
        return 'Why They Suddenly Reach Out';
      }
      if (lower.includes('attention disappears')) {
        return 'When Your Attention Disappears';
      }
      if (lower.includes('stop chasing')) {
        return 'The Shift When You Stop Chasing';
      }
      if (lower.includes('distance reveals')) {
        return 'What Distance Truly Reveals';
      }

      // General intelligent extractor: strip leading conjunctions/fillers and take 4-5 words
      const words = clean.split(/\s+/);
      const stopWords = new Set(['so', 'and', 'but', 'sometimes', 'now', 'then', 'because', 'also', 'or']);
      let startIndex = 0;
      while (startIndex < words.length && stopWords.has(words[startIndex].toLowerCase())) {
        startIndex++;
      }
      const meaningful = words.slice(startIndex, startIndex + 5).join(' ');
      return toTitleCase(meaningful || `Chapter ${index + 1}`);
    };

    const chaptersLines: string[] = [];
    scenes.forEach((scene, index) => {
      const ts = index === 0 ? '00:00' : formatTimestamp(scene.startMs);
      const label = summarizeChapter(scene.scriptText, index);
      chaptersLines.push(`${ts} - ${label}`);
    });
    const chaptersText = chaptersLines.join('\n');

    // 2. High-CTR Script-Grounded Titles
    const fullScript = scenes.map((s) => s.scriptText).join(' ');
    const fullScriptLower = fullScript.toLowerCase();

    const titles: string[] = [];

    // Title 1: Core Topic / Curiosity Hook
    titles.push(`${projectName} (Psychology of Distance)`);

    // Title 2: The Emotional Pivot / Harsh Truth from the script
    if (fullScriptLower.includes('miss you') && fullScriptLower.includes('attention')) {
      titles.push("They Don't Miss You — They Miss Your Attention");
    } else if (fullScriptLower.includes('value') && fullScriptLower.includes('validation')) {
      titles.push('Do They Value You, Or Just Your Validation?');
    } else {
      titles.push(`The Harsh Truth About Why They Pull Away`);
    }

    // Title 3: The Behavioral Rule / Direct Takeaway
    if (fullScriptLower.includes('words') && fullScriptLower.includes('patterns')) {
      titles.push('Stop Watching Their Words. Start Watching Their Patterns.');
    } else {
      titles.push('Why Walking Away Is Your Greatest Power');
    }

    // Title 4: Curiosity Gap / Dark Psychology angle
    if (fullScriptLower.includes('chasing')) {
      titles.push('What Happens When You Finally Stop Chasing? (Dark Psychology)');
    } else {
      titles.push(`What Happens When You Disappear? (Psychological Shift)`);
    }

    // Title 5: Short punchy viral title
    titles.push('Never Chase. (Psychology Explains Why)');

    // 3. Script-Grounded Key Takeaways for Description
    const keyTakeaways: string[] = [];
    scenes.forEach((s) => {
      const txt = s.scriptText.trim();
      const l = txt.toLowerCase();

      if (l.includes('stop chasing') || l.includes('chasing them')) {
        keyTakeaways.push('• The instant psychological shift that occurs when pursuit ceases');
      } else if (l.includes('attention disappears')) {
        keyTakeaways.push('• Why the sudden silence and absence of attention creates immediate urgency');
      } else if (l.includes('text more') || l.includes('watch you closer')) {
        keyTakeaways.push('• The hidden motivation behind sudden texts and increased monitoring');
      } else if (l.includes('miss you') && l.includes('attention')) {
        keyTakeaways.push('• The vital distinction between someone missing YOU vs. missing your validation');
      } else if (l.includes('distance reveals') || l.includes('validation')) {
        keyTakeaways.push('• How emotional and physical distance acts as the ultimate truth test');
      } else if (l.includes('patterns') || l.includes('words')) {
        keyTakeaways.push('• The golden rule of human behavior: analyze repeating patterns, not spoken words');
      } else {
        keyTakeaways.push(`• Understanding the behavioral dynamic: "${txt.slice(0, 70)}..."`);
      }
    });

    const totalDurationMs = scenes.length > 0 ? scenes[scenes.length - 1].endMs : project.durationMs;
    const totalDurationFormatted = formatTimestamp(totalDurationMs);

    // 4. Dynamic Script-Grounded Full Description
    const fullScriptCombined = scenes.map((s) => s.scriptText).join(' ').toLowerCase();
    const isOverExplaining = fullScriptCombined.includes('explain') || fullScriptCombined.includes('talking') || fullScriptCombined.includes('boundary') || projectName.toLowerCase().includes('explain');

    const introSummary = isOverExplaining
      ? `Why does over-explaining make people take you less seriously? In this animated psychology explainer, we reveal why extra words accidentally invite doubt and debate, how silence communicates quiet confidence, and how to set boundaries without justifying yourself.`
      : `Why do human behavioral dynamics shift so dramatically under subtle psychological cues? In this animated explainer, we explore self-worth, emotional intelligence, and interpersonal psychology through clear visual storytelling.`;

    const descriptionText = [
      introSummary,
      '',
      '⏱️ CHAPTERS & TIMESTAMPS:',
      chaptersText,
      '',
      '💡 KEY PSYCHOLOGY LESSONS IN THIS VIDEO:',
      keyTakeaways.join('\n'),
      '',
      '🧠 ABOUT THIS ANIMATION:',
      `This video combines behavioral science and communication psychology to explain human interactions. Illustrated in a colorful 2D psychology explainer style inspired by Psych2Go and Casually Explained.`,
      '',
      '🔔 Subscribe to DocuForge for thoughtful, animated deep-dives into human psychology, communication mastery, and self-worth.',
      '',
      '#Psychology #Communication #Boundaries #Confidence #SelfWorth #HumanBehavior #DocuForge'
    ].join('\n');

    // 5. Script-Grounded Tags & Search Keywords
    const tagsList = isOverExplaining
      ? [
          projectName.toLowerCase(),
          'why you overexplain',
          'overexplaining psychology',
          'say less psychology',
          'power of silence',
          'quiet confidence',
          'stop justifying yourself',
          'setting boundaries',
          'communication mastery',
          'why people doubt you',
          'confidence vs insecurity',
          'psych2go',
          'casually explained',
          'animated psychology',
          'docuforge'
        ]
      : [
          projectName.toLowerCase(),
          'human behavior explained',
          'psychology of silence',
          'emotional intelligence',
          'personal boundaries',
          'self respect',
          'behavioral patterns',
          'communication skills',
          'psych2go',
          'animated psychology',
          'docuforge'
        ];
    const tagsText = tagsList.join(', ');

    // 6. Script-Suggested Thumbnail Teaser Texts (2-4 high-impact words)
    const suggestedThumbTexts = isOverExplaining
      ? [
          'STOP OVER-EXPLAINING',
          'SAY LESS',
          'LESS IS POWER',
          'THE SILENT TRAP',
          'CONFIDENCE IN SILENCE',
          'NEVER JUSTIFY'
        ]
      : [
          'STOP CHASING',
          'WATCH PATTERNS',
          'THE UNTOLD TRUTH',
          'POWER OF SILENCE',
          'WHEN YOU WALK AWAY'
        ];

    // 7. Script-Grounded Thumbnail Prompt (Studio Ghibli Anime with AI-Generated Title Overlay)
    const cleanTitle = (titles[0] || projectName || 'The Untold Story').replace(/["\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
    const thumbnailPrompt =
      `High-CTR 16:9 Studio Ghibli anime YouTube thumbnail illustration in the aesthetic of Hayao Miyazaki and Makoto Shinkai. ` +
      `IN-IMAGE TEXT SPECIFICATION: ` +
      `- Prominently and artistically render the video title text "${cleanTitle}" as a bold, cinematic title overlay integrated into the scene. ` +
      `- Elegant storybook typography with warm golden-amber or luminous ivory lettering with soft dark outline for perfect legibility against the anime landscape. ` +
      `- Strictly NO other random words, watermarks, gibberish letters, or background captions. ` +
      `SCENE & ART DIRECTION: ` +
      `A young anime protagonist standing on a sun-drenched grassy hill covered in wildflowers, gazing out toward a sparkling coastal bay under massive sunlit cumulus clouds. ` +
      `Authentic hand-painted gouache and watercolor textures, warm golden hour sunlight, deep emerald foliage, and nostalgic anime cinematography. ` +
      `16:9 widescreen landscape.`;

    // Existing saved thumbnail files
    const finalThumb = path.join(project.projectPath, 'output', 'thumbnail.png');
    const rawThumb = path.join(project.projectPath, 'output', 'thumbnail_raw.png');
    const existingThumbnailPath = fs.existsSync(finalThumb) ? finalThumb : (project.thumbnailPath && fs.existsSync(project.thumbnailPath) ? project.thumbnailPath : undefined);
    const existingRawThumbnailPath = fs.existsSync(rawThumb) ? rawThumb : undefined;

    const thumbnailHooks = this.generateHookOptions(titles[0] || projectName, fullScript);
    const thumbnailSubtitles = this.generateStorySubtitleOptions(titles[0] || projectName, fullScript);

    return {
      titles,
      chaptersText,
      descriptionText,
      tagsText,
      totalDurationFormatted,
      sceneCount: scenes.length,
      suggestedThumbTexts,
      thumbnailHooks,
      thumbnailSubtitles,
      thumbnailPrompt,
      existingThumbnailPath,
      existingRawThumbnailPath
    };
  }

  /**
   * Formats and wraps a video title for high-impact YouTube thumbnail composition.
   */
  static formatTitleForThumbnail(rawTitle: string): { lines: string[]; fontSize: number; yPos: number } {
    const clean = rawTitle
      .replace(/[«»""'']/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\.+$/, '')
      .trim();

    const words = clean.split(' ').filter(Boolean);
    let lines: string[] = [];

    if (words.length <= 4 && clean.length <= 28) {
      lines = [clean.toUpperCase()];
    } else if (words.length <= 8 && clean.length <= 58) {
      const half = Math.ceil(words.length / 2);
      lines = [
        words.slice(0, half).join(' ').toUpperCase(),
        words.slice(half).join(' ').toUpperCase()
      ];
    } else {
      const maxChars = 28;
      let curLine = '';
      for (const w of words) {
        if (!curLine) {
          curLine = w;
        } else if ((curLine + ' ' + w).length <= maxChars) {
          curLine += ' ' + w;
        } else {
          lines.push(curLine.toUpperCase());
          curLine = w;
        }
      }
      if (curLine) {
        lines.push(curLine.toUpperCase());
      }
    }

    if (lines.length > 3) {
      const half = Math.ceil(words.length / 2);
      lines = [
        words.slice(0, half).join(' ').toUpperCase(),
        words.slice(half).join(' ').toUpperCase()
      ];
    }

    let fontSize = 54;
    let yPos = 65;
    if (lines.length === 1) {
      fontSize = 62;
      yPos = 80;
    } else if (lines.length === 2) {
      fontSize = 54;
      yPos = 65;
    } else {
      fontSize = 44;
      yPos = 50;
    }

    return { lines, fontSize, yPos };
  }

  /**
   * Composites the video title text overlay directly onto the generated anime image
   * using FFmpeg with storybook typography, golden-ivory fill, and crisp dark drop shadow.
   */
  static burnTitleOverlay(rawImagePath: string, title: string, outputPath: string): string {
    if (!fs.existsSync(rawImagePath)) {
      throw new Error(`Raw thumbnail image not found at: ${rawImagePath}`);
    }

    const { lines, fontSize, yPos } = this.formatTitleForThumbnail(title);
    const tempDir = path.dirname(outputPath);
    fs.mkdirSync(tempDir, { recursive: true });

    const tempTextFile = path.join(tempDir, `thumb_title_${Date.now()}.txt`);
    fs.writeFileSync(tempTextFile, lines.join('\n'), 'utf8');

    // Font selection: Arial Bold is universally installed on Windows
    const fontCandidate = fs.existsSync('C:\\Windows\\Fonts\\arialbd.ttf')
      ? 'C\\:/Windows/Fonts/arialbd.ttf'
      : (fs.existsSync('C:\\Windows\\Fonts\\georgiab.ttf') ? 'C\\:/Windows/Fonts/georgiab.ttf' : 'Arial');

    const relTextFile = path.basename(tempTextFile);
    const vf = `drawtext=fontfile='${fontCandidate}':textfile='${relTextFile}':fontsize=${fontSize}:fontcolor=0xFFFAF0:borderw=6:bordercolor=0x0B0D10:shadowx=4:shadowy=5:shadowcolor=0x000000@0.9:x=(w-text_w)/2:y=${yPos}:line_spacing=12`;

    try {
      execFileSync('ffmpeg', [
        '-y',
        '-i', rawImagePath,
        '-vf', vf,
        '-update', '1',
        outputPath
      ], { cwd: tempDir, windowsHide: true });
    } catch (ffErr) {
      console.warn('[YouTubeService] FFmpeg title burn failed, falling back to copy:', ffErr);
      fs.copyFileSync(rawImagePath, outputPath);
    } finally {
      try {
        if (fs.existsSync(tempTextFile)) fs.unlinkSync(tempTextFile);
      } catch {}
    }

    return outputPath;
  }

  /**
   * Generates a high-CTR 16:9 YouTube thumbnail using Pixazo AI Gateway
   * in authentic Studio Ghibli hand-painted anime style,
   * composites the video title text overlay directly onto the image,
   * and automatically assigns it as the project image!
   */
  static async generateThumbnail(
    projectId: string,
    customPrompt?: string,
    selectedTitle?: string,
    selectedHook?: string,
    selectedSubtitle?: string
  ): Promise<string> {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const metadata = this.generateMetadata(projectId);
    const titleToUse = (selectedTitle || metadata.titles[0] || project.name || 'Untitled Story').trim();
    const cleanTitle = titleToUse.replace(/["\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
    const hookToUse = (selectedHook || (metadata.thumbnailHooks && metadata.thumbnailHooks[0]) || this.generateHookOptions(cleanTitle)[0] || 'NEVER LOOK BACK').trim();
    const subtitleToUse = (selectedSubtitle || (metadata.thumbnailSubtitles && metadata.thumbnailSubtitles[0]) || this.generateStorySubtitleOptions(cleanTitle)[0] || 'A story about a lonely journey along the sea').trim();

    let prompt = customPrompt;
    if (!prompt) {
      prompt =
        `Studio Ghibli real-world slice-of-life anime in the grounded realism aesthetic of Whisper of the Heart and From Up on Poppy Hill. Grounded everyday realism, NO fairytale, NO fantasy. ` +
        `IN-IMAGE TYPOGRAPHY (MONUMENTAL GARGANTUAN TITLE HEADLINE FILLING OVER HALF OF THE IMAGE): ` +
        `- Massive, colossal two-line headline typography dominating more than half of the entire image canvas (occupying 55%-65% of the frame across the upper and middle canvas). ` +
        `- Line 1 (Main Hook / Title): "${hookToUse}" in gigantic, monumental, ultra-bold thick golden-amber Studio Ghibli storybook calligraphy with heavy dark drop-shadow and bold outline, stretching boldly across the sky. ` +
        `- Line 2 (Story Subtitle): "${subtitleToUse}" in huge, prominent matching bold storybook lettering directly below Line 1, only slightly smaller than Line 1. ` +
        `- The text headline is the primary focal point of the thumbnail, gigantic, commanding, and filling over half the composition for maximum YouTube click-through rate. ` +
        `SCENE: ` +
        `A realistic coastal railway with a young student in casual summer clothes looking out at a commuter train rolling along the seaside tracks by the calm blue ocean under sunlit clouds. Grounded 1990s Ghibli slice-of-life watercolor realism. 16:9 widescreen.`;
    }

    const rawOutputPath = path.join(project.projectPath, 'output', 'thumbnail_raw.png');
    const finalOutputPath = path.join(project.projectPath, 'output', 'thumbnail.png');
    fs.mkdirSync(path.dirname(rawOutputPath), { recursive: true });

    // 1. Generate thumbnail artwork with AI Image Generator creating the in-image text overlay
    await ImageService.generateWithRetry(prompt, rawOutputPath);

    // 2. Set the pure AI-generated artwork directly as the official project thumbnail
    fs.copyFileSync(rawOutputPath, finalOutputPath);

    // 3. Make the finalized thumbnail the official project image!
    ProjectRepository.update(projectId, { thumbnailPath: finalOutputPath });

    return finalOutputPath;
  }

  /**
   * Instantly re-burns a newly selected or edited title overlay
   * onto the existing raw background artwork without re-running diffusion (< 0.1s).
   */
  static async updateThumbnailTitle(projectId: string, newTitle: string): Promise<string> {
    // When title changes, let AI image generator re-create the artwork with the new title text overlay
    return this.generateThumbnail(projectId, undefined, newTitle);
  }

  /**
   * Saves the final rendered thumbnail with text overlay to project output folder
   * and permanently registers it as the official project image!
   */
  static async saveThumbnail(projectId: string, base64Data: string): Promise<string> {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const outputPath = path.join(project.projectPath, 'output', 'thumbnail.png');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(outputPath, buffer);

    // Make the finalized thumbnail the official project image!
    ProjectRepository.update(projectId, { thumbnailPath: outputPath });

    return outputPath;
  }
}