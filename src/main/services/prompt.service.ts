import { VisualShotType } from '../../shared/types';
import { VISUAL_NICHES } from '../../shared/constants';

/**
 * PromptService: Generates clean, textless baseline diffusion prompts
 * and serves as the structural fallback for AI Prompt Generation (Agnes AI & Groq).
 * Adheres strictly to the UPDATED GLOBAL STYLE RULE:
 * - Stickman & Minimalist Doodle = colorful 2D cartoon illustration style
 * - Studio Ghibli Watercolor Anime = original nostalgic hand-painted watercolor anime style
 * - All other cinematic / realistic niches = stylized 3D cartoon cinematic style
 */
export interface DerivedConcept {
  visualConcept: string;
  environmentDescription: string;
  suggestedShotType?: VisualShotType;
}

export class PromptService {
  /**
   * Translates narration script lines into vivid camera-ready scenes.
   */
  static deriveSpeechConnectedConcept(scriptLine: string, niche?: string): DerivedConcept {
    const clean = (scriptLine || '')
      .replace(/\[(?:SFX|Music|Intro|Outro|Scene|Sound|Voice|Camera|Cut)[^\]]*\]/gi, '')
      .replace(/\((?:music|sound|sfx|pause|whisper|loud|laughter)[^)]*\)/gi, '')
      .replace(/^(?:Narrator|Host|Speaker|Voiceover|VO|[A-Z][a-z]+):\s*/i, '')
      .replace(/^\d+[\.\)]\s*/, '')
      .replace(/["\n\r]/g, ' ')
      .replace(/[$€£]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      return {
        visualConcept: 'A dramatic stylized 3D cartoon cinematic story scene establishing the world and mood.',
        environmentDescription: 'Rich cinematic atmosphere with evocative stylized lighting and deep contrast.',
        suggestedShotType: VisualShotType.WIDE_SCENE
      };
    }

    const lower = clean.toLowerCase();
    let suggestedShot = VisualShotType.MEDIUM_SCENE;

    if (lower.includes('look') || lower.includes('face') || lower.includes('eye') || lower.includes('smile') || lower.includes('reaction') || lower.includes('bank account')) {
      suggestedShot = VisualShotType.REACTION_SHOT;
    } else if (lower.includes('phone') || lower.includes('device') || lower.includes('letter') || lower.includes('key') || lower.includes('vault') || lower.includes('book')) {
      suggestedShot = VisualShotType.PROP_CLOSEUP;
    } else if (lower.includes('food') || lower.includes('restaurant') || lower.includes('steak') || lower.includes('dish') || lower.includes('dining')) {
      suggestedShot = VisualShotType.CLOSE_UP;
    } else if (lower.includes('scale') || lower.includes('graph') || lower.includes('chart') || lower.includes('lesson') || lower.includes('income')) {
      suggestedShot = VisualShotType.CONCEPT_SHOT;
    } else if (lower.includes('world') || lower.includes('horizon') || lower.includes('city') || lower.includes('sky') || lower.includes('terrace')) {
      suggestedShot = VisualShotType.WIDE_SCENE;
    }

    const nicheMeta = VISUAL_NICHES.find((n) => n.id === niche);
    const nicheName = nicheMeta ? nicheMeta.name : (niche || 'Stylized 3D Cartoon');

    if (niche === 'ancient_history_stone_age') {
      const lower = clean.toLowerCase();
      const hasFemale = /\b(woman|women|female|girl|mother|daughter)\b/i.test(clean);
      const hasMale = /\b(man|men|male|boy|father|son|hunter|hunters)\b/i.test(clean);

      let subject = 'man';
      let faceDesc = 'his face is light brown';
      let beardDesc = 'thick beard';

      if (hasFemale && hasMale) {
        subject = 'men and women';
        faceDesc = 'their faces are light brown';
        beardDesc = 'thick beard on the men only';
      } else if (hasFemale) {
        subject = lower.includes('women') ? 'women' : 'woman';
        faceDesc = lower.includes('women') ? 'their faces are light brown' : 'her face is light brown';
        beardDesc = '';
      } else if (lower.includes('men') || lower.includes('hunters') || lower.includes('people') || lower.includes('villagers') || lower.includes('tribe')) {
        subject = 'men';
        faceDesc = 'their faces are light brown';
        beardDesc = 'thick beard';
      }

      const beardPart = beardDesc ? `, ${beardDesc}` : '';

      // Derive specific action, prop, and environment based on speech keywords
      let action = '';
      let prop = '';
      let env = '';

      if (
        lower.includes('hunt') ||
        lower.includes('spear') ||
        lower.includes('prey') ||
        lower.includes('beast') ||
        lower.includes('animal') ||
        lower.includes('chase') ||
        lower.includes('track') ||
        lower.includes('mammoth') ||
        lower.includes('kill')
      ) {
        action = 'hunting wild game, tracking and chasing a prehistoric animal with raised wooden spears in coordinated pursuit';
        prop = 'holding wooden spears';
        env = 'prehistoric rugged rocky plains background with wild ancient trees and rolling hills';
      } else if (
        lower.includes('cook') ||
        lower.includes('fire') ||
        lower.includes('roast') ||
        lower.includes('flame') ||
        lower.includes('pot') ||
        lower.includes('meat') ||
        lower.includes('eat') ||
        lower.includes('food') ||
        lower.includes('meal') ||
        lower.includes('taste')
      ) {
        action = 'crouching over a crackling campfire, roasting meat and stirring food in a crude clay pot';
        prop = 'holding roasted meat on a stick';
        env = 'Stone Age village background with primitive huts, campfires and trees';
      } else if (
        lower.includes('tool') ||
        lower.includes('weapon') ||
        lower.includes('stone') ||
        lower.includes('rock') ||
        lower.includes('flint') ||
        lower.includes('axe') ||
        lower.includes('knife') ||
        lower.includes('craft') ||
        lower.includes('make') ||
        lower.includes('carve')
      ) {
        action = 'carefully chipping and knapping stone tools, crafting sharp flint weapons with focused effort';
        prop = 'holding crude stone tools and flint hammer';
        env = 'outdoor prehistoric workstation background with stone boulders and primitive campsite';
      } else if (
        lower.includes('cave') ||
        lower.includes('dark') ||
        lower.includes('shelter') ||
        lower.includes('cold') ||
        lower.includes('winter') ||
        lower.includes('storm') ||
        lower.includes('rain') ||
        lower.includes('night') ||
        lower.includes('ice') ||
        lower.includes('freeze')
      ) {
        action = 'taking shelter inside a deep stone cave, huddling near a flaming torch for warmth against the harsh elements';
        prop = 'holding a burning wooden torch';
        env = 'prehistoric dark cave interior background with ancient rock art paintings on walls and glowing firelight';
      } else if (
        lower.includes('dig') ||
        lower.includes('root') ||
        lower.includes('gather') ||
        lower.includes('plant') ||
        lower.includes('forage') ||
        lower.includes('berry') ||
        lower.includes('fruit') ||
        lower.includes('earth') ||
        lower.includes('soil')
      ) {
        action = 'digging into the soil with crude wooden tools, unearthing buried edible roots and gathering wild berries';
        prop = 'holding digging tools and gathered roots';
        env = 'prehistoric forest clearing background with wild bushes, ancient trees and earth piles';
      } else if (
        lower.includes('child') ||
        lower.includes('children') ||
        lower.includes('family') ||
        lower.includes('play') ||
        lower.includes('sit') ||
        lower.includes('share') ||
        lower.includes('talk') ||
        lower.includes('tribe')
      ) {
        action = 'sitting together on the ground sharing food and stories around a campfire, interacting warmly while children play nearby';
        prop = 'holding pieces of food';
        env = 'Stone Age village background with primitive huts, campfires and trees';
      } else if (
        lower.includes('fight') ||
        lower.includes('war') ||
        lower.includes('enemy') ||
        lower.includes('conflict') ||
        lower.includes('defend') ||
        lower.includes('protect') ||
        lower.includes('danger') ||
        lower.includes('battle')
      ) {
        action = 'standing in an alert defensive formation, brandishing stone axes and raised spears to protect the tribe';
        prop = 'holding stone axes and raised spears';
        env = 'rugged prehistoric gorge background with jagged rocks and stormy sky';
      } else if (
        lower.includes('look') ||
        lower.includes('discover') ||
        lower.includes('see') ||
        lower.includes('star') ||
        lower.includes('sky') ||
        lower.includes('sun') ||
        lower.includes('horizon') ||
        lower.includes('world') ||
        lower.includes('wonder')
      ) {
        action = 'standing on an elevated rocky ridge gazing across the vast untamed prehistoric landscape in wonder';
        prop = 'holding a wooden walking staff';
        env = 'panoramic prehistoric wilderness background with dramatic mountain peaks and ancient horizon';
      } else if (
        lower.includes('walk') ||
        lower.includes('travel') ||
        lower.includes('journey') ||
        lower.includes('move') ||
        lower.includes('wander') ||
        lower.includes('migrate')
      ) {
        action = 'trekking across rugged wilderness on a tribal migration journey, carrying primitive supplies';
        prop = 'holding a wooden walking staff';
        env = 'expansive prehistoric wilderness trail background with ancient rocks and distant mountain ranges';
      } else {
        action = `actively depicting: ${clean}, gesturing with expressive body language in primitive prehistoric life`;
        prop = 'holding a primitive stone tool';
        env = 'prehistoric natural outdoor landscape background with ancient terrain';
      }

      return {
        visualConcept: `Cartoon stick figure Stone Age ${subject} ${action}, messy long hair${beardPart}, ${faceDesc}, black stick arms, wearing primitive fur and animal-hide clothing, ${prop}, ${env}, flat 2D animation style.`,
        environmentDescription: `${env}, flat 2D animation style.`,
        suggestedShotType: suggestedShot
      };
    }

    return {
      visualConcept: `${nicheName} visual scene portraying: ${clean}. Clean, expressive stylized storytelling action.`,
      environmentDescription: 'Atmospheric cinematic lighting with rich depth, clean shapes, and expressive contrast.',
      suggestedShotType: suggestedShot
    };
  }

  static generateVisualConcept(scriptLine: string, niche?: string): string {
    return this.deriveSpeechConnectedConcept(scriptLine, niche).visualConcept;
  }

  static generateOverlayText(_scriptLine: string): string {
    return '';
  }

  static buildPrompt(
    scriptLine: string,
    visualConceptOverride?: string,
    _shotType: string = 'WIDE_SCENE',
    _environmentDescription?: string,
    niche?: string,
    aspectRatio: string = '16:9'
  ): string {
    const cleanLine = (scriptLine || '')
      .replace(/\[(?:SFX|Music|Intro|Outro|Scene|Sound)[^\]]*\]/gi, '')
      .replace(/["\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const derived = this.deriveSpeechConnectedConcept(cleanLine, niche);
    const concept = visualConceptOverride || derived.visualConcept || cleanLine;
    const aspectPhrase = aspectRatio === '9:16' ? '9:16 vertical format' : '16:9 widescreen format';

    return `${concept}, ${aspectPhrase}, no text, no subtitles, no watermarks.`;
  }

  static getArtDirection(niche?: string): {
    header: string;
    styleDirectives: string[];
    exclusions: string[];
  } {
    const nicheMeta = VISUAL_NICHES.find((n) => n.id === niche);
    const is2D = niche === 'stickman_doodle' || niche === 'ancient_history_stone_age';
    const isGhibli = niche === 'studio_ghibli';

    const header = nicheMeta
      ? `Create a visual artwork in ${nicheMeta.name} aesthetic.`
      : 'Create a stylized 3D cartoon cinematic visual artwork.';

    const styleDirectives = nicheMeta
      ? [
          nicheMeta.description,
          is2D
            ? (niche === 'ancient_history_stone_age'
                ? 'Cartoon stick figure Stone Age animation style with primitive fur clothing, black stick arms, and flat 2D animation'
                : 'Clean 2D cartoon outlines and expressive minimalist character design')
            : isGhibli
              ? 'Hand-painted watercolor anime aesthetic with warm natural lighting'
              : 'Stylized 3D cartoon cinematic visuals with cinematic lighting, clear shapes, and rich environmental detail',
          'Masterpiece composition with pristine visual depth and intentional character posing'
        ]
      : [
          'Stylized 3D cartoon cinematic style',
          'Rich environmental detail and cinematic lighting',
          'Masterpiece clarity'
        ];

    const exclusions = [
      'extra arms, three arms, duplicate limbs, extra hands, extra legs, extra feet, mutated limbs, malformed anatomy, distorted body, six fingers',
      'words, text, typography, letters, numbers, watermarks, signatures',
      'low quality, blurry, distorted anatomy',
      ...(is2D || isGhibli ? [] : ['photorealism, realistic live-action, live-action photography, flat 2D'])
    ];
    return { header, styleDirectives, exclusions };
  }
}
