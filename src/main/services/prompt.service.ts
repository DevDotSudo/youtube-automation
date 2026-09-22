/**
 * PromptService: Generates breathtaking Studio Ghibli hand-painted anime prompts
 * in the aesthetic of Hayao Miyazaki and Makoto Shinkai.
 * 
 * CRITICAL RULE:
 * - Every image MUST directly match and illustrate what is being spoken in the speech.
 * - Clean visual storytelling with ZERO text, letters, or subtitles.
 * - Lush watercolor backgrounds, emotional character design, nostalgic atmospheric lighting.
 */
export interface InImageTextSpec {
  text: string;
  location: string;
}

export class PromptService {
  /**
   * Detects contextual in-image text only for rare diegetic artifacts (antique signs/maps).
   */
  static detectContextualInImageText(scriptLine: string, concept?: string): InImageTextSpec | null {
    const conceptLower = (concept || '').toLowerCase();
    const scriptLower = (scriptLine || '').toLowerCase();

    if (['signpost', 'marker', 'trail sign'].some((k) => conceptLower.includes(k))) {
      if (['path', 'way', 'north', 'sea', 'town', 'village'].some((k) => (scriptLower + ' ' + conceptLower).includes(k))) {
        return {
          text: 'TOWN',
          location: 'carved wooden trail signpost'
        };
      }
    }

    return null;
  }

