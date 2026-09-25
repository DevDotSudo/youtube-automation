import { ProjectRepository } from '../database/repositories/project.repository';
import { SceneRepository } from '../database/repositories/scene.repository';
import { VisualBeatRepository } from '../database/repositories/visual-beat.repository';
import { Scene, MotionType, TransitionType, ApprovalStatus, ProjectStatus, CaptionStyleConfig, VisualShotType } from '../../shared/types';
import { CAPTION_PRESETS, ONLINE_BGM_TRACKS } from '../../shared/constants';

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
  pacingCadence: 'FAST_HOOK' | 'DYNAMIC_STORY' | 'CONTEMPLATIVE';
}

export interface HardEditResult {
  scenes: Scene[];
  decision: AiDirectorDecision;
}

export class AutoEditService {
  /**
   * Professional Film & Social Media AI Creative Director Engine:
   * Semantically analyzes narrative script, visual niche, and shot composition to decide:
   * 1. Dynamic narrative tone & visual atmosphere
   * 2. Edge Neural Voice narrator & pacing
   * 3. Cinematic Color grading filter matching niche
   * 4. Multi-axis camera choreography & eye-trace match cutting
   * 5. Thematic BGM ducking curves
   */
  static analyzeScriptForDirector(scriptText: string, visualNiche?: string): AiDirectorDecision {
    const text = (scriptText || '').toLowerCase();
    const effectiveNiche = visualNiche || (
      text.includes('stoic') || text.includes('philosophy') ? 'stoic_philosophy' :
      text.includes('crime') || text.includes('detective') || text.includes('murder') ? 'true_crime_noir' :
      text.includes('money') || text.includes('wealth') || text.includes('billion') ? 'money_mindset' :
      text.includes('cyber') || text.includes('neon') || text.includes('space') ? 'cyberpunk_future' :
      'studio_ghibli'
    );

    // Map visual niche directly to cinematic genre if present
    if (effectiveNiche === 'stoic_philosophy' || effectiveNiche === 'stoic_discipline') {
      const bgm = ONLINE_BGM_TRACKS.find(t => t.id === 'deliberate-thought') || ONLINE_BGM_TRACKS[0];
      return {
        genre: 'ZEN_MINIMAL',
        styleTitle: 'Stoic Chiaroscuro & Classical Depth',
        narrativeTone: 'Ancient, solemn, disciplined & profound',
        recommendedVoiceId: 'en-US-BrianMultilingualNeural',
        voiceName: 'Brian (Wise & Authoritative)',
        voiceSpeed: 0.98,
        captionPresetKey: 'CINEMATIC_LETTERBOX',
        captionStyle: CAPTION_PRESETS.CINEMATIC_LETTERBOX,
        bgmId: bgm.id,
        bgmTitle: bgm.name,
        bgmStreamUrl: bgm.streamUrl,
        bgmVolume: 0.16,
        colorFilter: 'warm_vintage',
        videoEffect: 'anamorphic_letterbox',
        pacingCadence: 'DYNAMIC_STORY'
      };
    }

    if (effectiveNiche === 'true_crime_noir') {
      const bgm = ONLINE_BGM_TRACKS.find(t => t.id === 'deliberate-thought') || ONLINE_BGM_TRACKS[0];
      return {
        genre: 'DARK_NOIR',
        styleTitle: 'Cold War Noir & Forensic Shadows',
        narrativeTone: 'Investigative, tense, mysterious & gritty',
        recommendedVoiceId: 'en-US-AndrewMultilingualNeural',
        voiceName: 'Andrew (Deep & Resonant)',
        voiceSpeed: 1.0,
        captionPresetKey: 'MINIMALIST_LUXURY',
        captionStyle: CAPTION_PRESETS.MINIMALIST_LUXURY,
        bgmId: bgm.id,
        bgmTitle: bgm.name,
        bgmStreamUrl: bgm.streamUrl,
        bgmVolume: 0.18,
        colorFilter: 'film_noir',
        videoEffect: 'vintage_noise',
        pacingCadence: 'FAST_HOOK'
      };
    }

    if (effectiveNiche === 'money_mindset') {
      const bgm = ONLINE_BGM_TRACKS.find(t => t.id === 'ambient-pulse') || ONLINE_BGM_TRACKS[0];
      return {
        genre: 'HIGH_IMPACT_VIRAL',
        styleTitle: 'Billionaire High-Impact Cadence',
        narrativeTone: 'Aggressive, sharp, ambitious & actionable',
        recommendedVoiceId: 'en-US-GuyNeural',
        voiceName: 'Guy (Punchy & Confident)',
        voiceSpeed: 1.05,
        captionPresetKey: 'HORMOZI_POP',
        captionStyle: CAPTION_PRESETS.HORMOZI_POP,
        bgmId: bgm.id,
        bgmTitle: bgm.name,
        bgmStreamUrl: bgm.streamUrl,
        bgmVolume: 0.22,
        colorFilter: 'high_contrast',
        videoEffect: 'flash_impact',
        pacingCadence: 'FAST_HOOK'
      };
    }

    if (effectiveNiche === 'cyberpunk_future' || effectiveNiche === 'cosmic_scifi') {
      const bgm = ONLINE_BGM_TRACKS.find(t => t.id === 'deliberate-thought') || ONLINE_BGM_TRACKS[0];
      return {
        genre: 'CYBERPUNK_SCIFI',
        styleTitle: 'Cosmic Anamorphic & Neon Lore',
        narrativeTone: 'Vast, cosmic scale, futuristic & technological',
        recommendedVoiceId: 'en-US-AndrewMultilingualNeural',
        voiceName: 'Andrew (Epic & Deep)',
        voiceSpeed: 1.02,
        captionPresetKey: 'NEON_CYBER',
        captionStyle: CAPTION_PRESETS.NEON_CYBER,
        bgmId: bgm.id,
        bgmTitle: bgm.name,
        bgmStreamUrl: bgm.streamUrl,
        bgmVolume: 0.22,
        colorFilter: 'teal_orange',
        videoEffect: 'chromatic_split',
        pacingCadence: 'DYNAMIC_STORY'
      };
    }

    // Default: Studio Ghibli Storytelling
    const bgm = ONLINE_BGM_TRACKS.find(t => t.id === 'morning-meditation') || ONLINE_BGM_TRACKS[0];
    return {
      genre: 'GHIBLI_FANTASY',
      styleTitle: 'Ghibli Storybook & Atmospheric Wonder',
      narrativeTone: 'Evocative, peaceful, nostalgic & heartwarming',
      recommendedVoiceId: 'en-US-AndrewMultilingualNeural',
      voiceName: 'Andrew (Storyteller Warmth)',
      voiceSpeed: 0.98,
      captionPresetKey: 'GHIBLI_STORYBOOK',
      captionStyle: CAPTION_PRESETS.GHIBLI_STORYBOOK,
      bgmId: bgm.id,
      bgmTitle: bgm.name,
      bgmStreamUrl: bgm.streamUrl,
      bgmVolume: 0.16,
      colorFilter: 'ghibli_watercolor',
      videoEffect: 'dreamy_bloom',
      pacingCadence: 'DYNAMIC_STORY'
    };
  }

