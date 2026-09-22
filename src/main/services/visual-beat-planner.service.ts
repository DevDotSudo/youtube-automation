import { PromptService } from './prompt.service';
import { VisualBeat, VisualShotType } from '../../shared/types';
import crypto from 'crypto';

interface ScenePlanningInput {
  id: string;
  projectId: string;
  sceneIndex: number;
  scriptText: string;
  durationMs: number;
  startMs: number;
}

export class VisualBeatPlannerService {
  private static shotTypeCycle: VisualShotType[] = [
    VisualShotType.WIDE_SCENE,
    VisualShotType.MEDIUM_SCENE,
    VisualShotType.PROP_CLOSEUP,
    VisualShotType.ENVIRONMENT_SHOT,
    VisualShotType.REACTION_SHOT,
    VisualShotType.CONCEPT_SHOT
  ];

  private static triggerKeywords: { [word: string]: string } = {
    'journey': 'JOURNEY',
    'travel': 'VOYAGE',
    'distance': 'DISTANCE',
    'memory': 'MEMORY',
    'remember': 'MEMORY',
    'whisper': 'WHISPER',
    'wonder': 'WONDER',
    'ancient': 'ANCIENT',
    'solitude': 'SOLITUDE',
    'alone': 'SOLITUDE',
    'destiny': 'DESTINY',
    'hope': 'HOPE',
    'secret': 'SECRET',
    'silence': 'SILENCE',
    'heart': 'HEART',
    'promise': 'PROMISE',
    'freedom': 'FREEDOM'
  };

  /**
   * Plans 1 or more Visual Beats for a narration scene in Studio Ghibli cinematic rhythm,
   * guaranteeing that the image directly connects to what is spoken in the narration.
   */
  static planSceneBeats(
    scene: ScenePlanningInput,
    previousShotType?: VisualShotType,
    visualNiche?: string
  ): VisualBeat[] {
    const text = (scene.scriptText || '').trim();
    const durationMs = Math.max(1000, scene.durationMs);
    const isHook = scene.startMs < 25000;

    // Split text into semantic sub-clauses if available
    const clauses = this.splitIntoSemanticClauses(text);
    
    // Ghibli Pacing: Atmospheric 4.0 - 6.5 seconds per hand-painted artwork
    let beatCount = 1;
    if (durationMs >= 7000 && durationMs <= 12000) {
      beatCount = 2;
    } else if (durationMs > 12000) {
      beatCount = Math.max(2, Math.round(durationMs / 5500));
    }

    // Allocate exact integer durations that sum up to durationMs
    const durations = this.allocateDurations(durationMs, beatCount);

    const beats: VisualBeat[] = [];
    let currentOffset = 0;
    let lastShot = previousShotType;

    for (let i = 0; i < beatCount; i++) {
      const beatDuration = durations[i];
      // When multiple beats exist in a scene, pair the specific clause with the full scene context
      const speechContext = (beatCount > 1 && clauses[i] && clauses[i].length > 15) ? clauses[i] : text;
      
      // Determine varied shot type
      const shotType = this.selectVariedShotType(i, speechContext, lastShot);
      lastShot = shotType;

      // Determine visual concept & environment directly connected to speech
      const { visualConcept, environmentDescription } = this.deriveStorytellingConcept(
        speechContext,
        text,
        shotType,
        i,
        beatCount
      );

      // Extract optional keyword
      const keyword = this.extractKeyword(speechContext);

      // Determine camera motion (Ghibli slow pans, push-ins, subtle drifts)
      const motion = this.selectMotion(i, beatCount, isHook, keyword !== undefined);

      // Determine transition (40-50% gentle cross-dissolves, peaceful flow)
      const transition = (i === 0 && scene.sceneIndex === 0) ? 'CUT' : (i % 2 === 1 ? 'DISSOLVE' : 'CUT');
      const transitionDurationMs = transition === 'DISSOLVE' ? 300 : 0;

      // Construct Studio Ghibli image prompt with exact spoken narration included!
      const imagePrompt = this.constructImagePrompt(visualConcept, shotType, environmentDescription, text, visualNiche);

      beats.push({
        id: crypto.randomUUID(),
        sceneId: scene.id,
        projectId: scene.projectId,
        beatIndex: i,
        startOffsetMs: currentOffset,
        endOffsetMs: currentOffset + beatDuration,
        durationMs: beatDuration,
        shotType,
        visualConcept,
        environmentDescription,
        imagePrompt,
        generationStatus: 'PENDING',
        motion,
        transition,
        transitionDurationMs,
        keyword: keyword || undefined,
        keywordEnabled: keyword !== undefined
      });

      currentOffset += beatDuration;
    }

    return beats;
  }

