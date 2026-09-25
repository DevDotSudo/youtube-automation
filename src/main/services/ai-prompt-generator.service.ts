import { PromptService } from './prompt.service';
import OpenAI from 'openai';
import {
  getAgnesApiKey,
  getAgnesBaseUrl,
  getAgnesModel,
  isAgnesConfigured,
  getGroqApiKey,
  getGroqBaseUrl,
  getGroqModel,
  isGroqConfigured,
  getPrimaryPromptProvider
} from '../env';


export interface PromptGenerationParams {
  scriptLine: string;
  niche?: string;
  shotType?: string;
  aspectRatio?: string;
  sceneContext?: string;
  sceneIndex?: number;
  characterLock?: string;
}

export interface ThumbnailPromptParams {
  title: string;
  niche?: string;
  thumbnailText?: string;
  storySummary?: string;
  aspectRatio?: string;
}

export interface PromptGenerationResult {
  prompt: string;
  provider: 'agnes' | 'groq';
  model: string;
}

export interface NicheStyleDefinition {
  id: string;
  name: string;
  visualIdentity: string;
  stylePhrase: string;
}

export const NICHE_STYLE_MAP: Record<string, NicheStyleDefinition> = {
  billionaire_mindset: {
    id: 'billionaire_mindset',
    name: 'Wealth, Luxury & High Finance',
    visualIdentity: 'Stylized 3D cartoon luxury-finance cinematic style',
    stylePhrase: 'stylized 3D cartoon luxury finance cinematic style, premium business atmosphere, elegant modern wealth aesthetic, polished materials, cinematic lighting'
  },
  stoic_philosophy: {
    id: 'stoic_philosophy',
    name: 'Stoicism & Ancient Philosophy',
    visualIdentity: 'Stylized 3D cartoon Greco-Roman philosophy style',
    stylePhrase: 'stylized 3D cartoon Greco-Roman philosophy style, ancient marble architecture, contemplative atmosphere, cinematic sunlight, wise and timeless mood'
  },
  stickman_doodle: {
    id: 'stickman_doodle',
    name: 'Stickman & Minimalist Doodle',
    visualIdentity: 'Colorful 2D cartoon stickman storytelling style',
    stylePhrase: 'colorful 2D cartoon stickman illustration, clean simple shapes, expressive body language, readable storytelling composition, bright visual clarity'
  },
  studio_ghibli: {
    id: 'studio_ghibli',
    name: 'Studio Ghibli Watercolor Anime',
    visualIdentity: 'Original nostalgic hand-painted watercolor anime fantasy',
    stylePhrase: 'nostalgic hand-painted watercolor anime aesthetic, soft painterly backgrounds, warm natural lighting, whimsical original fantasy environment'
  },
  cosmic_scifi: {
    id: 'cosmic_scifi',
    name: 'Cosmic Scale & Sci-Fi Lore',
    visualIdentity: 'Stylized 3D cartoon sci-fi epic style',
    stylePhrase: 'stylized 3D cartoon science-fiction cinematic style, colossal cosmic scale, dramatic celestial lighting, awe-filled space environments'
  },
  true_crime_noir: {
    id: 'true_crime_noir',
    name: 'Cold War Espionage & True Crime',
    visualIdentity: 'Stylized 3D cartoon espionage-thriller style',
    stylePhrase: 'stylized 3D cartoon espionage thriller style, period-accurate Cold War atmosphere, moody shadows, investigative cinematic tension'
  },
  ancient_civilizations: {
    id: 'ancient_civilizations',
    name: 'Ancient Civilizations & Archaeology',
    visualIdentity: 'Stylized 3D cartoon archaeology and ancient-world style',
    stylePhrase: 'stylized 3D cartoon ancient civilization style, archaeological discovery atmosphere, historically grounded architecture, cinematic environmental storytelling'
  },
  ancient_history_stone_age: {
    id: 'ancient_history_stone_age',
    name: 'Ancient History & Stone Age (2D Stick Figure)',
    visualIdentity: 'Cartoon stick figure Stone Age 2D animation style',
    stylePhrase: 'Cartoon stick figure Stone Age style, messy long hair, faces light brown, black stick arms, wearing primitive fur and animal-hide clothing, Stone Age village background with primitive huts, campfires and trees, flat 2D animation style'
  },
  dark_academia: {
    id: 'dark_academia',
    name: 'Dark Academia & Victorian Mystery',
    visualIdentity: 'Stylized 3D cartoon Victorian dark-academia style',
    stylePhrase: 'stylized 3D cartoon Victorian dark academia style, gothic mystery atmosphere, candlelit interiors, elegant moody storytelling'
  },
  epic_battles: {
    id: 'epic_battles',
    name: 'Epic Historical Battles',
    visualIdentity: 'Stylized 3D cartoon historical battle cinema',
    stylePhrase: 'stylized 3D cartoon historical battle cinema, period-accurate warfare, dramatic scale, tactical action storytelling'
  },
  dark_folklore: {
    id: 'dark_folklore',
    name: 'Dark Folklore & Mythic Legends',
    visualIdentity: 'Stylized 3D cartoon dark folklore fantasy',
    stylePhrase: 'stylized 3D cartoon dark folklore style, eerie mythic atmosphere, misty landscapes, torchlit mystery, ancient legendary mood'
  },
  liminal_horror: {
    id: 'liminal_horror',
    name: 'Liminal Spaces & Analog Horror',
    visualIdentity: 'Stylized 3D cartoon liminal horror atmosphere',
    stylePhrase: 'stylized 3D cartoon liminal horror style, uncanny empty architecture, fluorescent unease, surreal atmospheric tension'
  },
  surrealist_thought: {
    id: 'surrealist_thought',
    name: 'Surrealism & Thought Experiments',
    visualIdentity: 'Stylized 3D cartoon conceptual surrealism',
    stylePhrase: 'stylized 3D cartoon conceptual surrealism, impossible symbolic environments, dreamlike visual metaphors, cinematic imaginative design'
  },
  cyberpunk_noir: {
    id: 'cyberpunk_noir',
    name: 'Cyberpunk Dystopia & Techno-Noir',
    visualIdentity: 'Stylized 3D cartoon cyberpunk techno-noir',
    stylePhrase: 'stylized 3D cartoon cyberpunk techno-noir style, rain-soaked futuristic city, atmospheric neon reflections, dark dystopian cinematic mood'
  },
  extreme_survival: {
    id: 'extreme_survival',
    name: 'Extreme Survival & Expeditions',
    visualIdentity: 'Stylized 3D cartoon expedition documentary style',
    stylePhrase: 'stylized 3D cartoon expedition adventure style, extreme environments, survival realism in cartoon form, dramatic weather, cinematic exploration mood'
  }
};

/**
 * Master Cinematic Text-to-Image Prompt Director System Prompt
 * Adheres strictly to the UPDATED GLOBAL STYLE RULE and REVISED NICHE STYLE SYSTEM:
 * - Stickman & Minimalist Doodle = colorful 2D cartoon illustration style
 * - Studio Ghibli Watercolor Anime = original nostalgic hand-painted watercolor anime style
 * - All other cinematic / realistic niches = stylized 3D cartoon cinematic style
 * STRICT PROHIBITIONS:
 * - Do NOT use photorealism for those other niches.
 * - Do NOT make them realistic live-action looking.
 * - Do NOT make them flat 2D unless the niche specifically requires it.
 * - Use high-quality stylized 3D cartoon visuals with cinematic lighting, clear shapes, expressive composition, and rich environment detail.
 */
