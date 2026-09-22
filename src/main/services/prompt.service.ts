/**
 * PromptService: Generates breathtaking cinematic visual prompts across 13 distinct niches
 * with strict zero-text-overlay enforcement for pure visual artwork.
 */
export interface InImageTextSpec {
  text: string;
  location: string;
}

export class PromptService {
/**
   * Strictly disabled - all image generations must be 100% textless without any text overlay.
   */
  static detectContextualInImageText(_scriptLine: string, _concept?: string): InImageTextSpec | null {
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

  static getArtDirection(niche?: string): {
    header: string;
    styleDirectives: string[];
    exclusions: string[];
  } {
    switch (niche) {
      case 'stickman_doodle':
        return {
          header: 'Create a clean, expressive minimalist hand-drawn stickman illustration in modern viral YouTube explainer cartoon style (Casually Explained and MinutePhysics aesthetic).',
          styleDirectives: [
            'Minimalist black ink line art on a clean white or dark chalkboard background',
            'Expressive, witty stick figure characters with dynamic gestures and clear emotions',
            'Simple hand-drawn props and subtle color accents (yellow, red, or cyan) to highlight key story elements',
            'Clean infographic doodle composition with high clarity and humorous visual storytelling',
            'Clear bold lines with hand-drawn marker texture, zero clutter'
          ],
          exclusions: [
            'photorealism, 3D CGI render, realistic human skin, complex photographic textures',
            'detailed realistic face, eyes, hyper-detailed musculature',
            'fairytale magic dust, glowing sparkles, blurry mess'
          ]
        };

      case 'stoic_philosophy':
        return {
          header: 'Create a dramatic, museum-grade chiaroscuro oil painting in the classical academic style of Caravaggio and Rembrandt.',
          styleDirectives: [
            'Dramatic chiaroscuro high-contrast lighting with deep, rich shadows and focused warm golden illumination',
            'Weathered classical marble busts, ancient Roman or Greek architecture, stone columns, parchment scrolls, and flickering candles',
            'Subtle cracked oil canvas texture, rich earth pigments (burnt umber, ochre, deep crimson, aged bronze)',
            'Solemn, contemplative atmosphere with profound philosophical weight and timeless historical gravitas',
            'Museum masterpiece composition, rich impasto brushwork, cinematic depth'
          ],
          exclusions: [
            'modern clothing, contemporary items, neon colors, plastic, digital gadgets',
            'anime, cartoon, stickman, 3D CGI render, pop art',
            'fairytale fantasy, glowing magical spells, whimsical sparkles'
          ]
        };

      case 'cosmic_scifi':
        return {
          header: 'Create a monumental retro-futuristic science fiction matte painting in the aesthetic of 1970s and 1980s masters (Syd Mead, Chris Foss, John Harris).',
          styleDirectives: [
            'Colossal monolithic scale: planetary horizons, megastructures, Dyson rings, or colossal exploration vessels drifting in the silence of deep space',
            'Rich analog matte painting textures with volumetric cosmic dust, solar flares, and glowing nebula backlighting',
            'Grounded hard science-fiction aesthetic with industrial structural realism',
            'Breathtaking sense of cosmic scale, vast silence, and existential wonder',
            'Cinematic 70mm widescreen composition with cinematic lighting'
          ],
          exclusions: [
            'cartoony spaceships, fantasy magic, whimsical sparkles',
            'stickman, crude sketches, modern cell phone photos',
            'cluttered low-res CGI, blurry video artifacts'
          ]
        };

      case 'true_crime_noir':
        return {
          header: 'Create a gritty, authentic vintage 35mm analog photograph in the style of 1970s Cold War espionage and investigative film noir.',
          styleDirectives: [
            'Authentic 35mm analog film grain, Kodak Tri-X / Kodachrome vintage color science with subtle desaturation',
            'Harsh candid flash photography, deep shadowy alleyways, rain-slicked wet pavement, and moody trench coats',
            'Atmospheric espionage setting: vintage typewriter desks, classified dossier folders, rotary phones, surveillance binoculars',
            'Tense, authentic documentary realism with cinematic mystery',
            'Grounded investigative realism with natural film grain and lens vignetting'
          ],
          exclusions: [
            'futuristic sci-fi, anime, cartoon, stickman, fantasy magic',
            'glossy 3D render, over-saturated colors, bright fairytale lighting'
          ]
        };

      case 'ancient_civilizations':
        return {
          header: 'Create a dramatic, high-detail archaeological discovery photograph in the style of National Geographic expeditions.',
          styleDirectives: [
            'Dramatic torchlit and golden-hour excavation lighting revealing towering ancient stone monuments and hieroglyphic reliefs',
            'Atmospheric dust particles floating in volumetric light shafts, ancient sandstone masonry, and weathered artifacts',
            'Authentic historical reverence: subterranean crypts, massive carved pharaoh statues, golden burial artifacts',
            'Intricate stone carvings, deep textures of ancient earth, sand dunes, and weathered granite'
          ],
          exclusions: [
            'alien spaceships, laser beams, futuristic sci-fi, cartoon, anime, stickman',
            'cheap 3D render, fantasy glowing magic runes'
          ]
        };

      case 'dark_academia':
        return {
          header: 'Create an evocative, atmospheric dark academia illustration featuring grand Victorian Gothic architectural interiors.',
          styleDirectives: [
            'Towering multi-story mahogany bookshelves packed with leather-bound volumes, rolling wooden ladders, and arched leaded windows',
            'Rain beating against misty stained-glass cathedral panes, warm amber glow from vintage green banker lamps and brass sconces',
            'Scholarly artifacts: antique brass globes, vintage astrolabes, spilled inkwells, parchment manuscripts, and deep leather wingback chairs',
            'Rich, moody color palette of deep espresso wood, burgundy velvet, forest green, and polished brass'
          ],
          exclusions: [
            'modern laptops, fluorescent lights, cartoon, stickman, bright sunny cartoon aesthetic',
            'cheap CGI, neon colors'
          ]
        };

      case 'epic_battles':
        return {
          header: 'Create a grand historical battle oil painting in the 19th-century academic master style of Horace Vernet and Jacques-Louis David.',
          styleDirectives: [
            'Panoramic landscape battlefield with ranks of infantry, charging heavy cavalry, and artillery smoke billowing across the valley',
            'Dramatic overcast sky with breaking sunbeams illuminating banners, sabers, and uniform brass',
            'Authentic period military regalia, tactical battlefield formations, and grand historical canvas scale',
            'Dynamic painterly brushwork with rich earth pigments and cinematic military grandeur'
          ],
          exclusions: [
            'modern assault rifles, laser weapons, fantasy monsters, anime, stickman',
            '3D CGI render, cartoony sketches'
          ]
        };

      case 'dark_folklore':
        return {
          header: 'Create a dark, atmospheric folklore concept painting in the style of John Bauer and Frank Frazetta.',
          styleDirectives: [
            'Misty Scandinavian pine forest with towering ancient moss-covered trees, carved pagan runestones, and eerie twilight fog',
            'Flickering bonfire glow illuminating ancient wooden idols and mysterious hooded figures',
            'Muted earth tones: deep lichen green, charcoal stone, peat brown, and glowing ember orange',
            'Intricate storybook illustration texture with ancient mythical reverence'
          ],
          exclusions: [
            'modern technology, cartoon anime sparkles, neon colors, stickman',
            'clean 3D render, high-tech gadgets'
          ]
        };

      case 'liminal_horror':
        return {
          header: 'Create an unsettling, nostalgic liminal space photograph in the aesthetic of 1990s analog VHS camcorder recordings.',
          styleDirectives: [
            'Endless desolate yellow-carpeted hallways with humming fluorescent ceiling lights casting subtle sickly green-yellow cast',
            'Complete eerie absence of human presence, sterile empty office cubicles or deserted late-night transit corridors',
            'Authentic VHS tape grain, subtle chromatic aberration, CRT scanlines, and high-strangeness stillness',
            'Psychological tension built entirely on silence and empty space'
          ],
          exclusions: [
            'gore, bloody monsters, jump-scare faces, fantasy creatures',
            'anime, cartoon, stickman, medieval items, bright outdoor nature'
          ]
        };

      case 'surrealist_thought':
        return {
          header: 'Create a clean, thought-provoking minimalist surrealist painting in the iconic conceptual style of Rene Magritte and Giorgio de Chirico.',
          styleDirectives: [
            'Clean symbolic composition: an isolated wooden door standing free in vast white sand dunes under an infinite pastel twilight sky',
            'Stark geometric architectural shadows, mysterious floating stone spheres, and visual paradoxes',
            'Refined oil-on-canvas texture with impeccable smooth blending and contemplative tranquility',
            'Intellectual thought-experiment aesthetic that invites decoding and reflection'
          ],
          exclusions: [
            'busy visual clutter, gore, chaotic mess, anime, stickman, fantasy dragons',
            'cheap 3D render, digital lens flares'
          ]
        };

      case 'cyberpunk_noir':
        return {
          header: 'Create an atmospheric retro-cyberpunk cityscape in the aesthetic of Blade Runner 1982 and Syd Mead.',
          styleDirectives: [
            'Massive brutalist corporate pyramids piercing stormy perpetual rainclouds with towering holographic advertisements',
            'Wet asphalt reflecting neon cyan, amber, and hot magenta streetlights, dense flying vehicle traffic streaming between high-rises',
            'Industrial retro-tech details: exposed steam conduits, neon noodle bar signage, rain-drenched trench-coated silhouettes',
            'High-contrast techno-noir lighting with deep blacks and rich optical neon glows'
          ],
          exclusions: [
            'bright daytime nature, historical horses, medieval castles, stickman, whimsical anime fantasy',
            'clean sterile white scifi'
          ]
        };

      case 'extreme_survival':
        return {
          header: 'Create a rugged, dramatic National Geographic documentary photograph of an extreme mountain expedition.',
          styleDirectives: [
            'A solitary yellow expedition tent pitched precariously on a frozen mountain ridge amidst a roaring subzero blizzard',
            'Jagged Himalayan ice peaks emerging through swirling windblown snow, harsh frost-covered equipment, and deep cobalt blue crevasse ice',
            'Hyper-realistic documentary camera detail: wind-sculpted snow drifts, ice crystals on gear, dramatic twilight mountain glow',
            'Authentic sense of human resilience against monumental raw wilderness'
          ],
          exclusions: [
            'fantasy monsters, cartoon, anime, stickman, modern tropical beach, indoor studio'
          ]
        };

      case 'studio_ghibli':
      default:
        return {
          header: 'Create a breathtaking Studio Ghibli hand-painted anime illustration in the aesthetic of Hayao Miyazaki and Makoto Shinkai.',
          styleDirectives: [
            'Authentic Studio Ghibli real-world slice-of-life anime aesthetic (Whisper of the Heart, From Up on Poppy Hill, Ocean Waves)',
            'Grounded everyday realism: authentic human characters in casual everyday clothing, and heartfelt emotional resonance',
            'Traditional hand-painted gouache and watercolor textures with rich natural lighting (golden hour sunbeams, soft rainy afternoon overcast, warm incandescent interior lamp light)',
            'Painterly details, gentle atmospheric perspective, masterwork grounded anime cinematography'
          ],
          exclusions: [
            'fairytale, fantasy, magic, floating islands, flying airships, magic dust, glowing particles, wizards, witches, surrealism',
            'stickman, stick figure, crude drawing, bad anatomy, 3D CGI render'
          ]
        };
    }
  }

  static buildPrompt(
    scriptLine: string,
    visualConceptOverride?: string,
    shotType: string = 'WIDE_SCENE',
    environmentDescription?: string,
    niche?: string
  ): string {
    const cleanLine = (scriptLine || '')
      .replace(/["\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const derived = this.deriveSpeechConnectedConcept(cleanLine);
    const concept = (visualConceptOverride || derived.visualConcept || cleanLine || 'dramatic story moment')
      .replace(/["\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const env = (environmentDescription || derived.environmentDescription || 'cinematic atmosphere')
      .replace(/["\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const cleanShot = (shotType || 'WIDE_SCENE')
      .replace(/["\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const art = this.getArtDirection(niche);

    const dynamicExclusions = art.exclusions.map((e) => `- ${e}`).join('\n');
    const dynamicDirectives = art.styleDirectives.map((d) => `- ${d}`).join('\n');

    const narrationBlock = cleanLine
      ? `STORY SCENE CONTEXT:
The visual illustration portrays the narrative event: ${cleanLine}

`
      : '';

    return `${art.header}
ABSOLUTE REQUIREMENT: CLEAN TEXTLESS ARTWORK. Strictly NO text overlay, NO title cards, NO typography, NO words, NO letters, NO numbers, NO subtitles, NO captions, NO signs, and NO watermarks anywhere in this image.

${narrationBlock}VISUAL SCENE DETAILS:
${concept}

SHOT TYPE:
${cleanShot}

ENVIRONMENT & ATMOSPHERE:
${env}

ART DIRECTION & STYLE:
${dynamicDirectives}

STRICT EXCLUSIONS (DO NOT INCLUDE):
${dynamicExclusions}
- text overlay, title overlay, typography, font, words, letters, alphabet, numbers, subtitles, captions, watermarks, signatures, logos, labels, writing, banners

16:9 widescreen landscape, pure visual artwork without any text or overlay.`;
  }
}

function anyMatch(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}
