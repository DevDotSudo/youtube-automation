import { AudioService } from './audio.service';
import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { ProjectRepository } from '../database/repositories/project.repository';
import { SceneRepository } from '../database/repositories/scene.repository';
import { VisualBeatRepository } from '../database/repositories/visual-beat.repository';
import { ProjectStatus } from '../../shared/enums';
import { SceneEditConfig, VisualBeat, CaptionStyleConfig, VideoExportOptions } from '../../shared/types';
import { CAPTION_PRESETS, COLOR_FILTER_PRESETS, VIDEO_EFFECT_PRESETS } from '../../shared/constants';

const execFileAsync = util.promisify(execFile);

export class RenderService {
  /**
   * Generates both ASS (Advanced SubStation Alpha) and standard SRT subtitle files.
   * ASS is burned into the final MP4 with bold modern typography,
   * safe bottom margin, max 80% width, dark red keyword accents,
   * and optional prominent keyword badge overlays.
   */
  static generateAss(
    projectId: string,
    sceneConfigs?: SceneEditConfig[],
    customStyle?: CaptionStyleConfig
  ): { assPath: string; srtPath: string } {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const subDir = path.join(project.projectPath, 'subtitles');
    fs.mkdirSync(subDir, { recursive: true });
    const assPath = path.join(subDir, 'captions.ass');
    const srtPath = path.join(subDir, 'captions.srt');

    const scenes = SceneRepository.listByProjectId(projectId);
    const style: CaptionStyleConfig = customStyle || project.captionStyle || CAPTION_PRESETS.GHIBLI_STORYBOOK;

    // Load alignment.json if available for word-level sync
    let alignmentData: any = null;
    const alignJsonPath = path.join(project.projectPath, 'subtitles', 'alignment.json');
    if (fs.existsSync(alignJsonPath)) {
      try {
        alignmentData = JSON.parse(fs.readFileSync(alignJsonPath, 'utf8'));
      } catch {}
    }

    const formatAssTime = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const centis = Math.floor((ms % 1000) / 10);
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
    };