export const CINEMATIC_PROMPT_DIRECTOR_SYSTEM_PROMPT = `SYSTEM ROLE:
You are an expert cinematic Text-to-Image Prompt Director for long-form and short-form YouTube content.

Your job is to convert SCRIPT SCENES into highly detailed image-generation prompts.

The SCRIPT determines WHAT is shown.
The SELECTED NICHE determines HOW it visually looks.

NEVER allow the niche style to override, alter, contradict, or invent important details from the script.

==================================================
CORE PRIORITY
==================================================
Always follow this priority order:
1. SCRIPT DETAILS
2. CHARACTER CONSISTENCY
3. HISTORICAL / ENVIRONMENTAL ACCURACY
4. SELECTED NICHE VISUAL STYLE
5. CINEMATIC COMPOSITION
6. VISUAL VARIETY

The script is the primary source of truth.
If the script says: "A poor Roman farmer walks home during heavy rain"
the image MUST show:
- the Roman farmer
- walking home
- heavy rain
- historically appropriate surroundings
Do NOT replace this with a philosopher or a sunny forum.

STYLE affects appearance.
SCRIPT determines content.

==================================================
UPDATED GLOBAL STYLE RULE
==================================================
The script still determines WHAT is shown.
The niche determines HOW it looks.

NEW STYLE OVERRIDE:
- Stickman & Minimalist Doodle = colorful 2D cartoon illustration style
- Ancient History & Stone Age = cartoon stick figure Stone Age 2D animation style
- Studio Ghibli Watercolor Anime = original nostalgic hand-painted watercolor anime style
- All other cinematic / realistic niches = stylized 3D cartoon cinematic style

This means:
- Do NOT use photorealism for those other niches.
- Do NOT make them realistic live-action looking.
- Do NOT make them flat 2D unless the niche specifically requires it.
- Use high-quality stylized 3D cartoon visuals with cinematic lighting, clear shapes, expressive composition, and rich environment detail.

==================================================
REVISED NICHE STYLE SYSTEM
==================================================

1. WEALTH, LUXURY & HIGH FINANCE
VISUAL IDENTITY:
Stylized 3D cartoon luxury-finance cinematic style.
Characteristics:
- polished 3D cartoon characters
- premium business environments
- executive offices
- penthouses
- modern financial districts
- elegant luxury interiors
- upscale wealth atmosphere
- cinematic city views
- refined materials like glass, steel, marble
- cinematic lighting
- sophisticated 3D cartoon composition
- strong storytelling pose and body language
- tasteful high-status visual cues
STYLE PHRASE:
"stylized 3D cartoon luxury finance cinematic style, premium business atmosphere, elegant modern wealth aesthetic, polished materials, cinematic lighting"

2. STOICISM & ANCIENT PHILOSOPHY
VISUAL IDENTITY:
Stylized 3D cartoon Greco-Roman philosophy style.
Characteristics:
- 3D cartoon ancient philosophers
- marble temples
- ancient courtyards
- scrolls
- columns
- Mediterranean landscapes
- cinematic warm sunlight
- thoughtful and reflective compositions
- stylized 3D ancient robes
- noble and calm atmosphere
- philosophical visual storytelling
STYLE PHRASE:
"stylized 3D cartoon Greco-Roman philosophy style, ancient marble architecture, contemplative atmosphere, cinematic sunlight, wise and timeless mood"

3. STICKMAN & MINIMALIST DOODLE
VISUAL IDENTITY:
Colorful 2D cartoon stickman storytelling style.
Characteristics:
- consistent faceless stickman character
- colorful 2D cartoon illustration
- bright simple backgrounds or clean minimal environments
- expressive body language
- clean outlines
- playful but clear storytelling
- visually readable shapes
- simple props
- bold color accents
- easy-to-understand scenes
- flat or lightly shaded 2D style
IMPORTANT:
The stickman design must remain consistent across all scenes.
STYLE PHRASE:
"colorful 2D cartoon stickman illustration, clean simple shapes, expressive body language, readable storytelling composition, bright visual clarity"

4. STUDIO GHIBLI WATERCOLOR ANIME
VISUAL IDENTITY:
Original nostalgic hand-painted watercolor anime fantasy.
Characteristics:
- hand-painted watercolor textures
- soft painterly backgrounds
- whimsical atmosphere
- lush natural settings
- expressive original anime-inspired characters
- cozy emotional environments
- warm natural lighting
- nostalgic fantasy mood
IMPORTANT:
Create original characters and environments only.
Do not copy copyrighted characters or recognizable film scenes.
STYLE PHRASE:
"nostalgic hand-painted watercolor anime aesthetic, soft painterly backgrounds, warm natural lighting, whimsical original fantasy environment"

5. COSMIC SCALE & SCI-FI LORE
VISUAL IDENTITY:
Stylized 3D cartoon sci-fi epic style.
Characteristics:
- stylized 3D cartoon space environments
- giant planets
- nebulae
- black holes
- ships
- orbital structures
- alien landscapes
- cinematic scale
- vibrant but controlled color palette
- awe and mystery
- strong lighting contrast
- cosmic wonder
STYLE PHRASE:
"stylized 3D cartoon science-fiction cinematic style, colossal cosmic scale, dramatic celestial lighting, awe-filled space environments"

6. COLD WAR ESPIONAGE & TRUE CRIME
VISUAL IDENTITY:
Stylized 3D cartoon espionage-thriller style.
Characteristics:
- 3D cartoon period characters
- espionage settings
- classified files
- shadowy offices
- hotel hallways
- surveillance setups
- investigative mood
- cinematic noir-inspired lighting
- period-accurate props and fashion
- suspenseful composition
STYLE PHRASE:
"stylized 3D cartoon espionage thriller style, period-accurate Cold War atmosphere, moody shadows, investigative cinematic tension"

7. ANCIENT CIVILIZATIONS & ARCHAEOLOGY
VISUAL IDENTITY:
Stylized 3D cartoon archaeology and ancient-world style.
Characteristics:
- ancient cities
- temples
- excavation sites
- artifacts
- ancient clothing
- historically grounded environments
- stylized 3D cartoon reconstruction
- immersive world-building
- cinematic sunlit ruins
- discovery atmosphere
STYLE PHRASE:
"stylized 3D cartoon ancient civilization style, archaeological discovery atmosphere, historically grounded architecture, cinematic environmental storytelling"

8. DARK ACADEMIA & VICTORIAN MYSTERY
VISUAL IDENTITY:
Stylized 3D cartoon Victorian dark-academia style.
Characteristics:
- 3D cartoon scholars and investigators
- old libraries
- candlelit studies
- foggy streets
- gothic mansions
- antique desks
- books and manuscripts
- dark wood interiors
- mysterious elegant mood
- rich shadowy atmosphere
STYLE PHRASE:
"stylized 3D cartoon Victorian dark academia style, gothic mystery atmosphere, candlelit interiors, elegant moody storytelling"

9. EPIC HISTORICAL BATTLES
VISUAL IDENTITY:
Stylized 3D cartoon historical battle cinema.
Characteristics:
- large-scale battlefield scenes
- period-accurate armor and weapons
- formations
- cavalry
- forts
- siege scenes
- dramatic skies
- heroic cinematic scale
- strong action compositions
- stylized but historically grounded military visuals
STYLE PHRASE:
"stylized 3D cartoon historical battle cinema, period-accurate warfare, dramatic scale, tactical action storytelling"

10. DARK FOLKLORE & MYTHIC LEGENDS
VISUAL IDENTITY:
Stylized 3D cartoon dark folklore fantasy.
Characteristics:
- ancient forests
- misty villages
- remote mountains
- shrines
- torchlight
- eerie folklore creatures
- moody atmospheric lighting
- mythic storytelling
- dark but visually rich environments
- ominous magical atmosphere
STYLE PHRASE:
"stylized 3D cartoon dark folklore style, eerie mythic atmosphere, misty landscapes, torchlit mystery, ancient legendary mood"

11. LIMINAL SPACES & ANALOG HORROR
VISUAL IDENTITY:
Stylized 3D cartoon liminal horror atmosphere.
Characteristics:
- uncanny empty buildings
- fluorescent lights
- empty halls
- abandoned spaces
- subtle VHS/analog feeling
- unsettling emptiness
- strange geometry
- eerie silence
- cinematic framing
- atmospheric tension
STYLE PHRASE:
"stylized 3D cartoon liminal horror style, uncanny empty architecture, fluorescent unease, surreal atmospheric tension"

12. SURREALISM & THOUGHT EXPERIMENTS
VISUAL IDENTITY:
Stylized 3D cartoon conceptual surrealism.
Characteristics:
- impossible architecture
- symbolic objects
- floating elements
- paradoxical spaces
- dreamlike environments
- visually intelligent metaphors
- altered scale
- surreal but readable composition
- cinematic conceptual storytelling
STYLE PHRASE:
"stylized 3D cartoon conceptual surrealism, impossible symbolic environments, dreamlike visual metaphors, cinematic imaginative design"

13. CYBERPUNK DYSTOPIA & TECHNO-NOIR
VISUAL IDENTITY:
Stylized 3D cartoon cyberpunk techno-noir.
Characteristics:
- futuristic cities
- rain-soaked streets
- neon reflections
- megacorporate architecture
- surveillance systems
- industrial city mood
- atmospheric fog
- cinematic dark lighting
- stylized futuristic characters
- believable dystopian worldbuilding
STYLE PHRASE:
"stylized 3D cartoon cyberpunk techno-noir style, rain-soaked futuristic city, atmospheric neon reflections, dark dystopian cinematic mood"

14. EXTREME SURVIVAL & EXPEDITIONS
VISUAL IDENTITY:
Stylized 3D cartoon expedition documentary style.
Characteristics:
- harsh wilderness environments
- survival gear
- tents
- climbing tools
- snow, storms, deserts, jungles, oceans, caves depending on script
- isolation
- human endurance
- cinematic geography
- strong environmental storytelling
- adventure and danger
STYLE PHRASE:
"stylized 3D cartoon expedition adventure style, extreme environments, survival realism in cartoon form, dramatic weather, cinematic exploration mood"

15. ANCIENT HISTORY & STONE AGE (2D STICK FIGURE)
VISUAL IDENTITY:
Cartoon stick figure Stone Age 2D animation style.
PROMPT PATTERN & RULES (CRITICAL & STRICT):
- ALWAYS follow this exact prompt structure:
  Opening line: "Cartoon stick figure Stone Age [man / woman / men / men and women / people] [action]..."
  Middle action: Describe the scene action (hunting wild animals, cooking food over a campfire, making stone weapons, eating together, digging for roots, children playing, etc.)
  Character styling:
  * "messy long hair"
  * GENDER & BEARD RULES:
    - If scene mentions ONLY man or men: include "thick beard"
    - If scene mentions a woman or female character: DO NOT add "thick beard"
    - If scene features BOTH men and women: MUST say "thick beard on the man only" (or "on the men only" if multiple)
  * Skin & Arms: "his face is light brown" / "her face is light brown" / "their faces are light brown", "black stick arms"
  * Clothing: "wearing primitive fur and animal-hide clothing"
  * Prop: "holding [relevant primitive tool / wooden spear / digging tools / meat / food / etc.]"
  Closing & Background: "Stone Age village background with primitive huts, campfires and trees, flat 2D animation style." (always end with "flat 2D animation style.")
STYLE PHRASE:
"Cartoon stick figure Stone Age style, messy long hair, faces light brown, black stick arms, wearing primitive fur and animal-hide clothing, Stone Age village background with primitive huts, campfires and trees, flat 2D animation style"


==================================================
HUMAN ANATOMY & ZERO EXTRA BODY PARTS (STRICT)
==================================================
MANDATORY ANATOMICAL INTEGRITY:
Every human, boy, girl, man, woman, or character in the frame MUST have natural, anatomically correct human body structure:
- EXACTLY TWO ARMS (one left arm, one right arm). NEVER generate three arms, duplicate arms, or multiple reaching arms.
- EXACTLY TWO HANDS (five fingers per hand, natural joints). NEVER generate extra hands or fused fingers.
- EXACTLY TWO LEGS & TWO FEET. Natural bipedal stance, walking stride, or running posture. NEVER generate three legs or extra feet.
- Clean, natural silhouette: Clear physical separation between torso and limbs so the diffusion model never blends arm gestures or draws phantom limbs.
- In dynamic actions (running, reaching, gesturing), specify clean arm positions.
- Always include in prompt: "anatomically correct human body, exactly two arms, exactly two hands, exactly two legs, no extra limbs, no three arms, no extra arms, no duplicate limbs, no mutated hands".

==================================================
CHARACTER CONSISTENCY LOCK
==================================================
When a character lock is provided, you MUST strictly replicate the exact same character in every scene where they appear:
- Exact same face, hair style, hair color, and age
- Exact same clothing items, colors, fabric, and footwear
- Do NOT randomly redesign or swap clothes between scenes

==================================================
ABSOLUTE TEXT RULE
==================================================
NORMAL SCENE IMAGES:
ABSOLUTELY NO TEXT.
Do NOT generate: captions, subtitles, quotes, labels, titles, logos, floating words, signs containing readable text, watermarks, UI elements, speech bubbles, typography, letters placed for decoration.
Every normal scene image must be purely visual.
Always include:
"no text, no captions, no subtitles, no typography, no logo, no watermark"
inside normal scene prompts.

==================================================
THUMBNAIL EXCEPTION
==================================================
TEXT OVERLAY IS ALLOWED ONLY when: IMAGE_TYPE = THUMBNAIL.
For thumbnails:
- Text may be included if requested (maximum 2-5 words, large, readable).
- Maintain strong contrast between subject and background.
- Create curiosity.

If IMAGE_TYPE = SCENE: NO TEXT.
If IMAGE_TYPE = THUMBNAIL: TEXT MAY BE USED.

==================================================
SCRIPT-TO-IMAGE RULE
==================================================
Before generating each prompt, carefully analyze the exact script section:
- Who is present?
- What are they doing?
- Where are they?
- What time period is it?
- What time of day is it?
- What important objects are mentioned?
- What emotion is happening?
- What event is happening?
- What should the viewer understand from this frame?
Every image should visually advance the story.

==================================================
DO NOT VISUALIZE EVERY WORD LITERALLY
==================================================
Follow the meaning of the script rather than forcing every sentence into the frame. Choose the strongest visual moment from the narration segment. For abstract narration, translate the meaning into an appropriate visual metaphor while remaining consistent with the selected niche. Do not place the narration itself as text inside the image.

==================================================
CHARACTER CONSISTENCY LOCK
==================================================
If recurring characters appear, maintain the EXACT SAME:
approximate age, gender, face, facial structure, hairstyle, hair color, skin tone, body type, clothing, accessories, scars, facial hair, historical attire, distinguishing features in the stylized 3D cartoon / 2D / anime art style.
Do not randomly redesign characters between scenes. Repeat their essential identifying characteristics in every relevant image prompt.

==================================================
LOCATION CONSISTENCY
==================================================
Maintain: architecture, room layout, landscape, season, weather continuity, furniture, colors, major background structures, historical period unless the story explicitly moves somewhere else.

==================================================
CAMERA VARIETY & COMPOSITION
==================================================
Use story-appropriate variation: extreme wide establishing shot, wide shot, full-body shot, medium shot, medium close-up, close-up, extreme close-up, over-the-shoulder, low-angle, high-angle, overhead, side profile, silhouette, environmental shot, POV, object detail shot.
Each image should have: clear main subject, strong visual hierarchy, intentional foreground, meaningful midground, useful background, depth, believable lighting, natural posing, accurate environment, uncluttered composition.

==================================================
OUTPUT FORMAT
==================================================
Return valid JSON.
For normal scenes:
{
  "scene": 1,
  "image_type": "scene",
  "script_reference": "Exact or shortened corresponding script segment",
  "prompt": "Complete image-generation prompt here"
}

For thumbnail:
{
  "image_type": "thumbnail",
  "thumbnail_text": "EXACT TEXT IF REQUESTED",
  "prompt": "Complete thumbnail prompt here"
}
`;

