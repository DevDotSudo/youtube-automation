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
  static deriveSpeechConnectedConcept(scriptLine: string, niche?: string): { visualConcept: string; environmentDescription: string } {
    const clean = (scriptLine || '')
      .replace(/["\n\r]/g, ' ')
      .replace(/[$€£]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      if (niche === 'stickman_doodle') {
        return {
          visualConcept: 'A humorous minimalist stick figure character standing with hands on hips in an expressive stance. Wordless character visual.',
          environmentDescription: 'Clean solid white background, bold black ink lines, zero background clutter, pure white space.'
        };
      }
      return {
        visualConcept: 'A picturesque cinematic landscape with dramatic natural lighting and rich atmosphere.',
        environmentDescription: 'Atmospheric natural environment with cinematic lighting and serene depth.'
      };
    }

    const lower = clean.toLowerCase();

    // 1. Stickman Doodle Niche Specific Derivations
    if (niche === 'stickman_doodle') {
      // Money / Purchases / Rent / Bills / Expensive / Broke
      if (anyMatch(lower, ['money', 'wallet', 'purchase', 'purchases', 'rent', 'bill', 'bills', 'dollar', 'dollars', 'pay', 'paid', 'paycheck', 'spend', 'spent', 'cost', 'expensive', 'broke', 'gone', 'account', 'disappear'])) {
        return {
          visualConcept: 'A humorous minimalist stick figure character looking down in bewilderment at an open empty wallet, with empty pants pockets turned inside out. Wordless character visual.',
          environmentDescription: 'Clean solid white background, bold black ink lines, zero background clutter, pure white space.'
        };
      }
      // Buckets / Divide / Split / System / Save / Rule / Budget
      if (anyMatch(lower, ['bucket', 'buckets', 'divide', 'split', 'three', 'system', 'save', 'savings', 'rule', 'percent', 'percentage', 'budget', 'manage', 'plan'])) {
        return {
          visualConcept: 'A minimalist stick figure character standing thoughtfully with arms crossed between three simple blank hand-drawn buckets. Wordless character visual.',
          environmentDescription: 'Clean solid white background, bold black marker lines, pure white space.'
        };
      }
      // Coffee / Food / Dining / Lunch / Dinner / Restaurant
      if (anyMatch(lower, ['coffee', 'tea', 'cup', 'mug', 'food', 'lunch', 'dinner', 'snack', 'drink', 'eat'])) {
        return {
          visualConcept: 'A minimalist stick figure character sitting at a tiny hand-drawn desk, holding a steaming coffee mug with tiny steam swirls. Wordless character visual.',
          environmentDescription: 'Clean solid white background, bold black ink lines, pure white space.'
        };
      }
      // Technology / Laptop / Computer / Phone / Subscriptions / App
      if (anyMatch(lower, ['subscription', 'subscriptions', 'laptop', 'computer', 'screen', 'phone', 'device', 'app', 'online', 'service'])) {
        return {
          visualConcept: 'A minimalist stick figure character seated in front of a laptop computer with an expressive surprised expression. Wordless character visual.',
          environmentDescription: 'Clean solid white background, bold black ink lines, pure white space.'
        };
      }
      // Confusion / Question / Why / Problem / Shock / Doubt
      if (anyMatch(lower, ['why', 'how', 'wonder', 'confused', 'mystery', 'problem', 'shock', 'question', 'doubt'])) {
        return {
          visualConcept: 'A curious minimalist stick figure character scratching its head with a comical bewildered expression, a single simple question mark drawn beside it. Wordless character visual.',
          environmentDescription: 'Clean solid white background, bold black ink lines, pure white space.'
        };
      }
      // Growth / Rich / Success / Victory / Happy / Future
      if (anyMatch(lower, ['rich', 'wealth', 'success', 'grow', 'growth', 'win', 'future', 'invest', 'goal', 'happy', 'freedom'])) {
        return {
          visualConcept: 'An energetic minimalist stick figure character jumping happily with arms raised high in triumph. Wordless character visual.',
          environmentDescription: 'Clean solid white background, bold black marker lines, pure white space.'
        };
      }
      // Work / Job / Office / Busy / Tired
      if (anyMatch(lower, ['work', 'job', 'office', 'boss', 'tired', 'grind', 'busy', 'desk', 'hours'])) {
        return {
          visualConcept: 'A tired minimalist stick figure character sitting at an uncluttered hand-drawn office desk resting chin in hand. Wordless character visual.',
          environmentDescription: 'Clean solid white background, bold black ink lines, pure white space.'
        };
      }
      // Default Stickman
      return {
        visualConcept: 'An expressive minimalist stick figure character with dynamic gestures portraying the scene mood through physical action. Pure wordless visual character action.',
        environmentDescription: 'Clean solid white background, bold black ink lines, zero background clutter, pure white space.'
      };
    }

    // 2. Stoic Philosophy Niche Specific Derivations
    if (niche === 'stoic_philosophy') {
      if (anyMatch(lower, ['time', 'death', 'memento', 'mori', 'hour', 'life', 'fleeting', 'pass', 'years', 'clock'])) {
        return {
          visualConcept: 'An antique brass hourglass with golden sand trickling through, resting beside a flickering wax candle and a weathered stone carving in deep chiaroscuro.',
          environmentDescription: 'Contemplative ancient stone alcove, warm flickering candlelight, deep dramatic shadows.'
        };
      }
      if (anyMatch(lower, ['obstacle', 'adversity', 'storm', 'struggle', 'strength', 'hardship', 'endure', 'control', 'power'])) {
        return {
          visualConcept: 'A solitary classical figure in draped robes standing resolute upon a rugged coastal cliff against breaking waves and breaking sunbeams.',
          environmentDescription: 'Monumental ancient coastal cliffs, dramatic storm clouds, golden breaking sunbeams.'
        };
      }
      return {
        visualConcept: 'A weathered classical Roman marble bust in dramatic chiaroscuro lighting, an ancient parchment scroll resting nearby on aged dark stone.',
        environmentDescription: 'Solemn ancient stone hall, warm candlelight casting deep shadows across classical architecture.'
      };
    }

    // 3. Cyberpunk Noir Niche Specific Derivations
    if (niche === 'cyberpunk_noir') {
      return {
        visualConcept: 'A solitary trench-coated silhouette standing on a rain-slicked high-rise balcony looking out across a towering neon-lit metropolis.',
        environmentDescription: 'Atmospheric perpetual rain, reflections of cyan and magenta neon glows on wet asphalt, distant flying vehicles.'
      };
    }

    // 4. Studio Ghibli or Storytelling Niches
    if (anyMatch(lower, ['café', 'cafe', 'coffee', 'tea', 'bistro', 'diner'])) {
      return {
        visualConcept: 'Inside a quiet retro café with polished wooden tables in warm amber lighting, a single steaming ceramic cup of coffee sitting waiting on a wooden table.',
        environmentDescription: 'Cozy vintage café interior with dark wood furniture, warm pendant lamps, gentle steam, and quiet peaceful atmosphere.'
      };
    }
    if (anyMatch(lower, ['train', 'station', 'journey', 'travel', 'sea', 'ocean', 'waves', 'shore'])) {
      return {
        visualConcept: 'A scenic vintage coastal train car rolling past glistening emerald ocean waves under gigantic sunlit cumulus clouds.',
        environmentDescription: 'Rustic vintage train car with polished wood and brass fixtures reflecting warm coastal sunlight.'
      };
    }
    if (anyMatch(lower, ['forest', 'tree', 'nature', 'moss', 'woods', 'shrine', 'ancient'])) {
      return {
        visualConcept: 'An ancient moss-covered stone shrine nestled deep within a primeval emerald forest, with filtered golden sunbeams streaming through canopy leaves.',
        environmentDescription: 'Enchanted woodland sanctuary with lush velvet moss, giant gnarled tree roots, and blooming wild bellflowers.'
      };
    }

    // Universal Fallback (Grounded, niche-appropriate, strictly wordless)
    if (niche === 'studio_ghibli') {
      return {
        visualConcept: 'A heartfelt hand-painted slice-of-life anime scene illustrating the characters and setting with authentic watercolor warmth and gentle atmospheric lighting.',
        environmentDescription: 'Lush hand-painted anime background with authentic watercolor textures, cinematic natural lighting.'
      };
    }

    return {
      visualConcept: 'A cinematic, highly atmospheric visual scene capturing the subject and environment in evocative detail, completely wordless.',
      environmentDescription: 'Atmospheric scene setting with natural lighting, deep textural details, and cinematic composition.'
    };
  }

  static generateVisualConcept(scriptLine: string, niche?: string): string {
    return this.deriveSpeechConnectedConcept(scriptLine, niche).visualConcept;
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
          header: 'Create a clean, expressive minimalist hand-drawn stickman illustration in modern animated webcomic character art style (Casually Explained and MinutePhysics visual character aesthetic).',
          styleDirectives: [
            'Minimalist black ink line art on a clean white or dark chalkboard background',
            'Expressive, witty stick figure characters with dynamic gestures and clear emotions',
            'Simple hand-drawn props and subtle color accents (yellow, red, or cyan) to highlight key story elements',
            'Pure wordless visual character storytelling with high clarity, silent visual comedy and physical actions',
            'Clear bold lines with hand-drawn marker texture, zero clutter, zero annotations'
          ],
          exclusions: [
            'photorealism, 3D CGI render, realistic human skin, complex photographic textures',
            'detailed realistic face, eyes, hyper-detailed musculature',
            'fairytale magic dust, glowing sparkles, blurry mess',
            'speech bubbles, thought bubbles, dialogue boxes, callout arrows, annotated arrows, labels, charts, diagrams, infographics, word clouds, mock text, writing, signs, banners'
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
            'Massive brutalist corporate pyramids piercing stormy perpetual rainclouds with towering geometric holographic light forms',
            'Wet asphalt reflecting neon cyan, amber, and hot magenta streetlights, dense flying vehicle traffic streaming between high-rises',
            'Industrial retro-tech details: exposed steam conduits, glowing neon architecture, rain-drenched trench-coated silhouettes',
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