  /**
   * Semantically analyzes speech narration to derive vivid, directly connected
   * Studio Ghibli anime scenes.
   */
  static deriveSpeechConnectedConcept(scriptLine: string): { visualConcept: string; environmentDescription: string } {
    const clean = (scriptLine || '').replace(/[\"\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) {
      return {
        visualConcept: 'A picturesque Studio Ghibli landscape with rolling green meadows, wild flowers, distant mountain peaks, and cinematic golden hour sunlight.',
        environmentDescription: 'Lush hand-painted anime landscape with soft golden sunlight and nostalgic atmosphere.'
      };
    }

    const lower = clean.toLowerCase();

    // 1. Welcome / Introduction to Stories / Magical Impossible Places
    if (anyMatch(lower, ['welcome', 'unseen stories', 'impossible places', 'magical stories', 'subscribe', 'channel'])) {
      return {
        visualConcept: 'A quaint cobblestone town square with an intriguing vintage curiosity bookshop and glowing amber lanterns, inviting travelers into a world of impossible magical stories.',
        environmentDescription: 'A quiet cobblestone European town street in peaceful afternoon light with potted flowers and quaint storefronts.'
      };
    }

    // 2. Cafe / Coffee / Tea - Rainy Night Discovery
    if (anyMatch(lower, ['café', 'cafe', 'coffee', 'tea', 'bistro', 'diner']) && anyMatch(lower, ['rain', 'rainy', 'night', 'street', 'noticed', 'glowing', 'alley'])) {
      return {
        visualConcept: 'A young anime traveler in a coat walking along a quiet rain-slicked cobblestone street at night, looking with surprise and curiosity at a small charming café glowing warmly with amber light at the end of the alley.',
        environmentDescription: 'Atmospheric rainy European town street at night, wet reflective cobblestones reflecting warm golden streetlamps and glowing café windows.'
      };
    }

    // 3. Cafe Interior / Table / Waiting Coffee Cup
    if (anyMatch(lower, ['table', 'empty', 'waiting', 'cup of coffee', 'cup', 'steaming', 'ceramic']) || (anyMatch(lower, ['café', 'cafe', 'coffee', 'inside']) && anyMatch(lower, ['empty', 'waiting', 'cup', 'table']))) {
      return {
        visualConcept: 'Inside a quiet retro anime café with empty polished wooden tables in warm amber lighting, where a single steaming ceramic cup of coffee sits waiting on a wooden table.',
        environmentDescription: 'Cozy vintage café interior with dark wood furniture, warm pendant lamps, gentle steam, and quiet peaceful atmosphere.'
      };
    }

    // 4. Cafe Owner / Barista / Reassuring Smile
    if (anyMatch(lower, ['owner', 'barista']) || (anyMatch(lower, ['smiled', 'smile', 'said']) && anyMatch(lower, ['appear', 'forgotten', 'seen', 'welcome']))) {
      return {
        visualConcept: 'Medium view of a kind, gentle anime café owner with a warm reassuring smile standing behind a polished wooden counter, with vintage copper kettles and cups.',
        environmentDescription: 'Warmly lit café interior, golden amber lamp glow, shelves of ceramic tea cups, and comforting nostalgic atmosphere.'
      };
    }

    // 5. Heartfelt Conversation / Late Night / Rain Stopping
    if (anyMatch(lower, ['talking', 'talked', 'stayed', 'spoke', 'conversation', 'kept inside', 'inside for years']) || (anyMatch(lower, ['stayed', 'talking']) && anyMatch(lower, ['rain', 'night', 'hours']))) {
      return {
        visualConcept: 'Inside the cozy café late at night, a young anime man seated at a wooden table in deep, heartfelt conversation with the café owner, with rain trickling softly down the windowpane.',
        environmentDescription: 'Intimate warm café setting, soft amber illumination, raindrops on the window glass, and deep emotional connection.'
      };
    }

    // 6. Next Morning / Cafe Gone / Peace / No Longer Alone / Hope
    if (anyMatch(lower, ['morning', 'next morning', 'sunrise', 'dawn']) && anyMatch(lower, ['gone', 'disappear', 'alone', 'no longer', 'felt', 'sunlight', 'months'])) {
      return {
        visualConcept: 'Bright morning sunlight washing over the quiet cobblestone street corner where the magical café once stood, a young anime man walking forward with a gentle peaceful smile and clear, hopeful eyes.',
        environmentDescription: 'Fresh sun-drenched European street corner with crisp golden morning sunbeams, gentle breeze, and clear blue skies.'
      };
    }

    // 7. Coastal Train / Railway / Ocean Travel
    if (anyMatch(lower, ['train', 'station', 'railway', 'track', 'journey', 'travel', 'sea', 'ocean', 'waves', 'shore'])) {
      return {
        visualConcept: 'A scenic vintage coastal train car rolling past glistening emerald ocean waves under gigantic sunlit cumulus clouds, gentle sea breeze fluttering white curtains.',
        environmentDescription: 'Rustic vintage train passenger car with polished mahogany benches and brass fixtures reflecting warm coastal sunlight.'
      };
    }

    // 8. Ancient Forest / Shrine / Nature / Woodland Spirits
    if (anyMatch(lower, ['forest', 'tree', 'ancient', 'shrine', 'spirit', 'nature', 'moss', 'woods', 'glade', 'temple'])) {
      return {
        visualConcept: 'An ancient moss-covered stone shrine nestled deep within a primeval emerald forest, with filtered golden sunbeams streaming through emerald canopy leaves.',
        environmentDescription: 'Enchanted woodland sanctuary with lush velvet moss, giant gnarled tree roots, and blooming wild bellflowers.'
      };
    }

    // 9. Attic Bedroom / Open Window / Night / Dreams
    if (anyMatch(lower, ['bed', 'sleep', 'bedroom', 'attic', 'window', 'dream', 'nightstand', 'pillow', 'quilt'])) {
      return {
        visualConcept: 'A cozy sunlit attic bedroom with exposed wooden ceiling beams, potted ferns, and an open window looking out across tiled rooftops toward starry twilight skies.',
        environmentDescription: 'Rustic attic bedroom filled with warm amber candlelight, patchwork quilts, and stacks of antique illustrated storybooks.'
      };
    }

    // 10. Countryside Cottage / Kitchen / Hearth / Food
    if (anyMatch(lower, ['cottage', 'kitchen', 'hearth', 'bread', 'stove', 'cooking', 'fireplace', 'baking'])) {
      return {
        visualConcept: 'A charming European countryside cottage kitchen with copper pots hanging above a stone hearth, fresh crusty bread on a rustic table, and warm morning sunbeams.',
        environmentDescription: 'Country kitchen filled with earthenware bowls, bunches of dried lavender, and soft morning mist outside the window.'
      };
    }

    // 11. Rainy Walk / Umbrella / Cobblestones / Solitude
    if (anyMatch(lower, ['rain', 'rainy', 'umbrella', 'puddle', 'storm', 'wet'])) {
      return {
        visualConcept: 'A solitary reflective young anime figure holding a clear umbrella on a quiet rain-washed cobblestone street, glowing paper lanterns reflecting in glistening street puddles.',
        environmentDescription: 'Historic coastal town alleyway with weathered stone buildings, lush ivy vines, and gentle soft rain showers.'
      };
    }

    // 12. Books / Library / Letter / Reading / Memories
    if (anyMatch(lower, ['book', 'library', 'letter', 'read', 'write', 'story', 'history', 'memory', 'remember', 'scroll'])) {
      return {
        visualConcept: 'An antique wooden study or library filled with illustrated books and open parchment maps illuminated by warm lantern light.',
        environmentDescription: 'Cozy library nook with floor-to-ceiling shelves, stained glass window casting colored light, and floating dust motes.'
      };
    }

    // 13. Dynamic Direct Speech Grounding for Any General Story Sentence
    return {
      visualConcept: `Studio Ghibli hand-painted anime scene directly illustrating: "${clean}". The artwork features the characters, setting, and emotional action described in the narration with authentic Hayao Miyazaki watercolor depth.`,
      environmentDescription: 'Lush hand-painted anime background with authentic watercolor textures, cinematic natural lighting, and atmospheric perspective matching the spoken story.'
    };
  }

  static generateVisualConcept(scriptLine: string): string {
    return this.deriveSpeechConnectedConcept(scriptLine).visualConcept;
  }

  static generateOverlayText(_scriptLine: string): string {
    return '';
  }

  static buildPrompt(scriptLine: string, visualConceptOverride?: string, shotType: string = "WIDE_SCENE", environmentDescription?: string): string {
    const cleanLine = (scriptLine || '')
      .replace(/[\"\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const derived = this.deriveSpeechConnectedConcept(cleanLine);
    const concept = visualConceptOverride || derived.visualConcept;
    const env = environmentDescription || derived.environmentDescription;
    const inImageText = this.detectContextualInImageText(cleanLine, concept);

    const inImageSection = inImageText
      ? `IN-IMAGE TEXT SPECIFICATION:
- Clearly display the subtle carved text "${inImageText.text}" on the ${inImageText.location}.
- Strictly NO other random words, watermarks, gibberish letters, or background captions.`
      : `STRICTLY NO TEXT:
- No text, no words, no letters, no captions, no typography, no watermarks anywhere in this illustration.`;

    const exclusions = inImageText
      ? `- stickman, stick figure, crude drawing, bad anatomy
- 3D CGI render, photorealistic skin, low polygon
- blurry text, illegible scribbles, random gibberish letters, watermarks, signatures`
      : `- stickman, stick figure, crude drawing, bad anatomy
- 3D CGI render, photorealistic skin, low polygon
- text, words, letters, captions, typography, subtitles, watermarks, signatures`;

    const narrationBlock = cleanLine
      ? `STORY NARRATION (ILLUSTRATE THIS EXACT SCENE):
"${cleanLine}"

`
      : '';

    return `Create a breathtaking Studio Ghibli hand-painted anime illustration in the aesthetic of Hayao Miyazaki and Makoto Shinkai.

${narrationBlock}VISUAL SCENE DETAILS:
"${concept}"

SHOT TYPE:
"${shotType}"

ENVIRONMENT & ATMOSPHERE:
"${env}"

${inImageSection}

ART DIRECTION & STYLE:
- Authentic Studio Ghibli real-world slice-of-life anime aesthetic (Whisper of the Heart, From Up on Poppy Hill, Ocean Waves)
- Grounded everyday realism: NO fairytale, NO fantasy, NO magic, NO surrealism
- Realistic everyday environments, authentic human characters in casual everyday clothing, and heartfelt emotional resonance
- Traditional hand-painted gouache and watercolor textures with rich natural lighting (golden hour sunbeams, soft rainy afternoon overcast, warm incandescent interior lamp light)
- Painterly details, gentle atmospheric perspective, masterwork grounded anime cinematography

STRICT EXCLUSIONS (DO NOT INCLUDE):
- fairytale, fantasy, magic, floating islands, flying airships, magic dust, glowing particles, wizards, witches, surrealism
${exclusions}

16:9 widescreen landscape.`;
  }
}

function anyMatch(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}