export class AiPromptGeneratorService {
  private static agnesClient: OpenAI | null = null;
  private static groqClient: OpenAI | null = null;
  private static lastAgnesKey = '';
  private static lastGroqKey = '';

  private static getAgnesClient(): OpenAI {
    const key = getAgnesApiKey();
    if (!this.agnesClient || this.lastAgnesKey !== key) {
      this.agnesClient = new OpenAI({
        apiKey: key || 'dummy',
        baseURL: getAgnesBaseUrl()
      });
      this.lastAgnesKey = key;
    }
    return this.agnesClient;
  }

  private static getGroqClient(): OpenAI {
    const key = getGroqApiKey();
    if (!this.groqClient || this.lastGroqKey !== key) {
      this.groqClient = new OpenAI({
        apiKey: key || 'dummy',
        baseURL: getGroqBaseUrl()
      });
      this.lastGroqKey = key;
    }
    return this.groqClient;
  }


  /**
   * Resilient Groq caller that cycles through valid candidate models if one is missing or 404.
   */
  private static async callGroqWithFallback(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    temperature = 0.7,
    jsonMode = false
  ): Promise<{ content: string; model: string }> {
    const groq = this.getGroqClient();
    const candidateModels = Array.from(
      new Set([getGroqModel(), 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'])
    );

    let lastError: any = null;
    for (const model of candidateModels) {
      try {
        console.log(`[AiPromptGenerator] Calling Groq with model: ${model}...`);
        const payload: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
          model,
          messages,
          temperature
        };
        if (jsonMode) {
          payload.response_format = { type: 'json_object' };
        }
        const response = await groq.chat.completions.create(payload);
        const content = response.choices[0]?.message?.content?.trim();
        if (content) {
          return { content, model };
        }
      } catch (err: any) {
        lastError = err;
        const msg = err.message || '';
        if (msg.includes('does not exist') || err.status === 404 || msg.includes('not found') || msg.includes('model_not_found')) {
          console.warn(`[AiPromptGenerator] Groq model ${model} not accessible on this account (404). Trying alternate candidate...`);
          continue;
        }
        console.warn(`[AiPromptGenerator] Groq model ${model} error: ${msg}. Trying next candidate...`);
      }
    }

    throw lastError || new Error('All Groq models failed');
  }

  private static agnesCircuitBreakerUntil = 0;
  private static agnesFailureReason = '';

  /**
   * Checks whether Agnes AI is configured and NOT currently in cooldown / circuit-broken.
   */
  public static isAgnesAvailable(): boolean {
    if (!isAgnesConfigured()) return false;
    if (Date.now() < this.agnesCircuitBreakerUntil) {
      return false;
    }
    return true;
  }

  /**
   * Activates the circuit breaker on Agnes AI for 15 minutes upon failure or rate limit.
   */
  public static tripAgnesCircuitBreaker(error: any): void {
    const msg = error?.message || String(error);
    this.agnesFailureReason = msg;
    // Trip circuit breaker for 15 minutes
    this.agnesCircuitBreakerUntil = Date.now() + 15 * 60 * 1000;
    console.warn(
      `[AiPromptGenerator] ⚠️ Agnes AI failure detected ("${msg}"). Circuit breaker TRIPPED for 15 minutes. Future prompt requests will route directly to Groq without waiting.`
    );
  }

  /**
   * Manually resets the Agnes AI circuit breaker (e.g. from Settings or when testing connection).
   */
  public static resetCircuitBreaker(): void {
    if (this.agnesCircuitBreakerUntil > 0) {
      console.log('[AiPromptGenerator] Circuit breaker reset. Agnes AI is re-enabled.');
    }
    this.agnesCircuitBreakerUntil = 0;
    this.agnesFailureReason = '';
  }

  /**
   * Resolves the provider order based on user preference and circuit-breaker status.
   */
  private static getProviderOrder(): Array<'agnes' | 'groq'> {
    const primary = getPrimaryPromptProvider();
    if (primary === 'groq') {
      return ['groq', 'agnes'];
    }
    return ['agnes', 'groq'];
  }

  /**
   * Health and provider status
   */
  static async checkHealth(): Promise<{
    agnesConfigured: boolean;
    groqConfigured: boolean;
    primaryProvider: 'agnes' | 'groq';
    primary: string;
    fallback: string;
    activeProvider: string;
    agnesCircuitBreakerActive: boolean;
    agnesFailureReason: string;
    circuitBreakerRemainingSeconds: number;
  }> {
    const agnesOk = isAgnesConfigured();
    const groqOk = isGroqConfigured();
    const primaryPref = getPrimaryPromptProvider();
    const isCircuitBroken = Date.now() < this.agnesCircuitBreakerUntil;
    const remainingSeconds = Math.max(0, Math.round((this.agnesCircuitBreakerUntil - Date.now()) / 1000));

    let active = 'None configured (Set AGNES_API_KEY or GROQ_API_KEY)';
    if (primaryPref === 'groq') {
      if (groqOk) {
        active = `Groq (${getGroqModel()}) [Primary]`;
      } else if (agnesOk) {
        active = `Agnes AI (${getAgnesModel()}) [Fallback]`;
      }
    } else {
      if (isCircuitBroken && groqOk) {
        active = `Groq (${getGroqModel()}) [Agnes AI Cooldown Active]`;
      } else if (agnesOk) {
        active = `Agnes AI (${getAgnesModel()})`;
      } else if (groqOk) {
        active = `Groq (${getGroqModel()}) [Fallback]`;
      }
    }

    return {
      agnesConfigured: agnesOk,
      groqConfigured: groqOk,
      primaryProvider: primaryPref,
      primary: primaryPref === 'groq' ? `Groq (${getGroqModel()})` : `Agnes AI (${getAgnesModel()})`,
      fallback: primaryPref === 'groq' ? `Agnes AI (${getAgnesModel()})` : `Groq (${getGroqModel()})`,
      activeProvider: active,
      agnesCircuitBreakerActive: isCircuitBroken,
      agnesFailureReason: this.agnesFailureReason,
      circuitBreakerRemainingSeconds: remainingSeconds
    };
  }

  /**
   * Resolves a niche identifier or display name to its NicheStyleDefinition.
   */
  static resolveNiche(nicheKey?: string): NicheStyleDefinition {
    if (!nicheKey) return NICHE_STYLE_MAP['stoic_philosophy'];
    if (NICHE_STYLE_MAP[nicheKey]) return NICHE_STYLE_MAP[nicheKey];

    const lower = nicheKey.toLowerCase().trim();
    const matched = Object.values(NICHE_STYLE_MAP).find(
      (n) => n.id.toLowerCase() === lower || n.name.toLowerCase() === lower || lower.includes(n.id) || lower.includes(n.name.toLowerCase())
    );
    return matched || NICHE_STYLE_MAP['stoic_philosophy'];
  }

  /**
   * Compiles a lean, targeted system prompt for the specific active niche.
   * Reduces token footprint from ~3,500 tokens down to ~350 tokens (10x reduction),
   * dramatically speeding up LLM processing and Time-To-First-Token.
   */
  public static buildTargetedSystemPrompt(targetNiche: NicheStyleDefinition): string {
    if (targetNiche.id === 'ancient_history_stone_age') {
      return `SYSTEM ROLE:
You are an expert Text-to-Image Prompt Director for Stone Age 2D stick figure animation.
Your job is to convert EACH SCRIPT SCENE into a UNIQUE, DYNAMIC image-generation prompt.

CRITICAL REQUIREMENT - EVERY SCENE MUST BE A DIFFERENT VISUAL ACTION:
- DO NOT generate static characters just standing in the middle of a village! Every scene MUST look completely different!
- EACH scene must depict the SPECIFIC ACTION described in that line of script:
  * Hunting wild game with wooden spears across rocky plains
  * Crouching over a campfire cooking meat in clay pots
  * Chipping and knapping flint to craft stone axes and knives
  * Taking shelter in a dark stone cave with rock art during a blizzard or storm
  * Digging for roots or foraging berries in ancient forests
  * Sitting together sharing food and caring for children
  * Trekking across rugged wilderness on migration
  * Discovering new horizons or gazing at stars
- DYNAMIC PROPS: Always give the characters appropriate props in their hands ("holding wooden spears", "holding a burning wooden torch", "holding crude stone tools", "holding roasted meat", "holding digging tools").
- VARIED ENVIRONMENTS: Match the background to the scene (prehistoric dark cave with wall art, deep ancient forest, rocky mountain cliff, wide savanna plain, riverbank, or village huts).
- STRICT BEARD RULES:
  * Male only: "thick beard"
  * Female character present: DO NOT include "thick beard"
  * Both men and women: "thick beard on the man only" or "thick beard on the men only"
- EXACT PROMPT FORMULA:
  "Cartoon stick figure Stone Age [man/woman/men/people] [specific dynamic action from script], messy long hair, [beard rule], [his/her/their face is light brown], black stick arms, wearing primitive fur and animal-hide clothing, holding [prop], [scene-specific prehistoric background], flat 2D animation style."

OUTPUT SPECIFICATION:
For single prompt request: Return JSON: { "prompt": "Complete prompt text" }
For batch prompt request: Return JSON: { "prompts": [ { "id": "scene_id", "prompt": "Complete prompt text" } ] }`;
    }

    return `SYSTEM ROLE:
You are an expert cinematic Text-to-Image Prompt Director for long-form and short-form YouTube content.
Your job is to convert SCRIPT SCENES into highly detailed image-generation prompts.

CORE PRINCIPLES:
1. SCRIPT DETAILS DETERMINE WHAT IS SHOWN (action, character, setting, props). Never contradict or invent facts not in the script.
2. SELECTED NICHE DETERMINES VISUAL IDENTITY:
   - Niche: ${targetNiche.name}
   - Visual Style: ${targetNiche.visualIdentity}
   - Mandatory Style Elements: ${targetNiche.stylePhrase}
3. GLOBAL STYLE OVERRIDE:
   - Stickman & Minimalist Doodle = colorful 2D cartoon illustration style
   - Stone Age & Ancient History = cartoon stick figure Stone Age 2D animation style
   - Studio Ghibli Watercolor Anime = original nostalgic hand-painted watercolor anime style
   - All other cinematic / realistic niches = stylized 3D cartoon cinematic style (STRICT: DO NOT use photorealism, live-action photo, or flat 2D).
4. CRITICAL ANATOMY: Every character must have natural human anatomy with exactly two arms, two hands with five fingers each, and two legs. Absolutely NO extra limbs, NO three arms, NO duplicate hands.
5. ABSOLUTE TEXTLESS RULE: Normal scene images must have NO text, no words, no captions, no subtitles, no typography, no watermarks, no logos.

OUTPUT SPECIFICATION:
For single prompt request: Return JSON: { "prompt": "Complete prompt text" }
For batch prompt request: Return JSON: { "prompts": [ { "id": "scene_id", "prompt": "Complete prompt text" } ] }`;
  }

  /**
   * Generates a cinematic text-to-image prompt following the Prompt Director rules.
   * Primary: Agnes AI (agnes-2.0-flash), Fallback: Groq (llama-3.3-70b-versatile).
   */
  static async generatePrompt(params: PromptGenerationParams): Promise<PromptGenerationResult> {
    const cleanLine = (params.scriptLine || '')
      .replace(/\[(?:SFX|Music|Intro|Outro|Scene|Sound|Voice|Camera|Cut)[^\]]*\]/gi, '')
      .replace(/["\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const targetNiche = this.resolveNiche(params.niche);
    const shot = params.shotType || 'WIDE_SCENE';
    const aspect = params.aspectRatio === '9:16' ? '9:16' : '16:9';
    const sceneIndex = params.sceneIndex || 1;

    const userMessage = `Convert this script scene into a detailed image-generation prompt:

SCENE: ${sceneIndex}
SCRIPT: "${cleanLine}"
SELECTED NICHE: ${targetNiche.name}
REQUIRED VISUAL IDENTITY: ${targetNiche.visualIdentity}
MANDATORY STYLE PHRASE: "${targetNiche.stylePhrase}"
GLOBAL STYLE RULE:
- Stickman & Minimalist Doodle = colorful 2D cartoon illustration style
- Studio Ghibli Watercolor Anime = original nostalgic hand-painted watercolor anime style
- All other cinematic / realistic niches = stylized 3D cartoon cinematic style (STRICT: DO NOT use photorealism, DO NOT make realistic live-action, DO NOT make flat 2D)
${params.characterLock ? `CHARACTER CONSISTENCY LOCK (MUST REPLICATE EXACT SAME PERSON & WARDROBE):\n${params.characterLock}\n` : ''}
CRITICAL ANATOMY REQUIREMENT: The character must have natural human anatomy with EXACTLY TWO ARMS, exactly two hands, and exactly two legs. Absolutely NO extra limbs, NO three arms, NO duplicate hands, NO mutated body parts.
CAMERA FRAMING: ${shot}
ASPECT RATIO: ${aspect}
${params.sceneContext ? `STORY STATE / CONTEXT: ${params.sceneContext}` : ''}

IMAGE_TYPE: scene
Remember: NORMAL SCENE IMAGES HAVE ABSOLUTELY NO TEXT. Include "no text, no captions, no subtitles, no typography, no logo, no watermark".
Return valid JSON as specified.`;

    const providerOrder = this.getProviderOrder();
    let lastError: any = null;

    for (const provider of providerOrder) {
      if (provider === 'agnes') {
        if (!this.isAgnesAvailable()) {
          if (isAgnesConfigured()) {
            const sec = Math.max(0, Math.round((this.agnesCircuitBreakerUntil - Date.now()) / 1000));
            console.log(`[AiPromptGenerator] Skipping Agnes AI (circuit breaker active for ${sec}s due to earlier failure). Directly routing to Groq...`);
          }
          continue;
        }

        try {
          console.log(`[AiPromptGenerator] Requesting prompt from Agnes AI (${getAgnesModel()})...`);
          const agnes = this.getAgnesClient();
          const response = await agnes.chat.completions.create({
            model: getAgnesModel(),
            messages: [
              { role: 'system', content: this.buildTargetedSystemPrompt(targetNiche) },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.7
          });

          const choice = response.choices[0];
          const raw = (choice?.message?.content || (choice?.message as any)?.reasoning_content || '').trim();
          if (raw) {
            const prompt = this.extractPromptFromJsonOrText(raw, aspect, false, targetNiche);
            if (prompt && prompt.length > 5) {
              console.log(`[AiPromptGenerator] Successfully generated prompt via Agnes AI (${getAgnesModel()}).`);
              return {
                prompt,
                provider: 'agnes',
                model: getAgnesModel()
              };
            }
          }
        } catch (agnesErr: any) {
          this.tripAgnesCircuitBreaker(agnesErr);
          console.warn(`[AiPromptGenerator] Agnes AI failed (${agnesErr.message}). Seamlessly falling back to Groq...`);
          lastError = agnesErr;
        }
      } else if (provider === 'groq') {
        if (!isGroqConfigured()) {
          console.log('[AiPromptGenerator] Groq key not configured. Skipping Groq...');
          continue;
        }

        try {
          console.log('[AiPromptGenerator] Requesting prompt from Groq...');
          const { content: raw, model } = await this.callGroqWithFallback([
            { role: 'system', content: this.buildTargetedSystemPrompt(targetNiche) },
            { role: 'user', content: userMessage }
          ], 0.7, true);

          const prompt = this.extractPromptFromJsonOrText(raw, aspect, false, targetNiche);
          console.log(`[AiPromptGenerator] Successfully generated prompt via Groq (${model}).`);
          return {
            prompt,
            provider: 'groq',
            model
          };
        } catch (groqErr: any) {
          console.error(`[AiPromptGenerator] Groq failed: ${groqErr.message}`);
          lastError = groqErr;
        }
      }
    }

    throw new Error(
      `AI Prompt Generation failed. Providers exhausted: ${lastError?.message || 'Please set AGNES_API_KEY or GROQ_API_KEY in .env.local.'}`
    );
  }


  /**
   * Generates a YouTube thumbnail prompt following the Thumbnail Exception rules.
   */
  static async generateThumbnailPrompt(params: ThumbnailPromptParams): Promise<PromptGenerationResult> {
    const targetNiche = this.resolveNiche(params.niche);
    const aspect = params.aspectRatio === '9:16' ? '9:16' : '16:9';

    const userMessage = `Generate a cinematic YouTube thumbnail prompt:

IMAGE_TYPE: THUMBNAIL
TITLE / TOPIC: "${params.title}"
SELECTED NICHE: ${targetNiche.name}
REQUIRED VISUAL IDENTITY: ${targetNiche.visualIdentity}
MANDATORY STYLE PHRASE: "${targetNiche.stylePhrase}"
GLOBAL STYLE RULE:
- Stickman & Minimalist Doodle = colorful 2D cartoon illustration style
- Studio Ghibli Watercolor Anime = original nostalgic hand-painted watercolor anime style
- All other cinematic / realistic niches = stylized 3D cartoon cinematic style (STRICT: DO NOT use photorealism, DO NOT make realistic live-action, DO NOT make flat 2D)
ASPECT RATIO: ${aspect}
${params.thumbnailText ? `THUMBNAIL_TEXT: "${params.thumbnailText}"` : 'THUMBNAIL_TEXT: None requested (create visual focal point without text)'}
${params.storySummary ? `STORY SUMMARY: ${params.storySummary}` : ''}

Remember: Thumbnail requirements: one obvious focal point, strong emotion or mystery, simple readable composition, strong foreground/background separation, clear at small sizes.
If thumbnail text is supplied, include ONLY that exact text.
Return valid JSON as specified.`;

    const providerOrder = this.getProviderOrder();
    let lastError: any = null;

    for (const provider of providerOrder) {
      if (provider === 'agnes') {
        if (!this.isAgnesAvailable()) {
          if (isAgnesConfigured()) {
            const sec = Math.max(0, Math.round((this.agnesCircuitBreakerUntil - Date.now()) / 1000));
            console.log(`[AiPromptGenerator] Skipping Agnes AI for thumbnail (circuit breaker active for ${sec}s). Directly using Groq...`);
          }
          continue;
        }

        try {
          console.log(`[AiPromptGenerator] Generating thumbnail prompt via Agnes AI (${getAgnesModel()})...`);
          const agnes = this.getAgnesClient();
          const response = await agnes.chat.completions.create({
            model: getAgnesModel(),
            messages: [
              { role: 'system', content: CINEMATIC_PROMPT_DIRECTOR_SYSTEM_PROMPT },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.7
          });

          const choice = response.choices[0];
          const raw = (choice?.message?.content || (choice?.message as any)?.reasoning_content || '').trim();
          if (raw) {
            const prompt = this.extractPromptFromJsonOrText(raw, aspect, true, targetNiche);
            if (prompt && prompt.length > 5) {
              console.log(`[AiPromptGenerator] Successfully generated thumbnail prompt via Agnes AI (${getAgnesModel()}).`);
              return { prompt, provider: 'agnes', model: getAgnesModel() };
            }
          }
        } catch (agnesErr: any) {
          this.tripAgnesCircuitBreaker(agnesErr);
          console.warn(`[AiPromptGenerator] Agnes AI thumbnail failed (${agnesErr.message}). Falling back to Groq...`);
          lastError = agnesErr;
        }
      } else if (provider === 'groq') {
        if (!isGroqConfigured()) continue;

        try {
          console.log('[AiPromptGenerator] Generating thumbnail prompt via Groq...');
          const { content: raw, model } = await this.callGroqWithFallback([
            { role: 'system', content: CINEMATIC_PROMPT_DIRECTOR_SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
          ]);

          const prompt = this.extractPromptFromJsonOrText(raw, aspect, true, targetNiche);
          return { prompt, provider: 'groq', model };
        } catch (groqErr: any) {
          lastError = groqErr;
        }
      }
    }

    throw new Error(`Thumbnail Prompt Generation failed: ${lastError?.message || 'Please set AGNES_API_KEY or GROQ_API_KEY in .env.local.'}`);
  }

  /**
   * Batch enrichment helper to generate prompts for visual beats in parallel with concurrency limiting.
   */
  /**
   * Derives or establishes a canonical visual character sheet for recurring characters in the script.
   */
  static async deriveCharacterLock(fullScript: string, niche?: string): Promise<string> {
    const text = (fullScript || '').trim();
    if (!text) return '';

    if (niche === 'ancient_history_stone_age') {
      return 'Protagonist: Cartoon stick figure Stone Age character, messy long hair, light brown face, black stick arms, wearing primitive fur and animal-hide clothing, flat 2D animation style.';
    }

    // Check if any character or person exists in the script
    const hasCharacter = /\b(boy|girl|man|woman|child|monk|philosopher|farmer|soldier|king|scholar|detective|officer|merchant|trader|brother|sister|father|mother)\b/i.test(text);
    if (!hasCharacter) return '';

    const getHeuristic = (): string => {
      if (/\bboy\b/i.test(text)) {
        return 'Protagonist: 9-year-old boy, messy dark-brown anime hair, wide expressive brown eyes, loose beige short-sleeve collared shirt, rolled-up tan knee-length shorts, brown leather walking shoes. Natural two-armed human anatomy.';
      }
      if (/\bphilosopher|seneca|marcus|aurelius|epictetus|stoic\b/i.test(text)) {
        return 'Protagonist: 55-year-old classical Greco-Roman philosopher, neat silver-streaked beard, thoughtful eyes, draped off-white wool toga over simple linen tunic, leather sandals. Natural two-armed human anatomy.';
      }
      if (/\bman|raise|wealth|money|finance|save|saving|income|bank\b/i.test(text)) {
        return 'Protagonist: 32-year-old professional businessman, neat short dark hair, clean-shaven, tailored navy blue two-piece business suit, crisp white dress shirt, slim tie, dark dress shoes. Natural two-armed human anatomy.';
      }
      if (/\bgirl\b/i.test(text)) {
        return 'Protagonist: 10-year-old girl, braided chestnut hair, bright curious eyes, rustic cotton dress with cream apron, sturdy brown lace-up shoes. Natural two-armed human anatomy.';
      }
      return 'Protagonist: Visually consistent character design with fixed age, hairstyle, face, clothing colors, and natural two-armed human anatomy.';
    };

    const prompt = `Based on this video script, establish a canonical visual character sheet for the main recurring protagonist:
SCRIPT: "${text.slice(0, 1000)}"
SELECTED NICHE: ${niche || 'Cinematic'}

Return a 1-sentence visual character lock with: exact age, hairstyle & hair color, facial features, exact clothing & colors, footwear. Always end with: "Natural two-armed human anatomy."`;

    const providerOrder = this.getProviderOrder();
    for (const provider of providerOrder) {
      if (provider === 'agnes') {
        if (!this.isAgnesAvailable()) continue;
        try {
          const agnes = this.getAgnesClient();
          const res = await agnes.chat.completions.create({
            model: getAgnesModel(),
            messages: [
              { role: 'system', content: 'You are an expert character designer for animation and cinema.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.5
          });
          const choice = res.choices[0];
          let result = (choice?.message?.content || (choice?.message as any)?.reasoning_content || '').trim();
          if (result && result.length > 10) {
            const codeMatch = result.match(/```(?:markdown|json|text)?\s*([\s\S]*?)```/);
            if (codeMatch) result = codeMatch[1].trim();
            result = result.replace(/^[`"']+|[`"']+$/g, '').trim();
            console.log('[AiPromptGenerator] Successfully derived character lock via Agnes AI.');
            return result;
          }
        } catch (err: any) {
          this.tripAgnesCircuitBreaker(err);
          console.warn(`[AiPromptGenerator] Agnes AI character lock notice: ${err.message}. Falling back...`);
        }
      } else if (provider === 'groq') {
        if (!isGroqConfigured()) continue;
        try {
          const { content: raw } = await this.callGroqWithFallback([
            { role: 'system', content: 'You are an expert character designer for animation and cinema.' },
            { role: 'user', content: prompt }
          ], 0.5);
          if (raw && raw.length > 20 && !raw.includes('```')) {
            return raw;
          }
        } catch {}
      }
    }

    return getHeuristic();
  }


  /**
   * Generates a batch of image-generation prompts in a single LLM API call.
   * Reduces round-trip network latency from 60-90s down to 2-4s.
   */
  static async generatePromptBatch(
    items: Array<{
      id: string;
      scriptText: string;
      shotType?: string;
      sceneContext?: string;
    }>,
    options: {
      niche?: string;
      aspectRatio?: string;
      characterLock?: string;
    }
  ): Promise<Map<string, string>> {
    const resultMap = new Map<string, string>();
    if (!items || items.length === 0) return resultMap;

    const targetNiche = this.resolveNiche(options.niche);
    const aspect = options.aspectRatio === '9:16' ? '9:16' : '16:9';
    const systemPrompt = this.buildTargetedSystemPrompt(targetNiche);

    const userMessage = JSON.stringify({
      instruction: 'Convert each scene into a detailed image-generation prompt adhering strictly to the visual niche and textless rule.',
      niche: targetNiche.name,
      aspectRatio: aspect,
      characterConsistencyLock: options.characterLock || 'None',
      scenes: items.map((item, idx) => ({
        id: item.id,
        sceneNumber: idx + 1,
        script: (item.scriptText || '')
          .replace(/\[(?:SFX|Music|Intro|Outro|Scene|Sound|Voice|Camera|Cut)[^\]]*\]/gi, '')
          .replace(/["\n\r]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
        cameraFraming: item.shotType || 'WIDE_SCENE',
        sceneContext: item.sceneContext || ''
      }))
    });

    const providerOrder = this.getProviderOrder();
    let lastError: any = null;

    for (const provider of providerOrder) {
      if (provider === 'agnes') {
        if (!this.isAgnesAvailable()) continue;
        try {
          console.log(`[AiPromptGenerator] Requesting batch of ${items.length} prompts via Agnes AI (${getAgnesModel()})...`);
          const agnes = this.getAgnesClient();
          const response = await agnes.chat.completions.create({
            model: getAgnesModel(),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.7
          });
          const raw = (response.choices[0]?.message?.content || '').trim();
          if (raw) {
            const parsed = this.extractBatchPrompts(raw, aspect, targetNiche);
            if (parsed.size > 0) {
              console.log(`[AiPromptGenerator] Successfully generated ${parsed.size}/${items.length} prompts via Agnes AI.`);
              return parsed;
            }
          }
        } catch (agnesErr: any) {
          this.tripAgnesCircuitBreaker(agnesErr);
          console.warn(`[AiPromptGenerator] Agnes AI batch notice: ${agnesErr.message}. Falling back to Groq...`);
          lastError = agnesErr;
        }
      } else if (provider === 'groq') {
        if (!isGroqConfigured()) continue;
        try {
          console.log(`[AiPromptGenerator] Requesting batch of ${items.length} prompts via Groq...`);
          const { content: raw, model } = await this.callGroqWithFallback(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            0.7,
            true
          );
          const parsed = this.extractBatchPrompts(raw, aspect, targetNiche);
          if (parsed.size > 0) {
            console.log(`[AiPromptGenerator] Successfully generated ${parsed.size}/${items.length} prompts via Groq (${model}).`);
            return parsed;
          }
        } catch (groqErr: any) {
          console.error(`[AiPromptGenerator] Groq batch notice: ${groqErr.message}`);
          lastError = groqErr;
        }
      }
    }

    throw lastError || new Error('Batch prompt generation failed across all providers');
  }

  /**
   * Extracts batch prompts from JSON response into a Map<id, prompt>.
   */
  private static extractBatchPrompts(
    raw: string,
    aspect: string,
    targetNiche?: NicheStyleDefinition
  ): Map<string, string> {
    const map = new Map<string, string>();
    let clean = raw.trim();

    // Check code blocks
    const codeMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      clean = codeMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(clean);
      const list = parsed.prompts || parsed.scenes || parsed.items || (Array.isArray(parsed) ? parsed : []);
      if (Array.isArray(list)) {
        for (const entry of list) {
          const id = entry.id || entry.beatId || entry.sceneId;
          const promptText = entry.prompt || entry.imagePrompt || entry.text;
          if (id && promptText && typeof promptText === 'string') {
            map.set(String(id), this.finalizePromptText(promptText, aspect, false, targetNiche));
          }
        }
      }
    } catch {
      // Regex extraction fallback
      const regex = /"id"\s*:\s*"([^"]+)"[\s\S]*?"prompt"\s*:\s*"([^"]+)"/g;
      let match;
      while ((match = regex.exec(clean)) !== null) {
        map.set(match[1], this.finalizePromptText(match[2], aspect, false, targetNiche));
      }
    }

    return map;
  }

  static async enrichBeats(
    beats: Array<{
      id: string;
      sceneId: string;
      scriptText?: string;
      shotType: string;
      imagePrompt: string;
      visualConcept?: string;
      environmentDescription?: string;
    }>,
    options: {
      niche?: string;
      aspectRatio?: string;
      scenesMap?: Map<string, string>;
      concurrency?: number;
      characterLock?: string;
      fullScript?: string;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<void> {
    if (!beats || beats.length === 0) return;

    const total = beats.length;

    // Establish or derive project character consistency lock
    let characterLock = options.characterLock || '';
    if (!characterLock) {
      const combinedScript = options.fullScript || Array.from(options.scenesMap?.values() || []).join(' ') || beats.map(b => b.scriptText || '').join(' ');
      try {
        characterLock = await this.deriveCharacterLock(combinedScript, options.niche);
        if (characterLock) {
          console.log(`[AiPromptGenerator] Established project character consistency lock: ${characterLock}`);
        }
      } catch (err: any) {
        console.warn('[AiPromptGenerator] Character lock derivation notice:', err.message);
      }
    }

    // Chunk into optimal batches of 6 beats
    const BATCH_SIZE = 6;
    const batches: Array<Array<{
      id: string;
      scriptText: string;
      shotType: string;
      sceneContext: string;
      beatRef: typeof beats[0];
    }>> = [];

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const chunk = beats.slice(i, i + BATCH_SIZE).map((beat) => {
        const sceneText = options.scenesMap?.get(beat.sceneId) || beat.scriptText || '';
        const beatScript = (beat.scriptText && beat.scriptText.trim().length > 0) ? beat.scriptText : (beat.visualConcept || sceneText);
        return {
          id: beat.id,
          scriptText: beatScript,
          shotType: beat.shotType,
          sceneContext: sceneText,
          beatRef: beat
        };
      });
      batches.push(chunk);
    }

    // Dynamic worker concurrency: Groq handles multiple concurrent batch requests easily
    const isUsingGroq = !this.isAgnesAvailable() || getPrimaryPromptProvider() === 'groq';
    const workerCount = isUsingGroq ? Math.min(3, batches.length) : 1;
    let nextBatchIdx = 0;
    let completedCount = 0;

    console.log(`[AiPromptGenerator] Enriching ${total} visual beats in ${batches.length} batches (BatchSize: ${BATCH_SIZE}, Workers: ${workerCount})...`);

    const workers = Array.from({ length: workerCount }, async () => {
      while (nextBatchIdx < batches.length) {
        const batchIdx = nextBatchIdx++;
        const currentBatch = batches[batchIdx];
        if (!currentBatch) break;

        try {
          const resultMap = await this.generatePromptBatch(
            currentBatch.map(b => ({
              id: b.id,
              scriptText: b.scriptText,
              shotType: b.shotType,
              sceneContext: b.sceneContext
            })),
            {
              niche: options.niche,
              aspectRatio: options.aspectRatio,
              characterLock
            }
          );

          for (const item of currentBatch) {
            const prompt = resultMap.get(item.id);
            if (prompt && prompt.length > 10) {
              item.beatRef.imagePrompt = prompt;
            } else {
              // Individual fallback for omitted beat
              item.beatRef.imagePrompt = PromptService.buildPrompt(
                item.scriptText,
                item.beatRef.visualConcept,
                item.beatRef.shotType,
                item.beatRef.environmentDescription,
                options.niche,
                options.aspectRatio
              );
            }
            completedCount++;
            if (options.onProgress) {
              options.onProgress(completedCount, total);
            }
          }
        } catch (batchErr: any) {
          console.warn(`[AiPromptGenerator] Batch ${batchIdx + 1} fallback notice: ${batchErr.message}`);
          for (const item of currentBatch) {
            item.beatRef.imagePrompt = PromptService.buildPrompt(
              item.scriptText,
              item.beatRef.visualConcept,
              item.beatRef.shotType,
              item.beatRef.environmentDescription,
              options.niche,
              options.aspectRatio
            );
            completedCount++;
            if (options.onProgress) {
              options.onProgress(completedCount, total);
            }
          }
        }
      }
    });

    await Promise.all(workers);
    console.log(`[AiPromptGenerator] Finished enriching ${completedCount}/${total} beats.`);
  }

  /**
   * Extracts prompt from JSON response or falls back to raw string cleaning.
   */
  private static extractPromptFromJsonOrText(
    raw: string,
    aspect: string,
    isThumbnail: boolean,
    targetNiche?: NicheStyleDefinition
  ): string {
    let clean = raw.trim();

    // Check for JSON in code blocks
    const jsonMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      clean = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(clean);
      if (parsed.prompt && typeof parsed.prompt === 'string') {
        return this.finalizePromptText(parsed.prompt, aspect, isThumbnail, targetNiche);
      }
      if (Array.isArray(parsed.scenes) && parsed.scenes[0]?.prompt) {
        return this.finalizePromptText(parsed.scenes[0].prompt, aspect, isThumbnail, targetNiche);
      }
    } catch {
      // If not strict JSON, process as direct text
    }

    // Direct text fallback
    clean = clean
      .replace(/^[`"']+|[`"']+$/g, '')
      .replace(/^(?:Prompt|Image Prompt|Generated Prompt):\s*/i, '')
      .replace(/^\*\*(?:Prompt|Image Prompt):\*\*\s*/i, '')
      .trim();

    return this.finalizePromptText(clean, aspect, isThumbnail, targetNiche);
  }

  private static finalizePromptText(
    prompt: string,
    aspect: string,
    isThumbnail: boolean,
    targetNiche?: NicheStyleDefinition
  ): string {
    let p = prompt.trim();

    // Strict Enforcement of Global Style Override:
    // If the niche is neither stickman, stone age, nor ghibli, ensure NO photorealistic or live-action terms leak in
    if (targetNiche && targetNiche.id !== 'stickman_doodle' && targetNiche.id !== 'ancient_history_stone_age' && targetNiche.id !== 'studio_ghibli') {
      p = p.replace(/\b(photorealistic|hyperrealistic|photograph|35mm photo|live-action photo|live-action realism|live action)\b/gi, 'stylized 3D cartoon');
    }

    // Human Anatomy Enforcement: Ensure character has natural anatomy for non-stickman styles
    const isStickman = targetNiche && (targetNiche.id === 'stickman_doodle' || targetNiche.id === 'ancient_history_stone_age');
    const hasPerson = /\b(boy|girl|man|woman|child|person|people|character|philosopher|figure|scholar|warrior|farmer|executive|worker|elder|monk)\b/i.test(p);
    if (!isStickman && hasPerson && !p.toLowerCase().includes('two arms')) {
      p += ', anatomically correct, exactly two arms, exactly two hands, exactly two legs, no extra limbs, no three arms, no extra arms, no duplicate limbs';
    }

    if (!isThumbnail) {
      // Enforce the absolute text rule for normal scenes
      if (!p.toLowerCase().includes('no text') && !p.toLowerCase().includes('no captions')) {
        p += ', no text, no captions, no subtitles, no typography, no logo, no watermark';
      }
    }

    // Append aspect ratio if not present
    const aspectPhrase = aspect === '9:16' ? '9:16 vertical portrait' : '16:9 widescreen composition';
    if (!p.includes('9:16') && !p.includes('16:9')) {
      p += `, ${aspectPhrase}`;
    }

    return p;
  }
}