  /**
   * Applies Professional Film & Social Media AI Hard Editing:
   * - 3-Act Narrative Pacing (Hook $ightarrow$ Tension $ightarrow$ Climax $ightarrow$ Outro)
   * - Eye-Trace Match Cutting (Wide to Close-up cuts inward; Action triggers punch-in)
   * - Voice-Image Cadence & Zero Burned Captions
   */
  static applyHardEdit(projectId: string): HardEditResult {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const scenes = SceneRepository.listByProjectId(projectId);
    if (scenes.length === 0) return { scenes: [], decision: this.analyzeScriptForDirector('') };

    const allBeats = VisualBeatRepository.listByProjectId(projectId);

    // 1. AI Director Script & Visual Niche Analysis
    const fullScript = scenes.map((s) => s.scriptText).join(' ');
    const decision = this.analyzeScriptForDirector(fullScript, project.visualNiche);

    console.log(`[AiHardEdit] Professional Director orchestrating "${project.name}": ${decision.styleTitle} (${decision.narrativeTone})`);

    const totalBeats = Math.max(1, allBeats.length);
    let globalBeatIndex = 0;
    let lastShotType: VisualShotType | undefined = undefined;

    // 2. Professional Film Editorial Choreography
    scenes.forEach((scene, sceneIdx) => {
      const sceneBeats = allBeats.filter((b) => b.sceneId === scene.id);

      sceneBeats.forEach((beat, bIdx) => {
        const beatProgress = globalBeatIndex / totalBeats; // 0.0 to 1.0
        const textLower = ((beat.visualConcept || '') + ' ' + (scene.scriptText || '')).toLowerCase();

        // Editorial rule: semantic verbs & keywords
        const isActionShock = /suddenly|shattered|danger|warning|shock|explosion|strike|break|trap|never|fear/i.test(textLower);
        const isTravelMove = /journey|walk|wander|road|path|across|travel|flying|voyage|drift|distance/i.test(textLower);
        const isReflection = /remember|silence|ancient|memory|thought|soul|whisper|peace|eternity|stare|looking/i.test(textLower);
        const isSecretReveal = /secret|revealed|discovered|truth|uncovered|hidden|found|eyes|key/i.test(textLower);

        let chosenMotion: 'STATIC' | 'PUSH_IN' | 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN_LEFT' | 'PAN_RIGHT' | 'PUNCH_IN' = 'PUSH_IN';
        let chosenTransition: 'CUT' | 'DISSOLVE' | 'FADE' | 'FADE_WHITE' | 'WIPE_LEFT' | 'WIPE_RIGHT' | 'SMOOTH_LEFT' | 'SMOOTH_RIGHT' = 'CUT';
        let transitionDurationMs = 0;
        let chosenEffect = decision.videoEffect;
        let chosenInAnimation: string = 'FADE_IN';
        let chosenOutAnimation: string = 'FADE_OUT';
        let inAnimDurationMs: number = 350;
        let outAnimDurationMs: number = 350;

        // --- EDITORIAL MATCH CUTTING & IN/OUT ANIMATION CHOREOGRAPHY ---
        if (bIdx === 0 && sceneIdx === 0) {
          // Absolute first beat of project: Hook viewer with high-energy strobe in & forward snap
          chosenMotion = 'PUNCH_IN';
          chosenTransition = 'CUT';
          chosenEffect = 'anamorphic_letterbox';
          chosenInAnimation = 'FLASH_WHITE';
          chosenOutAnimation = 'ZOOM_OUT';
          inAnimDurationMs = 300;
          outAnimDurationMs = 300;
        } else if (beatProgress < 0.18) {
          // ACT 1: THE RETENTION HOOK (First ~20%) - Fast, sharp, arresting
          if (isActionShock || isSecretReveal) {
            chosenMotion = 'PUNCH_IN';
            chosenTransition = 'CUT';
            chosenInAnimation = 'POP_IN';
            chosenOutAnimation = 'FLASH_WHITE';
            inAnimDurationMs = 250;
            outAnimDurationMs = 250;
          } else {
            chosenMotion = 'PUSH_IN';
            chosenTransition = 'CUT';
            chosenInAnimation = 'ZOOM_IN';
            chosenOutAnimation = 'SLIDE_LEFT';
            inAnimDurationMs = 300;
            outAnimDurationMs = 300;
          }
          chosenEffect = decision.videoEffect;
        } else if (beatProgress >= 0.85) {
          // ACT 3: THE CLIMAX & OUTRO (Last ~15%)
          if (globalBeatIndex === totalBeats - 1) {
            // Final resolving beat: Lingering pull-out into cinematic dip-to-black blackout
            chosenMotion = 'ZOOM_OUT';
            chosenTransition = 'FADE';
            transitionDurationMs = 500;
            chosenEffect = 'cinematic_vignette';
            chosenInAnimation = 'FADE_IN';
            chosenOutAnimation = 'DIP_BLACK';
            inAnimDurationMs = 400;
            outAnimDurationMs = 750;
          } else if (globalBeatIndex === totalBeats - 2) {
            // Climax epiphany: Dual white flash impact
            chosenMotion = 'PUSH_IN';
            chosenTransition = 'FADE_WHITE';
            transitionDurationMs = 350;
            chosenEffect = 'flash_impact';
            chosenInAnimation = 'FLASH_WHITE';
            chosenOutAnimation = 'FLASH_WHITE';
            inAnimDurationMs = 350;
            outAnimDurationMs = 350;
          } else {
            chosenMotion = 'ZOOM_IN';
            chosenTransition = 'DISSOLVE';
            transitionDurationMs = 300;
            chosenEffect = decision.videoEffect;
            chosenInAnimation = 'ZOOM_IN';
            chosenOutAnimation = 'FADE_OUT';
            inAnimDurationMs = 350;
            outAnimDurationMs = 350;
          }
        } else {
          // ACT 2: RISING NARRATIVE BODY
          if (isActionShock) {
            chosenMotion = 'PUNCH_IN';
            chosenTransition = 'CUT';
            chosenInAnimation = 'POP_IN';
            chosenOutAnimation = 'ZOOM_OUT';
            inAnimDurationMs = 250;
            outAnimDurationMs = 250;
          } else if (isSecretReveal) {
            chosenMotion = 'PUSH_IN';
            chosenTransition = 'CUT';
            chosenInAnimation = 'ZOOM_IN';
            chosenOutAnimation = 'FLASH_WHITE';
            inAnimDurationMs = 300;
            outAnimDurationMs = 250;
          } else if (isTravelMove) {
            chosenMotion = globalBeatIndex % 2 === 0 ? 'PAN_LEFT' : 'PAN_RIGHT';
            chosenTransition = 'SMOOTH_LEFT';
            transitionDurationMs = 300;
            chosenInAnimation = globalBeatIndex % 2 === 0 ? 'SLIDE_RIGHT' : 'SLIDE_LEFT';
            chosenOutAnimation = globalBeatIndex % 2 === 0 ? 'SLIDE_LEFT' : 'SLIDE_RIGHT';
            inAnimDurationMs = 350;
            outAnimDurationMs = 350;
          } else if (isReflection) {
            chosenMotion = 'ZOOM_OUT';
            chosenTransition = 'DISSOLVE';
            transitionDurationMs = 350;
            chosenInAnimation = 'FADE_IN';
            chosenOutAnimation = 'FADE_OUT';
            inAnimDurationMs = 450;
            outAnimDurationMs = 450;
          } else {
            // Match-cut logic based on shot type transition
            if (lastShotType === VisualShotType.WIDE_SCENE && (beat.shotType === VisualShotType.PROP_CLOSEUP || beat.shotType === VisualShotType.REACTION_SHOT)) {
              chosenMotion = 'PUSH_IN';
              chosenTransition = 'CUT';
              chosenInAnimation = 'ZOOM_IN';
              chosenOutAnimation = 'ZOOM_OUT';
              inAnimDurationMs = 300;
              outAnimDurationMs = 300;
            } else if ((lastShotType === VisualShotType.PROP_CLOSEUP || lastShotType === VisualShotType.REACTION_SHOT) && beat.shotType === VisualShotType.WIDE_SCENE) {
              chosenMotion = 'ZOOM_OUT';
              chosenTransition = 'DISSOLVE';
              transitionDurationMs = 300;
              chosenInAnimation = 'ZOOM_OUT';
              chosenOutAnimation = 'FADE_OUT';
              inAnimDurationMs = 350;
              outAnimDurationMs = 350;
            } else {
              const cadence = globalBeatIndex % 4;
              if (cadence === 0) {
                chosenMotion = 'PUSH_IN';
                chosenInAnimation = 'FADE_IN';
                chosenOutAnimation = 'ZOOM_OUT';
              } else if (cadence === 1) {
                chosenMotion = 'PAN_LEFT';
                chosenInAnimation = 'SLIDE_LEFT';
                chosenOutAnimation = 'SLIDE_LEFT';
              } else if (cadence === 2) {
                chosenMotion = 'ZOOM_IN';
                chosenInAnimation = 'ZOOM_IN';
                chosenOutAnimation = 'FADE_OUT';
              } else {
                chosenMotion = 'PAN_RIGHT';
                chosenInAnimation = 'POP_IN';
                chosenOutAnimation = 'SLIDE_RIGHT';
              }

              chosenTransition = bIdx === 0 ? 'DISSOLVE' : 'CUT';
              transitionDurationMs = bIdx === 0 ? 300 : 0;
              inAnimDurationMs = 350;
              outAnimDurationMs = 350;
            }
          }
        }

        lastShotType = beat.shotType;

        // MANDATORY: Ensure EVERY second of images has active camera animation (ZERO static frames)
        if ((chosenMotion as string) === 'STATIC' || !chosenMotion) {
          chosenMotion = globalBeatIndex % 2 === 0 ? 'PUSH_IN' : 'ZOOM_OUT';
        }

        // MANDATORY: Ensure EVERY image has an In-Animation (ZERO 'NONE')
        if (!chosenInAnimation || chosenInAnimation === 'NONE') {
          chosenInAnimation = globalBeatIndex % 2 === 0 ? 'ZOOM_IN' : 'FADE_IN';
        }

        // MANDATORY: Ensure EVERY image has an Out-Animation (ZERO 'NONE')
        if (!chosenOutAnimation || chosenOutAnimation === 'NONE') {
          chosenOutAnimation = globalBeatIndex % 2 === 0 ? 'ZOOM_OUT' : 'FADE_OUT';
        }

        inAnimDurationMs = Math.max(200, Math.min(500, inAnimDurationMs || 350));
        outAnimDurationMs = Math.max(200, Math.min(500, outAnimDurationMs || 350));

        // Apply professional beat updates
        VisualBeatRepository.update(beat.id, {
          motion: chosenMotion,
          transition: chosenTransition,
          transitionDurationMs,
          videoEffect: chosenEffect,
          inAnimation: chosenInAnimation as any,
          outAnimation: chosenOutAnimation as any,
          inAnimationDurationMs: inAnimDurationMs,
          outAnimationDurationMs: outAnimDurationMs
        });

        globalBeatIndex++;
      });

      // Update scene-level metadata with strict zero captions
      SceneRepository.update(scene.id, {
        captionEnabled: false,
        motionType: (sceneBeats[0]?.motion as any) || MotionType.STATIC,
        transitionType: (sceneBeats[0]?.transition as any) || TransitionType.CUT,
        approvalStatus: ApprovalStatus.APPROVED,
        videoEffect: sceneBeats[0]?.videoEffect || decision.videoEffect
      });
    });

    // 3. Persist AI Creative Director Decisions to Project
    ProjectRepository.update(projectId, {
      musicPath: decision.bgmStreamUrl,
      voiceId: decision.recommendedVoiceId,
      defaultVideoEffect: decision.videoEffect,
      status: ProjectStatus.READY
    });

    const updatedScenes = SceneRepository.listByProjectId(projectId);
    const updatedBeats = VisualBeatRepository.listByProjectId(projectId);
    updatedScenes.forEach((s) => {
      s.visualBeats = updatedBeats.filter((b) => b.sceneId === s.id);
    });

    return { scenes: updatedScenes, decision };
  }
}