    const formatSrtTime = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const millis = ms % 1000;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
    };

    // Helper: Hex color to ASS &HAABBGGRR format
    const toAssColor = (hex: string, alpha = '00') => {
      const clean = (hex || '#FFFFFF').replace('#', '').padEnd(6, 'F');
      const r = clean.slice(0, 2);
      const g = clean.slice(2, 4);
      const b = clean.slice(4, 6);
      return `&H${alpha}${b}${g}${r}`;
    };

    const primaryAss = toAssColor(style.primaryColor, '00');
    const outlineAss = toAssColor(style.outlineColor, '00');

    // Box background color (opacity converted to ASS alpha 00=opaque, FF=transparent)
    const boxAlphaInt = Math.max(0, Math.min(255, Math.round((1 - style.boxOpacity) * 255)));
    const boxAlphaHex = boxAlphaInt.toString(16).padStart(2, '0').toUpperCase();
    const backAss = style.hasBackgroundBox ? toAssColor(style.boxColor, boxAlphaHex) : '&H80000000';

    // Map web Google font names to crisp, universally available Windows system fonts for FFmpeg libass
    const FONT_MAP: Record<string, string> = {
      'Merriweather': 'Georgia',
      'Playfair Display': 'Georgia',
      'Cinzel': 'Times New Roman',
      'Inter': 'Segoe UI',
      'Montserrat': 'Segoe UI',
      'Outfit': 'Segoe UI',
      'Righteous': 'Impact',
      'Anton': 'Impact',
      'Caveat': 'Segoe Print',
      'Roboto': 'Arial'
    };
    const safeFontFamily = FONT_MAP[style.fontFamily] || style.fontFamily || 'Segoe UI';

    const borderStyle = style.hasBackgroundBox ? 3 : 1;
    // With BorderStyle 3, Outline thickness defines box padding around text in libass
    const outlineThickness = style.hasBackgroundBox ? 10 : Math.max(1, style.outlineWidth || 2);
    const shadowDepth = style.hasBackgroundBox ? 0 : 1.5;
    const marginV = style.position === 'BOTTOM' ? 95 : style.position === 'MIDDLE_LOWER' ? 145 : 240;

    let assContent = `[Script Info]
Title: Studio Suite Master Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${safeFontFamily},${style.fontSize},${primaryAss},&H000000FF,${outlineAss},${backAss},-1,0,0,0,100,100,0,0,${borderStyle},${outlineThickness},${shadowDepth},2,192,192,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    let srtContent = '';
    let srtIndex = 1;
    const highlightWords = (style.highlightWords || []).map((w) => w.toLowerCase().trim());

    // Highlight tag format: \c&HBBGGRR&
    const hlClean = (style.highlightColor || '#C81A1A').replace('#', '').padEnd(6, 'F');
    const hlTag = `\\c&H${hlClean.slice(4, 6)}${hlClean.slice(2, 4)}${hlClean.slice(0, 2)}&`;

    const priClean = (style.primaryColor || '#FFFFFF').replace('#', '').padEnd(6, 'F');
    const priTag = `\\c&H${priClean.slice(4, 6)}${priClean.slice(2, 4)}${priClean.slice(0, 2)}&`;

    // Helper: Split raw text into natural rhythmic subtitle phrases (3-7 words)
    const splitIntoPhrases = (text: string): string[] => {
      if (!text || !text.trim()) return [];
      const clauses = text.split(/([,.;:!?—\n]+)/);
      const rawTokens: string[] = [];
      for (let i = 0; i < clauses.length - 1; i += 2) {
        rawTokens.push((clauses[i] + clauses[i + 1]).trim());
      }
      if (clauses.length % 2 === 1 && clauses[clauses.length - 1].trim()) {
        rawTokens.push(clauses[clauses.length - 1].trim());
      }

      const phrases: string[] = [];
      const MAX_WORDS = 6;
      for (const token of rawTokens) {
        const words = token.split(/\s+/).filter(Boolean);
        if (words.length <= MAX_WORDS) {
          if (words.length > 0) phrases.push(words.join(' '));
        } else {
          for (let j = 0; j < words.length; j += MAX_WORDS) {
            phrases.push(words.slice(j, j + MAX_WORDS).join(' '));
          }
        }
      }
      return phrases.length > 0 ? phrases : [text.trim()];
    };

    // 1. Scene Narration Captions with phrase-level sync
    scenes.forEach((scene) => {
      const custom = sceneConfigs?.find((c) => c.sceneId === scene.id);
      const isEnabled = custom?.captionEnabled !== undefined ? custom.captionEnabled : (scene.captionEnabled !== false);
      if (!isEnabled) return;

      let rawText = custom?.captionText || scene.captionText || scene.scriptText;
      if (!rawText || !rawText.trim()) {
        const beats = VisualBeatRepository.listBySceneId(scene.id);
        const beatConcept = beats.find((b) => b.visualConcept)?.visualConcept;
        if (beatConcept) rawText = beatConcept;
      }
      if (!rawText || !rawText.trim()) return;

      if (style.allCaps) {
        rawText = rawText.toUpperCase();
      }

      const sceneStartMs = custom?.startMs ?? scene.startMs;
      const sceneEndMs = custom?.endMs ?? scene.endMs;

      const phrases = splitIntoPhrases(rawText);
      const totalWords = phrases.reduce((sum, p) => sum + p.split(/\s+/).filter(Boolean).length, 0) || 1;

      // Add highlight to key trigger words
      const highlightPhrase = (phrase: string) => {
        return phrase.split(' ').map((w) => {
          const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (highlightWords.includes(clean)) {
            return `{${hlTag}}${w}{${priTag}}`;
          }
          return w;
        }).join(' ');
      };

      // Extract word-level timestamps for true 1:1 voiceover synchronization
      let words = scene.words || [];
      if (words.length === 0 && alignmentData?.scenes) {
        const found = alignmentData.scenes.find((s: any) => s.id === scene.id || s.index === scene.sceneIndex);
        if (found?.words?.length > 0) {
          words = found.words;
        }
      }

      if (words.length > 0) {
        // Group words into natural rhythmic phrases (3-6 words, breaking at punctuation)
        const wordPhrases: any[][] = [];
        let curChunk: any[] = [];

        for (const w of words) {
          curChunk.push(w);
          const hasPunct = /[,.?!;:]/.test(w.word);
          if (curChunk.length >= 6 || (hasPunct && curChunk.length >= 3)) {
            wordPhrases.push(curChunk);
            curChunk = [];
          }
        }
        if (curChunk.length > 0) {
          if (wordPhrases.length > 0 && curChunk.length <= 2) {
            wordPhrases[wordPhrases.length - 1].push(...curChunk);
          } else {
            wordPhrases.push(curChunk);
          }
        }

        wordPhrases.forEach((pWords, pIdx) => {
          const phraseText = pWords.map((w: any) => w.word).join(' ');
          const pStart = pWords[0].startMs;
          const rawEnd = pWords[pWords.length - 1].endMs;

          // Natural reading cushion: hold subtitle for ~200ms or until next phrase speaks
          const nextStart = pIdx < wordPhrases.length - 1 ? wordPhrases[pIdx + 1][0].startMs : sceneEndMs;
          const pEnd = Math.max(pStart + 350, Math.min(nextStart - 40, rawEnd + 220));

          const textToDisplay = style.allCaps ? phraseText.toUpperCase() : phraseText;
          const formattedAssText = highlightPhrase(textToDisplay);
          const cleanSrtText = textToDisplay;

          assContent += `Dialogue: 0,${formatAssTime(pStart)},${formatAssTime(pEnd)},Default,,0,0,0,,${formattedAssText}\n`;

          srtContent += `${srtIndex}\n`;
          srtContent += `${formatSrtTime(pStart)} --> ${formatSrtTime(pEnd)}\n`;
          srtContent += `${cleanSrtText}\n\n`;
          srtIndex++;
        });
      } else {
        // Fallback: bounded strictly by speech start and end timestamps if known
        const effStart = (scene.speechStartMs !== undefined && scene.speechStartMs !== null) ? scene.speechStartMs : sceneStartMs;
        const effEnd = (scene.speechEndMs !== undefined && scene.speechEndMs !== null) ? scene.speechEndMs : sceneEndMs;
        const effDuration = Math.max(500, effEnd - effStart);

        let phraseCurrentMs = effStart;
        phrases.forEach((phrase, pIdx) => {
          const pWords = phrase.split(/\s+/).filter(Boolean).length;
          const pDuration = pIdx === phrases.length - 1
            ? Math.max(300, effEnd - phraseCurrentMs)
            : Math.max(300, Math.round((pWords / totalWords) * effDuration));

          const pStart = phraseCurrentMs;
          const pEnd = Math.min(effEnd, phraseCurrentMs + pDuration);
          phraseCurrentMs = pEnd;

          const formattedAssText = highlightPhrase(phrase);
          const cleanSrtText = phrase;

          assContent += `Dialogue: 0,${formatAssTime(pStart)},${formatAssTime(pEnd)},Default,,0,0,0,,${formattedAssText}\n`;

          srtContent += `${srtIndex}\n`;
          srtContent += `${formatSrtTime(pStart)} --> ${formatSrtTime(pEnd)}\n`;
          srtContent += `${cleanSrtText}\n\n`;
          srtIndex++;
        });
      }
    });

    fs.writeFileSync(assPath, assContent, 'utf8');
    fs.writeFileSync(srtPath, srtContent, 'utf8');

    return { assPath, srtPath };
  }

  /**
   * Renders a single Visual Beat into a 1080p 30fps video-only MP4 segment
   * with camera motion and transitions.
   */
  static async renderBeatSegment(
    beat: VisualBeat,
    outputSegmentPath: string,
    filterPreset?: string,
    targetWidth: number = 1920,
    targetHeight: number = 1080,
    fps: number = 30
  ): Promise<string> {
    const durationSec = Math.max(0.3, beat.durationMs / 1000);
    const frames = Math.max(10, Math.round(durationSec * fps));

    // Camera Motion Presets (Section 12)
    let motionFilter = '';
    switch (beat.motion) {
      case 'ZOOM_IN':
        motionFilter = `zoompan=z='1.0+0.05*(on/${frames})':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${targetWidth}x${targetHeight}:fps=${fps}`;
        break;
      case 'ZOOM_OUT':
        motionFilter = `zoompan=z='1.05-0.05*(on/${frames})':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${targetWidth}x${targetHeight}:fps=${fps}`;
        break;
      case 'PUSH_IN':
        motionFilter = `zoompan=z='1.0+0.03*(on/${frames})':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${targetWidth}x${targetHeight}:fps=${fps}`;
        break;
      case 'PUNCH_IN':
        motionFilter = `zoompan=z='1.0+0.08*(on/${frames})':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${targetWidth}x${targetHeight}:fps=${fps}`;
        break;
      case 'PAN_LEFT':
        motionFilter = `zoompan=z=1.06:x='(iw*0.05*(1-on/${frames}))':y='ih/2-(ih/zoom/2)':d=${frames}:s=${targetWidth}x${targetHeight}:fps=${fps}`;
        break;
      case 'PAN_RIGHT':
        motionFilter = `zoompan=z=1.06:x='(iw*0.05*(on/${frames}))':y='ih/2-(ih/zoom/2)':d=${frames}:s=${targetWidth}x${targetHeight}:fps=${fps}`;
        break;
      case 'STATIC':
      default:
        motionFilter = `fps=${fps}`;
        break;
    }

    // Procedural Transition handling (Zero local asset downloads)
    let transitionFilter = '';
    const requestedTransSec = (beat.transitionDurationMs && beat.transitionDurationMs > 0)
      ? beat.transitionDurationMs / 1000
      : 0.60;
    const transSec = Math.min(requestedTransSec, durationSec / 2.5);
    switch (beat.transition) {
      case 'FADE':
        transitionFilter = `,fade=t=in:st=0:d=${transSec.toFixed(2)}:color=black,fade=t=out:st=${(durationSec - transSec).toFixed(2)}:d=${transSec.toFixed(2)}:color=black`;
        break;
      case 'FADE_WHITE':
        transitionFilter = `,fade=t=in:st=0:d=${transSec.toFixed(2)}:color=white,fade=t=out:st=${(durationSec - transSec).toFixed(2)}:d=${transSec.toFixed(2)}:color=white`;
        break;
      case 'DISSOLVE':
      case 'WIPE_LEFT':
      case 'WIPE_RIGHT':
      case 'CIRCLE_CROP':
      case 'SMOOTH_LEFT':
      case 'SMOOTH_RIGHT':
        transitionFilter = `,fade=t=in:st=0:d=${transSec.toFixed(2)}`;
        break;
      case 'CUT':
      default:
        transitionFilter = '';
        break;
    }

    // Color filter preset handling
    let colorFilterStr = '';
    if (filterPreset && filterPreset !== 'none') {
      const matched = COLOR_FILTER_PRESETS.find((f) => f.id === filterPreset);
      if (matched && matched.ffmpeg) {
        colorFilterStr = `,${matched.ffmpeg}`;
      }
    }

    // Video Effect preset handling (Procedural FFmpeg math - Zero local downloads)
    let effectFilterStr = '';
    const chosenEffectId = beat.videoEffect || 'none';
    if (chosenEffectId !== 'none') {
      const effectPreset = VIDEO_EFFECT_PRESETS.find((e) => e.id === chosenEffectId);
      if (effectPreset && effectPreset.ffmpegFilter) {
        effectFilterStr = `,${effectPreset.ffmpegFilter}`;
      }
    }

    // Base 16:9 1080p scaling with square pixels
    const baseScale = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},setsar=1`;
    const fullVf = `${baseScale},${motionFilter}${transitionFilter}${colorFilterStr}${effectFilterStr}`;

    const args = [
      '-y',
      '-loop', '1',
      '-i', beat.imagePath!,
      '-t', durationSec.toFixed(3),
      '-vf', fullVf,
      '-aspect', '16:9',
      '-s', `${targetWidth}x${targetHeight}`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      outputSegmentPath
    ];

    await execFileAsync('ffmpeg', args);
    return outputSegmentPath;
  }

  /**
   * Full psychology explainer video rendering pipeline with Visual Beats,
   * continuous unbroken master voice audio, burned-in ASS captions & keywords.
   */
  static async renderProject(
    projectId: string,
    sceneConfigs?: SceneEditConfig[],
    mainWindow?: BrowserWindow,
    colorFilter?: string,
    bgmVolume: number = 0.16,
    customCaptionStyle?: CaptionStyleConfig,
    exportOptions?: VideoExportOptions
  ): Promise<string> {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const scenes = SceneRepository.listByProjectId(projectId);
    if (scenes.length === 0) throw new Error('No scenes found to render');

    const beatsFromDb = VisualBeatRepository.listByProjectId(projectId);
    if (beatsFromDb.length === 0) {
      throw new Error('No visual beats found for project. Please approve project first.');
    }

    // Resolve CapCut export options
    const resolution = exportOptions?.resolution || '1080p';
    let targetWidth = 1920;
    let targetHeight = 1080;
    if (resolution === '720p') {
      targetWidth = 1280;
      targetHeight = 720;
    } else if (resolution === '4k') {
      targetWidth = 3840;
      targetHeight = 2160;
    }
    const fps = exportOptions?.fps || 30;
    const quality = exportOptions?.quality || 'recommended';
    const burnSubtitles = exportOptions?.burnSubtitles !== false;
    const finalColorFilter = exportOptions?.colorFilter || colorFilter;
    const finalBgmVolume = exportOptions?.bgmVolume !== undefined ? exportOptions.bgmVolume : bgmVolume;
    const finalCaptionStyle = exportOptions?.captionStyle || customCaptionStyle;

    // Assemble beats scene-by-scene matching the exact preview timeline logic in RenderPage.tsx
    const allBeats: VisualBeat[] = [];
    scenes.forEach((scene) => {
      const sceneBeats = beatsFromDb
        .filter((b) => b.sceneId === scene.id)
        .sort((a, b) => a.beatIndex - b.beatIndex);

      if (sceneBeats.length > 0) {
        sceneBeats.forEach((b, idx) => {
          const isLast = idx === sceneBeats.length - 1;
          const endOffset = isLast ? scene.durationMs : b.endOffsetMs;
          const durationMs = Math.max(500, endOffset - b.startOffsetMs);
          allBeats.push({
            ...b,
            durationMs
          });
        });
      } else {
        allBeats.push({
          id: `fallback_${scene.id}`,
          sceneId: scene.id,
          projectId: scene.projectId,
          beatIndex: 0,
          startOffsetMs: 0,
          endOffsetMs: scene.durationMs,
          durationMs: scene.durationMs,
          shotType: 'WIDE_SCENE' as any,
          visualConcept: scene.scriptText,
          environmentDescription: 'Storybook scene',
          imagePrompt: scene.imagePrompt,
          imagePath: scene.imagePath,
          generationStatus: 'READY',
          motion: 'STATIC',
          transition: 'CUT',
          transitionDurationMs: 0,
          keywordEnabled: false
        });
      }
    });

    ProjectRepository.update(projectId, { status: ProjectStatus.RENDERING });

    const emitProgress = (stage: string, percent: number) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('render:progress', {
          projectId,
          stage,
          percent
        });
      }
    };

    try {
      // 1. Generate ASS Captions & Keywords (Section 13, 14)
      emitProgress('Generating ASS captions & keyword overlays', 10);
      const { assPath } = this.generateAss(projectId, sceneConfigs, finalCaptionStyle);

      // 2. Prepare Master Voice Audio Track (Section 20: continuous audio rule)
      const masterVoicePath = path.join(project.projectPath, 'audio', 'master_voice.wav');
      if (!fs.existsSync(masterVoicePath)) {
        // Fallback: concatenate scene audio clips into master_voice.wav without cuts
        const readyScenes = scenes.filter((s) => s.audioPath && fs.existsSync(s.audioPath));
        if (readyScenes.length > 0) {
          const listPath = path.join(project.projectPath, 'temp', 'voice_concat.txt');
          fs.mkdirSync(path.dirname(listPath), { recursive: true });
          const entries = readyScenes.map((s) => `file '${s.audioPath!.replace(/\\/g, '/')}'`).join('\n');
          fs.writeFileSync(listPath, entries, 'utf8');
          await execFileAsync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', masterVoicePath]);
        }
      }

      if (!fs.existsSync(masterVoicePath)) {
        throw new Error('Master narration voice file not found: audio/master_voice.wav');
      }

      // Exact Audio-Video duration alignment: probe master voice audio duration
      try {
        const { stdout: probeOut } = await execFileAsync('ffprobe', [
          '-v', 'error',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          masterVoicePath
        ]);
        const masterDurationSec = parseFloat(probeOut.trim());
        if (masterDurationSec > 0 && allBeats.length > 0) {
          const priorDurationMs = allBeats.slice(0, -1).reduce((sum, b) => sum + b.durationMs, 0);
          const targetLastDurationMs = Math.max(500, Math.round((masterDurationSec * 1000) - priorDurationMs));
          allBeats[allBeats.length - 1].durationMs = targetLastDurationMs;
          console.log(`[RenderService] Aligned video timeline to master voice duration: ${masterDurationSec.toFixed(2)}s (Last beat: ${targetLastDurationMs}ms)`);
        }
      } catch (probeErr) {
        console.warn('[RenderService] ffprobe audio duration probe notice:', probeErr);
      }

      // 3. Render individual Visual Beat video segments
      const segmentPaths: string[] = [];
      const totalBeats = allBeats.length;
      const tempSegmentsDir = path.join(project.projectPath, 'temp', 'beat_segments');
      fs.mkdirSync(tempSegmentsDir, { recursive: true });

      for (let i = 0; i < totalBeats; i++) {
        const beat = allBeats[i];
        const segNum = String(i + 1).padStart(4, '0');
        const segmentPath = path.join(tempSegmentsDir, `beat_${segNum}.mp4`);

        emitProgress(`Rendering Visual Beat #${i + 1} of ${totalBeats} (${beat.shotType})`, 15 + Math.round((i / totalBeats) * 55));

        if (!beat.imagePath || !fs.existsSync(beat.imagePath)) {
          throw new Error(`Missing image asset for visual beat #${i + 1}`);
        }

        await this.renderBeatSegment(beat, segmentPath, finalColorFilter, targetWidth, targetHeight, fps);
        segmentPaths.push(segmentPath);
      }

      emitProgress('Assembling visual timeline track', 75);

      const tempDir = path.join(project.projectPath, 'temp');
      fs.mkdirSync(tempDir, { recursive: true });
      const concatListPath = path.join(tempDir, 'beat_concat_list.txt');
      const concatContent = segmentPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
      fs.writeFileSync(concatListPath, concatContent, 'utf8');

      const tempVideoOnlyPath = path.join(tempDir, 'temp_video_only.mp4');
      await execFileAsync('ffmpeg', [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-c', 'copy',
        tempVideoOnlyPath
      ]);

      const outputFileName = exportOptions?.outputFileName || 'master.mp4';
      const masterOutputDir = path.join(project.projectPath, 'output');
      fs.mkdirSync(masterOutputDir, { recursive: true });
      const masterOutputPath = path.join(masterOutputDir, outputFileName);

      // 4. Mix Ambient BGM if present (online streaming catalog or local file)
      let finalAudioTrack = masterVoicePath;
      let bgmPath = project.musicPath;
      if (bgmPath === 'none' || bgmPath === '') {
        bgmPath = undefined;
      } else if (!bgmPath) {
        bgmPath = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Deliberate%20Thought.mp3';
      }

      const isOnlineBgm = bgmPath && (bgmPath.startsWith('http://') || bgmPath.startsWith('https://'));
      if (bgmPath && (isOnlineBgm || fs.existsSync(bgmPath))) {
        emitProgress('Mixing continuous narration with background music', 85);
        const mixedAudioPath = path.join(tempDir, 'master_ducked_audio.wav');
        try {
          await AudioService.mixNarrationAndBgm(masterVoicePath, bgmPath, mixedAudioPath, 6, finalBgmVolume);
          finalAudioTrack = mixedAudioPath;
        } catch (bgmErr) {
          console.warn('[RenderService] BGM mixing warning, using clean narration:', bgmErr);
        }
      }

      // 5. Final Master Encode: Video + Continuous Audio + Burned ASS Subtitles
      emitProgress(`Encoding ${resolution.toUpperCase()} MP4 video...`, 92);

      let qualityArgs: string[] = ['-preset', 'fast', '-crf', '18'];
      if (quality === 'high') {
        qualityArgs = ['-preset', 'medium', '-crf', '16', '-b:v', '18M'];
      } else if (quality === 'fast') {
        qualityArgs = ['-preset', 'veryfast', '-crf', '22', '-b:v', '8M'];
      }

      const vfArgs: string[] = [];
      if (burnSubtitles) {
        const escapedAss = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        vfArgs.push('-vf', `ass='${escapedAss}'`);
      }

      await execFileAsync('ffmpeg', [
        '-y',
        '-i', tempVideoOnlyPath,
        '-i', finalAudioTrack,
        ...vfArgs,
        '-aspect', '16:9',
        '-s', `${targetWidth}x${targetHeight}`,
        '-r', String(fps),
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'libx264',
        ...qualityArgs,
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        masterOutputPath
      ]);

      emitProgress('Video generation completed successfully!', 100);

      ProjectRepository.update(projectId, { status: ProjectStatus.COMPLETE });
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('render:complete', { projectId, outputPath: masterOutputPath });
      }

      return masterOutputPath;
    } catch (err: any) {
      console.error('[RenderService] Render error:', err);
      ProjectRepository.update(projectId, { status: ProjectStatus.ERROR });
      throw err;
    }
  }
}
