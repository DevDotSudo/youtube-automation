import { AiPromptGeneratorService } from './ai-prompt-generator.service';
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
  aspectRatio?: string;
  customPrompt?: string;
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
   * Plans 1 or more Visual Beats for a narration scene in cinematic rhythm,
   * guaranteeing that the image directly connects to what is spoken in the narration.
   */
  static planSceneBeats(
    scene: ScenePlanningInput,
    previousShotType?: VisualShotType,
    visualNiche?: string,
    aspectRatio?: string
  ): VisualBeat[] {
    const text = (scene.scriptText || '').trim();
    const durationMs = Math.max(1000, scene.durationMs);
    const isHook = scene.startMs < 25000;

    // Pacing formula: Strictly 3.0 to 6.0 seconds per artwork
    // minBeats guarantees each beat duration <= 6000ms
    // maxBeats guarantees each beat duration >= 3000ms (when durationMs >= 3000ms)
    // idealBeats targets ~4500ms sweet spot
    const minBeats = Math.max(1, Math.ceil(durationMs / 6000));
    const maxBeats = Math.max(1, Math.floor(durationMs / 3000));
    const idealBeats = Math.max(1, Math.round(durationMs / 4500));
    const beatCount = scene.customPrompt ? 1 : Math.min(maxBeats, Math.max(minBeats, idealBeats));

    // Reconcile and segment script into exactly beatCount semantic clauses
    const alignedClauses = this.alignClausesToBeats(text, beatCount);

    // Allocate durations proportionally to each clause's word count, clamped to [3000, 6000]
    const durations = this.allocateDurationsByScript(durationMs, alignedClauses);

    const beats: VisualBeat[] = [];
    let currentOffset = 0;
    let lastShot = previousShotType;

    for (let i = 0; i < beatCount; i++) {
      const beatDuration = durations[i];
      // Every beat corresponds directly to the clause spoken during this 3-6s window
      const speechContext = (alignedClauses[i] && alignedClauses[i].trim().length > 0) ? alignedClauses[i] : text;
      
      // Determine visual concept & environment directly connected to speech first
      const derived = this.deriveStorytellingConcept(
        speechContext,
        text,
        lastShot,
        i,
        beatCount,
        visualNiche
      );

      // Determine varied shot type (prefer suggestedShotType from semantic derivation, else vary intelligently)
      const shotType = derived.suggestedShotType || this.selectVariedShotType(i, speechContext, lastShot);
      lastShot = shotType;

      const visualConcept = derived.visualConcept;
      const environmentDescription = derived.environmentDescription;

      // Extract optional keyword
      const keyword = this.extractKeyword(speechContext);

      // Determine camera motion (slow pans, push-ins, subtle drifts)
      const motion = this.selectMotion(i, beatCount, isHook, keyword !== undefined);

      // Determine transition (gentle cross-dissolves or cuts)
      const transition = (i === 0 && scene.sceneIndex === 0) ? 'CUT' : (i % 2 === 1 ? 'DISSOLVE' : 'CUT');
      const transitionDurationMs = transition === 'DISSOLVE' ? 300 : 0;

      // Construct image prompt with exact customPrompt if provided, else construct from speech!
      const imagePrompt = scene.customPrompt || this.constructImagePrompt(
        visualConcept,
        shotType,
        environmentDescription,
        speechContext,
        visualNiche,
        aspectRatio || scene.aspectRatio
      );

      const inAnimation = (i === 0 && scene.sceneIndex === 0) ? 'FLASH_WHITE' : (i % 2 === 0 ? 'ZOOM_IN' : 'FADE_IN');
      const outAnimation = i % 2 === 0 ? 'ZOOM_OUT' : 'FADE_OUT';

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
        scriptText: speechContext,
        generationStatus: 'PENDING',
        motion,
        transition,
        transitionDurationMs,
        inAnimation,
        outAnimation,
        inAnimationDurationMs: 350,
        outAnimationDurationMs: 350,
        keyword: keyword || undefined,
        keywordEnabled: keyword !== undefined,
        isCustomPrompt: Boolean(scene.customPrompt)
      });

      currentOffset += beatDuration;
    }

    return beats;
  }

  /**
   * Splits script text into natural semantic spoken clauses.
   */
  private static splitIntoSemanticClauses(text: string): string[] {
    if (!text || !text.trim()) return [''];
    const clean = text.trim();

    // 1. Split on sentence terminators (. ! ?)
    const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
    const clauses: string[] = [];

    for (const s of sentences) {
      // 2. Split on colons, semicolons, em dashes, or major conjunctions with commas
      const parts = s
        .split(/(?:[;:—]|--|,\s+(?:and|but|while|because|so|however|then|yet|although|whereas)\b)/i)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (parts.length > 1) {
        clauses.push(...parts);
      } else {
        // 3. Split on simple commas if sentence has >= 10 words
        const commaParts = s.split(/,\s+/).map((p) => p.trim()).filter((p) => p.length > 0);
        if (commaParts.length > 1 && s.split(/\s+/).length >= 10) {
          clauses.push(...commaParts);
        } else {
          clauses.push(s);
        }
      }
    }

    return clauses.filter((c) => c.length > 0);
  }

  /**
   * Aligns semantic clauses to match the target beatCount exactly.
   * Splits longer clauses or merges shorter adjacent clauses according to script structure.
   */
  private static alignClausesToBeats(text: string, targetCount: number): string[] {
    let clauses = this.splitIntoSemanticClauses(text);
    if (clauses.length === 0) clauses = [text || ''];

    // If we need more clauses to satisfy targetCount, split the longest clause
    while (clauses.length < targetCount) {
      let longestIdx = 0;
      let maxWords = 0;
      for (let i = 0; i < clauses.length; i++) {
        const words = clauses[i].split(/\s+/).length;
        if (words > maxWords) {
          maxWords = words;
          longestIdx = i;
        }
      }

      const words = clauses[longestIdx].split(/\s+/);
      if (words.length <= 1) {
        // Single word: duplicate to maintain count
        clauses.splice(longestIdx + 1, 0, clauses[longestIdx]);
        continue;
      }

      const mid = Math.ceil(words.length / 2);
      const firstHalf = words.slice(0, mid).join(' ');
      const secondHalf = words.slice(mid).join(' ');
      clauses.splice(longestIdx, 1, firstHalf, secondHalf);
    }

    // If we have more clauses than targetCount, merge shortest adjacent clauses
    while (clauses.length > targetCount) {
      let bestMergeIdx = 0;
      let minCombinedLen = Infinity;
      for (let i = 0; i < clauses.length - 1; i++) {
        const combined = clauses[i].length + clauses[i + 1].length;
        if (combined < minCombinedLen) {
          minCombinedLen = combined;
          bestMergeIdx = i;
        }
      }
      const merged = clauses[bestMergeIdx] + ', ' + clauses[bestMergeIdx + 1];
      clauses.splice(bestMergeIdx, 2, merged);
    }

    return clauses;
  }

  /**
   * Allocates durationMs across beats weighted proportionally to the spoken words in each script clause,
   * strictly clamping every beat to between 3000ms and 6000ms (unless totalMs < 3000ms),
   * and adjusting remainder so the sum matches totalMs with 0ms drift.
   */
  private static allocateDurationsByScript(totalMs: number, clauses: string[]): number[] {
    const count = clauses.length;
    if (count <= 1) return [totalMs];

    const wordCounts = clauses.map((c) => Math.max(1, c.trim().split(/\s+/).filter(Boolean).length));
    const totalWords = wordCounts.reduce((a, b) => a + b, 0);

    const minAllowed = totalMs >= count * 3000 ? 3000 : Math.floor(totalMs / count);
    const maxAllowed = 6000;

    const durations = wordCounts.map((w) => {
      const raw = Math.round((w / totalWords) * totalMs);
      return Math.min(maxAllowed, Math.max(minAllowed, raw));
    });

    // Rebalance difference to match totalMs exactly
    let currentSum = durations.reduce((a, b) => a + b, 0);
    let diff = totalMs - currentSum;

    let iterations = 0;
    while (diff !== 0 && iterations < 500) {
      iterations++;
      if (diff > 0) {
        // Find beat that can grow without exceeding maxAllowed
        let candidate = -1;
        let minDur = Infinity;
        for (let i = 0; i < count; i++) {
          if (durations[i] < maxAllowed && durations[i] < minDur) {
            minDur = durations[i];
            candidate = i;
          }
        }
        if (candidate === -1) candidate = 0;
        const step = Math.min(diff, Math.max(1, maxAllowed - durations[candidate]));
        durations[candidate] += step;
        diff -= step;
      } else {
        // diff < 0: find beat that can shrink without going below minAllowed
        let candidate = -1;
        let maxDur = -1;
        for (let i = 0; i < count; i++) {
          if (durations[i] > minAllowed && durations[i] > maxDur) {
            maxDur = durations[i];
            candidate = i;
          }
        }
        if (candidate === -1) candidate = 0;
        const step = Math.min(-diff, Math.max(1, durations[candidate] - minAllowed));
        durations[candidate] -= step;
        diff += step;
      }
    }

    return durations;
  }

  private static selectVariedShotType(
    index: number,
    text: string,
    previousShot?: VisualShotType
  ): VisualShotType {
    const lower = text.toLowerCase();

    // Specific Prop Close-ups
    if (
      lower.includes('phone') ||
      lower.includes('device') ||
      lower.includes('gadget') ||
      lower.includes('window') ||
      lower.includes('book') ||
      lower.includes('tea') ||
      lower.includes('clock') ||
      lower.includes('compass') ||
      lower.includes('letter') ||
      lower.includes('cup') ||
      lower.includes('coffee') ||
      lower.includes('shoe') ||
      lower.includes('vault') ||
      lower.includes('safe') ||
      lower.includes('key')
    ) {
      if (previousShot !== VisualShotType.PROP_CLOSEUP) return VisualShotType.PROP_CLOSEUP;
    }

    // Food & Intimate Close-ups
    if (
      lower.includes('eating out') ||
      lower.includes('restaurant') ||
      lower.includes('food') ||
      lower.includes('meal') ||
      lower.includes('steak') ||
      lower.includes('dinner')
    ) {
      if (previousShot !== VisualShotType.CLOSE_UP) return VisualShotType.CLOSE_UP;
    }

    // Conceptual & Metaphor Shots
    if (
      lower.includes('lesson') ||
      lower.includes('scale') ||
      lower.includes('graph') ||
      lower.includes('chart') ||
      lower.includes('disparity') ||
      lower.includes('income had grown') ||
      lower.includes('spending grows')
    ) {
      if (previousShot !== VisualShotType.CONCEPT_SHOT) return VisualShotType.CONCEPT_SHOT;
    }

    // Environment & Landscape Shots
    if (
      lower.includes('valley') ||
      lower.includes('mountain') ||
      lower.includes('sea') ||
      lower.includes('distance') ||
      lower.includes('sky') ||
      lower.includes('world') ||
      lower.includes('street') ||
      lower.includes('plaza') ||
      lower.includes('terrace') ||
      lower.includes('horizon')
    ) {
      if (previousShot !== VisualShotType.ENVIRONMENT_SHOT && previousShot !== VisualShotType.WIDE_SCENE) {
        return VisualShotType.ENVIRONMENT_SHOT;
      }
    }

    // Character Reaction & Emotional Shots
    if (
      lower.includes('look') ||
      lower.includes('face') ||
      lower.includes('eye') ||
      lower.includes('gaze') ||
      lower.includes('smile') ||
      lower.includes('tear') ||
      lower.includes('smiled') ||
      lower.includes('disbelief') ||
      lower.includes('empty') ||
      lower.includes('bank account')
    ) {
      if (previousShot !== VisualShotType.REACTION_SHOT) return VisualShotType.REACTION_SHOT;
    }

    let candidate = this.shotTypeCycle[index % this.shotTypeCycle.length];
    if (candidate === previousShot) {
      candidate = this.shotTypeCycle[(index + 1) % this.shotTypeCycle.length];
    }
    return candidate;
  }

  /**
   * Derives storytelling concept directly from speech text using PromptService.
   */
  private static deriveStorytellingConcept(
    clauseText: string,
    fullText: string,
    _lastShot?: VisualShotType,
    _beatIndex?: number,
    _totalBeats?: number,
    visualNiche?: string
  ): { visualConcept: string; environmentDescription: string; suggestedShotType?: VisualShotType } {
    // Full text provides the complete scene narrative (setting + subject + action)
    const textToAnalyze = (clauseText && clauseText.trim().length > 0) ? clauseText : fullText;
    return PromptService.deriveSpeechConnectedConcept(textToAnalyze, visualNiche);
  }

  /**
   * Constructs the prompt following the niche storytelling template,
   * explicitly including the spoken narration so the AI model illustrates the exact speech!
   */
  private static constructImagePrompt(
    visualConcept: string,
    shotType: VisualShotType,
    environmentDescription: string,
    scriptContext?: string,
    visualNiche?: string,
    aspectRatio: string = '16:9'
  ): string {
    return PromptService.buildPrompt(
      scriptContext || '',
      visualConcept,
      shotType,
      environmentDescription,
      visualNiche,
      aspectRatio
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
    return 'PUSH_IN';
  }

  /**
   * Enriches planned visual beats with high-detail diffusion prompts
   * generated by Agnes AI (with Groq fallback).
   */
  static async enrichBeatsWithAiPrompts(
    beats: VisualBeat[],
    scenes: Array<{ id: string; scriptText: string }>,
    visualNiche?: string,
    aspectRatio?: string,
    characterLock?: string
  ): Promise<void> {
    // Only enrich beats that do NOT have a custom user-defined image prompt
    const beatsNeedingAi = beats.filter((b) => !b.isCustomPrompt);
    if (beatsNeedingAi.length === 0) {
      console.log('[VisualBeatPlanner] All beats have custom prompts. Skipping AI enrichment.');
      return;
    }

    const scenesMap = new Map(scenes.map((s) => [s.id, s.scriptText]));
    const fullScript = scenes.map((s) => s.scriptText).join(' ');
    // Pass original beats array so prompt enrichment updates the objects in-place
    await AiPromptGeneratorService.enrichBeats(
      beatsNeedingAi,
      {
        niche: visualNiche,
        aspectRatio,
        scenesMap,
        characterLock,
        fullScript
      }
    );
  }

}
