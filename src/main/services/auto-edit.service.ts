import { SceneRepository } from '../database/repositories/scene.repository';
import { VisualBeatRepository } from '../database/repositories/visual-beat.repository';
import { ProjectRepository } from '../database/repositories/project.repository';
import { RenderService } from './render.service';
import { Scene, MotionType, TransitionType, ApprovalStatus, ProjectStatus, CaptionStyleConfig } from '../../shared/types';
import { CAPTION_PRESETS, ONLINE_BGM_TRACKS, DEFAULT_HIGHLIGHT_WORDS } from '../../shared/constants';

export interface AiDirectorDecision {
  genre: 'GHIBLI_FANTASY' | 'CYBERPUNK_SCIFI' | 'DARK_NOIR' | 'HIGH_IMPACT_VIRAL' | 'ZEN_MINIMAL';
  styleTitle: string;
  narrativeTone: string;
  recommendedVoiceId: string;
  voiceName: string;
  voiceSpeed: number;
  captionPresetKey: string;
  captionStyle: CaptionStyleConfig;
  bgmId: string;
  bgmTitle: string;
  bgmStreamUrl: string;
  bgmVolume: number;
  colorFilter: string;
  videoEffect: string;
  pacingSummary: string;
}

export interface HardEditResult {
  scenes: Scene[];
  decision: AiDirectorDecision;
}