  /**
   * Splits text on commas, semicolons, or conjunctions into clean semantic fragments.
   */
  private static splitIntoSemanticClauses(text: string): string[] {
    const rawParts = text
      .split(/[,;]|\b(?:or|and|while|but)\b/i)
      .map((p) => p.trim())
      .filter((p) => p.length > 8);

    if (rawParts.length <= 1) {
      return [text];
    }
    return rawParts;
  }

  /**
   * Distributes total durationMs across count beats, ensuring exact sum match.
   */
  private static allocateDurations(totalMs: number, count: number): number[] {
    if (count <= 1) return [totalMs];

    const base = Math.floor(totalMs / count);
    const durations = new Array(count).fill(base);
    let remainder = totalMs - (base * count);

    for (let i = 0; i < remainder; i++) {
      durations[i % count] += 1;
    }

    if (count === 2 && totalMs >= 7000) {
      const half = Math.round(totalMs / 200) * 100;
      return [half, totalMs - half];
    }

    return durations;
  }

  /**
   * Selects varied shot framing without repeating the previous framing.
   */
  private static selectVariedShotType(
    index: number,
    text: string,
    previousShot?: VisualShotType
  ): VisualShotType {
    const lower = text.toLowerCase();

    if (lower.includes('window') || lower.includes('book') || lower.includes('tea') || lower.includes('clock') || lower.includes('compass') || lower.includes('letter') || lower.includes('cup') || lower.includes('coffee')) {
      if (previousShot !== VisualShotType.PROP_CLOSEUP) return VisualShotType.PROP_CLOSEUP;
    }
    if (lower.includes('valley') || lower.includes('mountain') || lower.includes('sea') || lower.includes('distance') || lower.includes('sky') || lower.includes('world') || lower.includes('street')) {
      if (previousShot !== VisualShotType.ENVIRONMENT_SHOT) return VisualShotType.ENVIRONMENT_SHOT;
    }
    if (lower.includes('look') || lower.includes('face') || lower.includes('eye') || lower.includes('gaze') || lower.includes('smile') || lower.includes('tear') || lower.includes('smiled')) {
      if (previousShot !== VisualShotType.REACTION_SHOT) return VisualShotType.REACTION_SHOT;
    }

    let candidate = this.shotTypeCycle[index % this.shotTypeCycle.length];
    if (candidate === previousShot) {
      candidate = this.shotTypeCycle[(index + 1) % this.shotTypeCycle.length];
    }
    return candidate;
  }

  /**
   * Derives Studio Ghibli storytelling concept directly from the speech text.
   */
  private static deriveStorytellingConcept(
    clauseText: string,
    fullText: string,
    _shotType: VisualShotType,
    _beatIndex: number,
    _totalBeats: number
  ): { visualConcept: string; environmentDescription: string } {
    // Full text provides the complete scene narrative (setting + subject + action)
    const textToAnalyze = (fullText && fullText.trim().length > 0) ? fullText : clauseText;
    return PromptService.deriveSpeechConnectedConcept(textToAnalyze);
  }

  /**
   * Constructs the prompt following the Studio Ghibli storytelling template,
   * explicitly including the spoken narration so the AI model illustrates the exact speech!
   */
  private static constructImagePrompt(
    visualConcept: string,
    shotType: VisualShotType,
    environmentDescription: string,
    scriptContext?: string,
    visualNiche?: string
  ): string {
    return PromptService.buildPrompt(
      scriptContext || '',
      visualConcept,
      shotType,
      environmentDescription,
      visualNiche
    );
  }

  private static extractKeyword(text: string): string | undefined {
    const lower = text.toLowerCase();
    for (const [trigger, keyword] of Object.entries(this.triggerKeywords)) {
      if (lower.includes(trigger)) {
        return keyword;
      }
    }
    return undefined;
  }

  private static selectMotion(
    index: number,
    _total: number,
    isHook: boolean,
    _hasKeyword: boolean
  ): 'STATIC' | 'PUSH_IN' | 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN_LEFT' | 'PAN_RIGHT' | 'PUNCH_IN' {
    if (isHook && index === 0) {
      return 'PUSH_IN';
    }
    if (index % 4 === 1) {
      return 'PAN_LEFT';
    }
    if (index % 4 === 2) {
      return 'PAN_RIGHT';
    }
    if (index % 4 === 3) {
      return 'ZOOM_IN';
    }
    return 'STATIC';
  }
}