export class AutoEditService {
  /**
   * AI Hard Editing & Creative Director Engine:
   * Semantically analyzes narrative script to autonomously decide:
   * 1. Creative Genre & Narrative Mood
   * 2. Edge Neural Voice narrator & pacing
   * 3. Thematic Caption Style preset & contextual keyword highlights
   * 4. Background Music track & audio ducking volume
   * 5. Color grading visual filter & zero-download procedural video effects
   * 6. Multi-axis animator camera choreography & 3-act narrative arc transitions
   */
  static analyzeScriptForDirector(scriptText: string): AiDirectorDecision {
    const text = (scriptText || '').toLowerCase();

    // Scoring heuristics based on semantic vocabulary
    let ghibliScore = 0;
    let cyberpunkScore = 0;
    let noirScore = 0;
    let viralScore = 0;
    let zenScore = 0;

    const ghibliKeywords = ['forest', 'magic', 'castle', 'journey', 'clouds', 'wind', 'memory', 'dream', 'gentle', 'spirit', 'whisper', 'garden', 'mountain', 'tree', 'river', 'anime', 'valley', 'village', 'lost', 'forgotten', 'ancient', 'storybook'];
    const cyberpunkKeywords = ['neon', 'cyber', 'matrix', 'robot', 'code', 'future', 'digital', 'city', 'tech', 'android', 'synthetic', 'glitch', 'rogue', 'hacker', 'network', 'ai', 'data', 'terminal', 'system', 'tokyo'];
    const noirKeywords = ['shadow', 'dark', 'detective', 'murder', 'crime', 'secret', 'killer', 'evidence', 'mystery', 'truth', 'night', 'rain', 'noir', 'victim', 'suspect', 'investigation', 'danger', 'gun', 'blood'];
    const viralKeywords = ['money', 'success', 'viral', 'challenge', 'millionaire', 'win', 'secret', 'hack', 'growth', 'billionaire', 'rules', 'habit', 'business', 'profit', 'rich', 'financial', 'dollar', 'invest', 'hustle'];
    const zenKeywords = ['lake', 'morning', 'sunrise', 'breath', 'meditation', 'calm', 'silence', 'peace', 'water', 'sunset', 'ocean', 'horizon', 'soul', 'stillness', 'breathe', 'mind', 'serene', 'tranquil'];

    ghibliKeywords.forEach(k => { if (text.includes(k)) ghibliScore += 2; });
    cyberpunkKeywords.forEach(k => { if (text.includes(k)) cyberpunkScore += 2; });
    noirKeywords.forEach(k => { if (text.includes(k)) noirScore += 2; });
    viralKeywords.forEach(k => { if (text.includes(k)) viralScore += 2; });
    zenKeywords.forEach(k => { if (text.includes(k)) zenScore += 2; });

    // Extract dynamic contextual highlight words from text
    const words = text.split(/[^a-z0-9]+/).filter(w => w.length >= 5);
    const wordFreq: Record<string, number> = {};
    words.forEach(w => {
      if (!['about', 'after', 'again', 'being', 'their', 'there', 'which', 'would', 'could', 'should'].includes(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });

    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([w]) => w);

    const mergedHighlights = Array.from(new Set([...topWords, ...DEFAULT_HIGHLIGHT_WORDS]));

    // Determine winning genre
    const maxScore = Math.max(ghibliScore, cyberpunkScore, noirScore, viralScore, zenScore);

    if (cyberpunkScore === maxScore && cyberpunkScore > 2) {
      const bgm = ONLINE_BGM_TRACKS.find(t => t.id === 'deliberate-thought') || ONLINE_BGM_TRACKS[0];
      const basePreset = CAPTION_PRESETS.NEON_CYBER;
      return {
        genre: 'CYBERPUNK_SCIFI',
        styleTitle: 'Cyberpunk Neon Pulse',
        narrativeTone: 'High-tech, futuristic, punchy & atmospheric',
        recommendedVoiceId: 'en-US-GuyNeural',
        voiceName: 'Guy (Modern & Confident)',
        voiceSpeed: 1.05,
        captionPresetKey: 'NEON_CYBER',
        captionStyle: { ...basePreset, highlightWords: mergedHighlights },
        bgmId: bgm.id,
        bgmTitle: bgm.name,
        bgmStreamUrl: bgm.streamUrl,
        bgmVolume: 0.24,
        colorFilter: 'teal_orange',
        videoEffect: 'chromatic_split',
        pacingSummary: 'Snappy hard cuts, RGB chromatic aberration, and neon matrix emphasis'
      };
    }

    if (noirScore === maxScore && noirScore > 2) {
      const bgm = ONLINE_BGM_TRACKS.find(t => t.id === 'hidden-past') || ONLINE_BGM_TRACKS.find(t => t.id === 'deliberate-thought') || ONLINE_BGM_TRACKS[0];
      const basePreset = CAPTION_PRESETS.CINEMATIC_LETTERBOX;
      return {
        genre: 'DARK_NOIR',
        styleTitle: 'Dark Noir Investigative',
        narrativeTone: 'Moody, suspenseful, deliberate & cinematic',
        recommendedVoiceId: 'en-US-ChristopherNeural',
        voiceName: 'Christopher (Deep & Authoritative)',
        voiceSpeed: 0.95,
        captionPresetKey: 'CINEMATIC_LETTERBOX',
        captionStyle: { ...basePreset, highlightWords: mergedHighlights },
        bgmId: bgm.id,
        bgmTitle: bgm.name,
        bgmStreamUrl: bgm.streamUrl,
        bgmVolume: 0.18,
        colorFilter: 'moody_rain',
        videoEffect: 'cinematic_vignette',
        pacingSummary: 'Slow dramatic push-ins, deep vignette focus, and suspenseful dissolves'
      };
    }

    if (viralScore === maxScore && viralScore > 2) {
      const bgm = ONLINE_BGM_TRACKS.find(t => t.id === 'carefree') || ONLINE_BGM_TRACKS[0];
      const basePreset = CAPTION_PRESETS.HORMOZI_POP;
      return {
        genre: 'HIGH_IMPACT_VIRAL',
        styleTitle: 'Viral High-Retention Impact',
        narrativeTone: 'Fast-paced, bold, motivational & attention-grabbing',
        recommendedVoiceId: 'en-US-AndrewMultilingualNeural',
        voiceName: 'Andrew (Flagship Natural Storyteller)',
        voiceSpeed: 1.08,
        captionPresetKey: 'HORMOZI_POP',
        captionStyle: { ...basePreset, highlightWords: mergedHighlights },
        bgmId: bgm.id,
        bgmTitle: bgm.name,
        bgmStreamUrl: bgm.streamUrl,
        bgmVolume: 0.22,
        colorFilter: 'teal_orange',
        videoEffect: 'flash_impact',
        pacingSummary: 'High-dopamine snap zooms, kinetic punch-ins, and bold word highlights'
      };
    }

    if (zenScore === maxScore && zenScore > 2) {
      const bgm = ONLINE_BGM_TRACKS.find(t => t.id === 'meditation-impromptu') || ONLINE_BGM_TRACKS.find(t => t.id === 'clear-waters') || ONLINE_BGM_TRACKS[0];
      const basePreset = CAPTION_PRESETS.MINIMALIST_LUXURY;
      return {
        genre: 'ZEN_MINIMAL',
        styleTitle: 'Zen Mindfulness & Luxury',
        narrativeTone: 'Serene, breathing room, elegant & deeply calming',
        recommendedVoiceId: 'en-US-AvaMultilingualNeural',
        voiceName: 'Ava (Warm & Conversational)',
        voiceSpeed: 0.92,
        captionPresetKey: 'MINIMALIST_LUXURY',
        captionStyle: { ...basePreset, highlightWords: mergedHighlights },
        bgmId: bgm.id,
        bgmTitle: bgm.name,
        bgmStreamUrl: bgm.streamUrl,
        bgmVolume: 0.16,
        colorFilter: 'golden_hour',
        videoEffect: 'warm_light_leak',
        pacingSummary: 'Slow serene drifts, sunset light leaks, and elegant dissolves'
      };
    }

    // Default / Master Ghibli Storyteller
    const bgm = ONLINE_BGM_TRACKS.find(t => t.id === 'clear-waters') || ONLINE_BGM_TRACKS[0];
    const basePreset = CAPTION_PRESETS.GHIBLI_STORYBOOK;
    return {
      genre: 'GHIBLI_FANTASY',
      styleTitle: 'Studio Ghibli Cinematic Storybook',
      narrativeTone: 'Warm nostalgic fantasy, emotional, lyrical & heartfelt',
      recommendedVoiceId: 'en-US-EmmaMultilingualNeural',
      voiceName: 'Emma (Gentle Storybook)',
      voiceSpeed: 1.0,
      captionPresetKey: 'GHIBLI_STORYBOOK',
      captionStyle: { ...basePreset, highlightWords: mergedHighlights },
      bgmId: bgm.id,
      bgmTitle: bgm.name,
      bgmStreamUrl: bgm.streamUrl,
      bgmVolume: 0.20,
      colorFilter: 'ghibli_warm',
      videoEffect: 'dreamy_bloom',
      pacingSummary: 'Lush watercolor camera pans, 300ms cross-dissolves, and storybook typography'
    };
  }

  /**
   * Applies the AI Hard Edit (Master Animator & Creative Director) pipeline:
   * - 3-Act Narrative Arc Choreography (Hook, Journey, Climax/Resolution)
   * - Multi-axis camera choreography preventing visual fatigue
   * - Zero-download procedural video effects
   * - Voice and Pace selection
   * - Thematic BGM and audio ducking curves
   * - Synced kinetic subtitles with power-word highlights
   * - Pre-generates synchronized ASS/SRT files
   */
  static applyHardEdit(projectId: string): HardEditResult {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const scenes = SceneRepository.listByProjectId(projectId);
    if (scenes.length === 0) return { scenes: [], decision: this.analyzeScriptForDirector('') };

    const allBeats = VisualBeatRepository.listByProjectId(projectId);

    // 1. AI Director Script & Mood Analysis
    const fullScript = scenes.map((s) => s.scriptText).join(' ');
    const decision = this.analyzeScriptForDirector(fullScript);

    console.log(`[AiHardEdit] Orchestrating project "${project.name}": ${decision.styleTitle} (${decision.narrativeTone})`);

    const triggerKeywords: { [k: string]: string } = {
      journey: 'JOURNEY',
      travel: 'VOYAGE',
      distance: 'DISTANCE',
      memory: 'MEMORY',
      remember: 'MEMORY',
      whisper: 'WHISPER',
      wonder: 'WONDER',
      ancient: 'ANCIENT',
      solitude: 'SOLITUDE',
      alone: 'SOLITUDE',
      destiny: 'DESTINY',
      hope: 'HOPE',
      secret: 'SECRET',
      silence: 'SILENCE',
      heart: 'HEART',
      promise: 'PROMISE',
      freedom: 'FREEDOM',
      truth: 'TRUTH',
      danger: 'DANGER',
      power: 'POWER'
    };

    const totalBeats = Math.max(1, allBeats.length);
    let globalBeatIndex = 0;

    // 2. 3-Act Master Animator Choreography
    scenes.forEach((scene) => {
      const sceneBeats = allBeats.filter((b) => b.sceneId === scene.id);

      sceneBeats.forEach((beat) => {
        const beatProgress = globalBeatIndex / totalBeats; // 0.0 to 1.0

        let chosenMotion: 'STATIC' | 'PUSH_IN' | 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN_LEFT' | 'PAN_RIGHT' | 'PUNCH_IN' = 'STATIC';
        let chosenTransition: 'CUT' | 'DISSOLVE' | 'FADE' | 'FADE_WHITE' | 'WIPE_LEFT' | 'WIPE_RIGHT' | 'SMOOTH_LEFT' | 'SMOOTH_RIGHT' = 'DISSOLVE';
        let transitionDurationMs = 600;
        let chosenEffect = decision.videoEffect;

        const textLower = (beat.visualConcept + ' ' + scene.scriptText).toLowerCase();
        let detectedKeyword: string | undefined = beat.keyword;

        if (!detectedKeyword) {
          for (const [trig, kw] of Object.entries(triggerKeywords)) {
            if (textLower.includes(trig)) {
              detectedKeyword = kw;
              break;
            }
          }
        }

        // --- ACT 1: THE HOOK (First 20% of beats) - High Energy Cinematic Transitions ---
        if (beatProgress < 0.20) {
          if (globalBeatIndex === 0) {
            chosenMotion = 'PUNCH_IN';
            chosenTransition = 'DISSOLVE';
            transitionDurationMs = 600;
            chosenEffect = decision.genre === 'HIGH_IMPACT_VIRAL' ? 'flash_impact' : 'anamorphic_letterbox';
          } else {
            chosenMotion = 'PUSH_IN';
            chosenTransition = decision.genre === 'HIGH_IMPACT_VIRAL' ? 'FADE_WHITE' : 'DISSOLVE';
            transitionDurationMs = 550;
            chosenEffect = decision.videoEffect;
          }
        }
        // --- ACT 3: THE CLIMAX & FINALE (Last 20% of beats) - High Impact Climax & Finale ---
        else if (beatProgress >= 0.80) {
          if (globalBeatIndex === totalBeats - 1) {
            // Ultimate finale beat
            chosenMotion = 'ZOOM_OUT';
            chosenTransition = 'FADE';
            transitionDurationMs = 750;
            chosenEffect = decision.genre === 'GHIBLI_FANTASY' ? 'bokeh_particles' : 'cinematic_vignette';
          } else if (globalBeatIndex === totalBeats - 2) {
            // Climax build
            chosenMotion = 'PUSH_IN';
            chosenTransition = 'FADE_WHITE';
            transitionDurationMs = 700;
            chosenEffect = 'golden_embers';
          } else {
            chosenMotion = 'ZOOM_IN';
            chosenTransition = 'DISSOLVE';
            transitionDurationMs = 650;
            chosenEffect = decision.videoEffect;
          }
        }
        // --- ACT 2: THE JOURNEY (Middle 60% of beats) - Dynamic Multi-Axis High Transitions ---
        else {
          // Multi-axis alternating camera choreography with high-impact transitions
          const act2Step = globalBeatIndex % 5;
          switch (act2Step) {
            case 0:
              chosenMotion = 'PAN_LEFT';
              chosenTransition = 'DISSOLVE';
              transitionDurationMs = 650;
              break;
            case 1:
              chosenMotion = 'ZOOM_IN';
              chosenTransition = 'SMOOTH_LEFT';
              transitionDurationMs = 550;
              break;
            case 2:
              chosenMotion = 'PAN_RIGHT';
              chosenTransition = 'WIPE_RIGHT';
              transitionDurationMs = 600;
              break;
            case 3:
              chosenMotion = 'PUSH_IN';
              chosenTransition = 'FADE_WHITE';
              transitionDurationMs = 500;
              break;
            case 4:
            default:
              chosenMotion = 'STATIC';
              chosenTransition = 'DISSOLVE';
              transitionDurationMs = 650;
              break;
          }

          // Cycle thematic secondary effects
          if (decision.genre === 'GHIBLI_FANTASY') {
            chosenEffect = globalBeatIndex % 2 === 0 ? 'dreamy_bloom' : 'bokeh_particles';
          } else if (decision.genre === 'CYBERPUNK_SCIFI') {
            chosenEffect = globalBeatIndex % 2 === 0 ? 'chromatic_split' : 'vhs_retro';
          } else if (decision.genre === 'DARK_NOIR') {
            chosenEffect = globalBeatIndex % 2 === 0 ? 'cinematic_vignette' : 'silent_1920s';
          } else if (decision.genre === 'ZEN_MINIMAL') {
            chosenEffect = globalBeatIndex % 2 === 0 ? 'warm_light_leak' : 'atmospheric_fog';
          } else {
            chosenEffect = globalBeatIndex % 3 === 0 ? 'flash_impact' : 'film_grain_35mm';
          }
        }

        VisualBeatRepository.update(beat.id, {
          motion: chosenMotion,
          transition: chosenTransition,
          transitionDurationMs,
          keyword: detectedKeyword,
          keywordEnabled: detectedKeyword !== undefined,
          videoEffect: chosenEffect
        });

        globalBeatIndex++;
      });

      // Update scene-level metadata
      SceneRepository.update(scene.id, {
        captionText: scene.captionText || scene.scriptText,
        captionEnabled: true,
        motionType: (sceneBeats[0]?.motion as any) || MotionType.STATIC,
        transitionType: (sceneBeats[0]?.transition as any) || TransitionType.DISSOLVE,
        approvalStatus: ApprovalStatus.APPROVED,
        videoEffect: sceneBeats[0]?.videoEffect || decision.videoEffect
      });
    });

    // 3. Persist AI Creative Director Decisions to Project
    ProjectRepository.update(projectId, {
      captionStyle: decision.captionStyle,
      musicPath: decision.bgmStreamUrl,
      voiceId: decision.recommendedVoiceId,
      defaultVideoEffect: decision.videoEffect,
      status: ProjectStatus.READY
    });

    // 4. Pre-generate synchronized ASS and SRT subtitle files
    try {
      RenderService.generateAss(projectId, undefined, decision.captionStyle);
    } catch (e) {
      console.warn('[AutoEditService] Notice pre-generating ASS subtitles:', e);
    }

    const updatedScenes = SceneRepository.listByProjectId(projectId);
    const updatedBeats = VisualBeatRepository.listByProjectId(projectId);
    updatedScenes.forEach((s) => {
      s.visualBeats = updatedBeats.filter((b) => b.sceneId === s.id);
    });

    return { scenes: updatedScenes, decision };
  }
}
