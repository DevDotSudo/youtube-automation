import { CaptionPresetName, CaptionStyleConfig } from './types';

export const EDGE_NEURAL_VOICES = [
  // Flagship Multilingual Neural (Highest fidelity, ultra-natural human tone)
  { id: 'en-US-AndrewMultilingualNeural', label: 'Andrew (Flagship Multilingual - Natural Warm Storyteller)', gender: 'Male', accent: 'American', tone: 'Narrative Storyteller' },
  { id: 'en-US-AvaMultilingualNeural', label: 'Ava (Flagship Multilingual - Expressive, Warm & Conversational)', gender: 'Female', accent: 'American', tone: 'Expressive & Conversational' },
  { id: 'en-US-BrianMultilingualNeural', label: 'Brian (Flagship Multilingual - Deep, Documentary & Articulate)', gender: 'Male', accent: 'American', tone: 'Deep Documentary' },
  { id: 'en-US-EmmaMultilingualNeural', label: 'Emma (Flagship Multilingual - Gentle, Storybook & Evocative)', gender: 'Female', accent: 'American', tone: 'Gentle Storybook' },
  { id: 'en-US-JennyMultilingualNeural', label: 'Jenny (Flagship Multilingual - Engaging, Crisp & Natural)', gender: 'Female', accent: 'American', tone: 'Engaging & Natural' },

  // English (US) Core
  { id: 'en-US-ChristopherNeural', label: 'Christopher (Deep, Authoritative & Psychology Narrator)', gender: 'Male', accent: 'American', tone: 'Deep & Authoritative' },
  { id: 'en-US-GuyNeural', label: 'Guy (Relaxed & Conversational Storyteller)', gender: 'Male', accent: 'American', tone: 'Conversational Storyteller' },
  { id: 'en-US-AriaNeural', label: 'Aria (Dynamic, Clear & Engaging Narrator)', gender: 'Female', accent: 'American', tone: 'Dynamic & Clear' },
  { id: 'en-US-EricNeural', label: 'Eric (Youthful, Upbeat & Natural Narrator)', gender: 'Male', accent: 'American', tone: 'Youthful & Natural' },
  { id: 'en-US-MichelleNeural', label: 'Michelle (Warm, Professional & Melodic Female)', gender: 'Female', accent: 'American', tone: 'Warm & Professional' },
  { id: 'en-US-RogerNeural', label: 'Roger (Calm, Measured & Thoughtful Male)', gender: 'Male', accent: 'American', tone: 'Calm & Measured' },
  { id: 'en-US-SteffanNeural', label: 'Steffan (Articulate, Steady & Documentary)', gender: 'Male', accent: 'American', tone: 'Documentary Steady' },

  // British / Regional Narrators
  { id: 'en-GB-SoniaNeural', label: 'Sonia (British Female - Warm, Crisp & Articulate)', gender: 'Female', accent: 'British', tone: 'Crisp & Articulate' },
  { id: 'en-GB-RyanNeural', label: 'Ryan (British Male - Engaging & Cinematic Narrator)', gender: 'Male', accent: 'British', tone: 'Cinematic Narrator' },
  { id: 'en-GB-ThomasNeural', label: 'Thomas (British Male - Warm & Authoritative Storyteller)', gender: 'Male', accent: 'British', tone: 'Warm & Authoritative' },
  { id: 'en-AU-WilliamNeural', label: 'William (Australian Male - Natural, Warm & Easygoing)', gender: 'Male', accent: 'Australian', tone: 'Natural & Warm' },
  { id: 'en-CA-LiamNeural', label: 'Liam (Canadian Male - Smooth, Friendly & Clear)', gender: 'Male', accent: 'Canadian', tone: 'Smooth & Friendly' }
];

export const KOKORO_VOICES: typeof EDGE_NEURAL_VOICES = [];

export const AVAILABLE_VOICES = EDGE_NEURAL_VOICES;

export const ONLINE_BGM_TRACKS = [
  // 1. Ghibli & Peaceful Acoustic
  {
    id: 'clear-waters',
    name: 'Clear Waters (Acoustic Guitar & Gentle Breeze)',
    category: 'Ghibli Acoustic',
    description: 'Peaceful acoustic guitar and warm natural resonance reminiscent of Joe Hisaishi seaside themes. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Clear%20Waters.mp3'
  },
  {
    id: 'deliberate-thought',
    name: 'Deliberate Thought (Mindful Acoustic Strings)',
    category: 'Ghibli Acoustic',
    description: 'Gentle acoustic progression for thoughtful contemplation and heartfelt narrative insight. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Deliberate%20Thought.mp3'
  },
  {
    id: 'carefree',
    name: 'Carefree (Sunny Day & Lighthearted Whimsy)',
    category: 'Ghibli Acoustic',
    description: 'Bright fingerpicked acoustic guitar and buoyant rhythm for cheerful country journeys. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3'
  },
  {
    id: 'fresh-air',
    name: 'Fresh Air (Breezy Meadow Acoustic)',
    category: 'Ghibli Acoustic',
    description: 'Warm, uplifting folk acoustic guitar capturing open pastures and gentle wind. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Fresh%20Air.mp3'
  },
  {
    id: 'sweet-promise',
    name: 'Sweet Promise (Tender Pastoral Fingerstyle)',
    category: 'Ghibli Acoustic',
    description: 'Gentle and intimate pastoral acoustic guitar evoking nostalgic rural memories. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sweet%20Promise.mp3'
  },

  // 2. Nostalgic Classical & Poignant Piano
  {
    id: 'gymnopedie-no-1',
    name: 'Gymnopédie No. 1 (Erik Satie - Nostalgic Piano)',
    category: 'Nostalgic Piano',
    description: 'Iconic poignant piano masterpiece. Melancholy, vulnerable, and deeply reflective. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%201.mp3'
  },
  {
    id: 'gymnopedie-no-2',
    name: 'Gymnopédie No. 2 (Gentle Melancholy Piano)',
    category: 'Nostalgic Piano',
    description: 'Soft and wistful French classical piano with profound stillness and poignancy. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%202.mp3'
  },
  {
    id: 'heartbreaking',
    name: 'Heartbreaking (Poignant Cello & Acoustic Piano)',
    category: 'Nostalgic Piano',
    description: 'Poignant acoustic cello and piano capturing bittersweet departures and tender nostalgia. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Heartbreaking.mp3'
  },
  {
    id: 'water-lily',
    name: 'Water Lily (Gentle Poetic Piano Reflection)',
    category: 'Nostalgic Piano',
    description: 'Atmospheric piano arpeggios flowing like ripples across a quiet pond. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Water%20Lily.mp3'
  },
  {
    id: 'sad-trio',
    name: 'Sad Trio (Melancholic Chamber Strings & Piano)',
    category: 'Nostalgic Piano',
    description: 'Heartrending strings and piano trio reflecting on unspoken goodbyes and memories. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sad%20Trio.mp3'
  },

  // 3. Emotional Orchestral & Uplifting
  {
    id: 'touching-moments',
    name: 'Touching Moments (Warm Strings & Uplifting Swell)',
    category: 'Emotional Orchestral',
    description: 'Warm harmonic orchestral swell for wonder, heart-touching memories, and personal journeys. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Touching%20Moments%20Two%20-%20Higher.mp3'
  },
  {
    id: 'morning-stroll',
    name: 'Morning Stroll (Bright Dawn Orchestral)',
    category: 'Emotional Orchestral',
    description: 'Gentle woodwinds and strings evoking early morning sunlight and new beginnings. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Morning%20Stroll.mp3'
  },
  {
    id: 'heartwarming',
    name: 'Heartwarming (Uplifting Cinematic Swell)',
    category: 'Emotional Orchestral',
    description: 'Inspirational melodic swell that leaves a lasting emotional impression. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Heartwarming.mp3'
  },
  {
    id: 'windswept',
    name: 'Windswept (Dramatic Cinematic Strings)',
    category: 'Emotional Orchestral',
    description: 'Expansive orchestral strings soaring over grand mountain ranges and rolling hills. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Windswept.mp3'
  },

  // 4. Deep Nature & Ambient Atmosphere
  {
    id: 'meditation-impromptu',
    name: 'Meditation Impromptu (Deep Nature Introspection)',
    category: 'Nature Ambience',
    description: 'Soft harmonic chords and ambient resonance echoing quiet ancient forests. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Meditation%20Impromptu%2001.mp3'
  },
  {
    id: 'deep-haze',
    name: 'Deep Haze (Ambient Twilight Atmosphere)',
    category: 'Nature Ambience',
    description: 'Low-profile harmonic atmosphere for smooth storytelling flow. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Deep%20Haze.mp3'
  },
  {
    id: 'long-road-ahead',
    name: 'Long Road Ahead (Atmospheric Journey Chords)',
    category: 'Nature Ambience',
    description: 'Deep cinematic resonance for reflective travel, distance, and solitary paths. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Long%20Road%20Ahead.mp3'
  },

  // 5. Cinematic Mystery & Curiosity
  {
    id: 'past-the-edge',
    name: 'Past the Edge (Ethereal Cinematic Mystery)',
    category: 'Cinematic Mystery',
    description: 'Ethereal cinematic mystery pad for magical discoveries, hidden worlds, and starry skies. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Past%20the%20Edge.mp3'
  },
  {
    id: 'sneaky-snitch',
    name: 'Sneaky Snitch (Playful Whimsical Curiosity)',
    category: 'Whimsical',
    description: 'Playful pizzicato strings and marimba for curious forest spirits and mischievous moments. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sneaky%20Snitch.mp3'
  },
  {
    id: 'hidden-past',
    name: 'Hidden Past (Subtle Intrigue & Secrets)',
    category: 'Cinematic Mystery',
    description: 'Low-register acoustic intrigue capturing ancient forgotten secrets and puzzles. Public Domain / CC-BY.',
    streamUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hidden%20Past.mp3'
  }
];

export const COLOR_FILTER_PRESETS = [
  { id: 'none', label: 'Clean / Original Colors', ffmpeg: '', css: 'none' },
  { id: 'ghibli_warm', label: 'Ghibli Nostalgic Warmth', ffmpeg: 'colorbalance=rs=0.06:gs=0.03:bs=-0.04,curves=vintage', css: 'sepia(0.15) contrast(1.06) saturate(1.15)' },
  { id: 'anime_vibrant', label: 'Makoto Shinkai Vibrant Anime', ffmpeg: 'eq=contrast=1.12:brightness=0.02:saturation=1.32', css: 'contrast(1.12) saturate(1.32) brightness(1.02)' },
  { id: 'golden_hour', label: 'Warm Sunset & Golden Hour', ffmpeg: 'colorbalance=rs=0.14:gs=0.04:bs=-0.08:rm=0.08:gm=0.02:bm=-0.05,eq=saturation=1.2', css: 'sepia(0.25) saturate(1.2) contrast(1.08) hue-rotate(-10deg)' },
  { id: 'teal_orange', label: 'Cinematic Hollywood Teal & Orange', ffmpeg: 'colorbalance=rs=0.08:gs=-0.02:bs=-0.08:rh=-0.04:gh=0.04:bh=0.08,eq=contrast=1.12', css: 'contrast(1.12) saturate(1.15) hue-rotate(-5deg)' },
  { id: 'moody_rain', label: 'Melancholy Blue Hour', ffmpeg: 'colorbalance=rs=-0.08:gs=0.0:bs=0.12:rm=-0.04:bm=0.08,eq=contrast=1.06:saturation=0.92', css: 'hue-rotate(190deg) saturate(0.85) contrast(1.06)' },
  { id: 'vintage_35mm', label: '35mm Vintage Film', ffmpeg: 'colorbalance=rs=0.08:gs=0.0:bs=-0.08,curves=vintage,eq=contrast=1.05:saturation=0.9', css: 'sepia(0.2) contrast(1.05) saturate(0.95)' },
  { id: 'noir', label: 'Monochrome Noir', ffmpeg: 'hue=s=0,eq=contrast=1.28:brightness=-0.02', css: 'grayscale(1) contrast(1.28) brightness(0.98)' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon Glow', ffmpeg: 'eq=contrast=1.22:saturation=1.4,colorbalance=rs=0.08:gs=-0.04:bs=0.12', css: 'contrast(1.22) saturate(1.4) hue-rotate(15deg)' },
  { id: 'crisp', label: 'Ultra Crisp Anime Focus', ffmpeg: 'unsharp=5:5:0.8:5:5:0.0,eq=contrast=1.06:saturation=1.08', css: 'contrast(1.06) saturate(1.08)' }
];

export const AVAILABLE_FONTS = [
  'Merriweather',
  'Playfair Display',
  'Cinzel',
  'Inter',
  'Outfit',
  'Poppins',
  'Montserrat',
  'Anton',
  'Bebas Neue',
  'Righteous',
  'Caveat',
  'Fredoka',
  'Permanent Marker',
  'Syne',
  'Georgia',
  'Arial'
];

export const DEFAULT_HIGHLIGHT_WORDS = [
  'journey', 'wonder', 'memory', 'whisper', 'distance', 'solitude', 'destiny',
  'hope', 'secret', 'silence', 'heart', 'promise', 'freedom', 'light', 'dream',
  'path', 'sky', 'stars', 'wind', 'remember', 'forever', 'moment', 'truth'
];

export const CAPTION_PRESETS: Record<CaptionPresetName, CaptionStyleConfig> = {
  GHIBLI_STORYBOOK: {
    preset: 'GHIBLI_STORYBOOK',
    fontFamily: 'Merriweather',
    fontSize: 48,
    primaryColor: '#FDFBF7',
    highlightColor: '#F59E0B',
    outlineColor: '#1A1815',
    outlineWidth: 2.5,
    hasBackgroundBox: false,
    boxColor: '#000000',
    boxOpacity: 0.5,
    allCaps: false,
    position: 'BOTTOM',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  },
  PSYCH2GO_MINIMAL: {
    preset: 'PSYCH2GO_MINIMAL',
    fontFamily: 'Inter',
    fontSize: 50,
    primaryColor: '#FFFFFF',
    highlightColor: '#C81A1A',
    outlineColor: '#141414',
    outlineWidth: 3.5,
    hasBackgroundBox: false,
    boxColor: '#000000',
    boxOpacity: 0.6,
    allCaps: false,
    position: 'BOTTOM',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  },
  CINEMATIC_BAR: {
    preset: 'CINEMATIC_BAR',
    fontFamily: 'Playfair Display',
    fontSize: 46,
    primaryColor: '#FDFBF7',
    highlightColor: '#F59E0B',
    outlineColor: '#000000',
    outlineWidth: 1.0,
    hasBackgroundBox: true,
    boxColor: '#000000',
    boxOpacity: 0.70,
    allCaps: false,
    position: 'BOTTOM',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  },
  CINEMATIC_LETTERBOX: {
    preset: 'CINEMATIC_LETTERBOX',
    fontFamily: 'Cinzel',
    fontSize: 44,
    primaryColor: '#FFFDF5',
    highlightColor: '#FFD700',
    outlineColor: '#000000',
    outlineWidth: 2.0,
    hasBackgroundBox: true,
    boxColor: '#0A0A0A',
    boxOpacity: 0.85,
    allCaps: true,
    position: 'BOTTOM',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  },
  MINIMALIST_LUXURY: {
    preset: 'MINIMALIST_LUXURY',
    fontFamily: 'Outfit',
    fontSize: 48,
    primaryColor: '#F8F9FA',
    highlightColor: '#00F5D4',
    outlineColor: '#111318',
    outlineWidth: 2.0,
    hasBackgroundBox: true,
    boxColor: '#161922',
    boxOpacity: 0.75,
    allCaps: false,
    position: 'BOTTOM',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  },
  NEON_CYBER: {
    preset: 'NEON_CYBER',
    fontFamily: 'Righteous',
    fontSize: 52,
    primaryColor: '#FFFFFF',
    highlightColor: '#FF2A85',
    outlineColor: '#05050A',
    outlineWidth: 4.0,
    hasBackgroundBox: true,
    boxColor: '#0D0818',
    boxOpacity: 0.80,
    allCaps: false,
    position: 'MIDDLE_LOWER',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  },
  RETRO_TYPEWRITER: {
    preset: 'RETRO_TYPEWRITER',
    fontFamily: 'Caveat',
    fontSize: 54,
    primaryColor: '#FFF2C6',
    highlightColor: '#FF9E00',
    outlineColor: '#2B1700',
    outlineWidth: 2.0,
    hasBackgroundBox: false,
    boxColor: '#000000',
    boxOpacity: 0.5,
    allCaps: false,
    position: 'BOTTOM',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  },
  BOLD_CLEAN: {
    preset: 'BOLD_CLEAN',
    fontFamily: 'Inter',
    fontSize: 52,
    primaryColor: '#FFFFFF',
    highlightColor: '#FF5757',
    outlineColor: '#000000',
    outlineWidth: 4.0,
    hasBackgroundBox: false,
    boxColor: '#000000',
    boxOpacity: 0.5,
    allCaps: true,
    position: 'BOTTOM',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  },
  HORMOZI_POP: {
    preset: 'HORMOZI_POP',
    fontFamily: 'Montserrat',
    fontSize: 64,
    primaryColor: '#FFFFFF',
    highlightColor: '#22C55E',
    outlineColor: '#000000',
    outlineWidth: 4.5,
    hasBackgroundBox: true,
    boxColor: '#000000',
    boxOpacity: 0.85,
    allCaps: true,
    position: 'MIDDLE_LOWER',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  },
  MRBEAST_BOUNCE: {
    preset: 'MRBEAST_BOUNCE',
    fontFamily: 'Anton',
    fontSize: 66,
    primaryColor: '#FFE600',
    highlightColor: '#00E5FF',
    outlineColor: '#000000',
    outlineWidth: 5.5,
    hasBackgroundBox: false,
    boxColor: '#000000',
    boxOpacity: 0.5,
    allCaps: true,
    position: 'MIDDLE_LOWER',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  },
  CUSTOM: {
    preset: 'CUSTOM',
    fontFamily: 'Merriweather',
    fontSize: 48,
    primaryColor: '#FDFBF7',
    highlightColor: '#F59E0B',
    outlineColor: '#1A1815',
    outlineWidth: 2.5,
    hasBackgroundBox: false,
    boxColor: '#000000',
    boxOpacity: 0.5,
    allCaps: false,
    position: 'BOTTOM',
    highlightWords: [...DEFAULT_HIGHLIGHT_WORDS]
  }
};

export const MOTION_OPTIONS = [
  { id: 'STATIC', label: 'Contemplative Static Hold' },
  { id: 'PAN_LEFT', label: 'Slow Pan Left (Landscape Drift)' },
  { id: 'PAN_RIGHT', label: 'Slow Pan Right (Landscape Drift)' },
  { id: 'PUSH_IN', label: 'Gentle Push In (100% -> 103%)' },
  { id: 'ZOOM_IN', label: 'Slow Cinematic Zoom In (100% -> 105%)' },
  { id: 'ZOOM_OUT', label: 'Slow Zoom Out (105% -> 100%)' },
  { id: 'PUNCH_IN', label: 'Punch In (Emphasis Snap Zoom)' }
];

export const TRANSITION_OPTIONS = [
  { id: 'DISSOLVE', label: 'Gentle Cross-Dissolve (0.3s - Ghibli Default)' },
  { id: 'CUT', label: 'Instant Cut' },
  { id: 'FADE', label: 'Dip to Black (0.3s)' },
  { id: 'FADE_WHITE', label: 'Flash to White (0.25s)' },
  { id: 'WIPE_LEFT', label: 'Cinematic Wipe Left' },
  { id: 'WIPE_RIGHT', label: 'Cinematic Wipe Right' },
  { id: 'CIRCLE_CROP', label: 'Vintage Iris Circle' },
  { id: 'SMOOTH_LEFT', label: 'Smooth Slide Left' },
  { id: 'SMOOTH_RIGHT', label: 'Smooth Slide Right' }
];


export interface VideoEffectPreset {
  id: string;
  name: string;
  category: 'Cinematic' | 'Atmosphere & Light' | 'Retro & Glitch' | 'Optics & Action';
  description: string;
  ffmpegFilter: string;
  cssFilter: string;
  cssOverlay?: string;
}

export const VIDEO_EFFECT_PRESETS: VideoEffectPreset[] = [
  {
    id: 'none',
    name: 'None (Pure Image)',
    category: 'Cinematic',
    description: 'No additional overlay effects applied.',
    ffmpegFilter: '',
    cssFilter: 'none'
  },
  {
    id: 'film_grain_35mm',
    name: '35mm Film Grain',
    category: 'Cinematic',
    description: 'Authentic photochemical 35mm celluloid grain texture. Procedural & zero-download.',
    ffmpegFilter: 'noise=c0s=16:c0f=t+u,eq=contrast=1.04',
    cssFilter: 'contrast(1.04)',
    cssOverlay: 'radial-gradient(circle, transparent 70%, rgba(0,0,0,0.3) 100%)'
  },
  {
    id: 'cinematic_vignette',
    name: 'Cinematic Vignette',
    category: 'Cinematic',
    description: 'Moody edge darkening focusing viewers on central character and action.',
    ffmpegFilter: 'vignette=PI/4',
    cssFilter: 'none',
    cssOverlay: 'radial-gradient(circle, transparent 55%, rgba(0,0,0,0.65) 100%)'
  },
  {
    id: 'anamorphic_letterbox',
    name: '2.35:1 Anamorphic Letterbox',
    category: 'Cinematic',
    description: 'Hollywood widescreen cinematic matte bars top and bottom.',
    ffmpegFilter: 'drawbox=x=0:y=0:w=iw:h=ih*0.10:color=black:t=fill,drawbox=x=0:y=ih*0.90:w=iw:h=ih*0.10:color=black:t=fill',
    cssFilter: 'none'
  },
  {
    id: 'dreamy_bloom',
    name: 'Ghibli Dreamy Bloom',
    category: 'Cinematic',
    description: 'Soft ethereal highlight diffusion and fairytale glow.',
    ffmpegFilter: 'unsharp=5:5:0.5,eq=brightness=0.03:saturation=1.12',
    cssFilter: 'brightness(1.05) saturate(1.12) drop-shadow(0 0 12px rgba(255,255,255,0.2))'
  },
  {
    id: 'warm_light_leak',
    name: 'Sunset Light Leak',
    category: 'Atmosphere & Light',
    description: 'Warm solar flare leaking from the top-left corner.',
    ffmpegFilter: 'colorbalance=rs=0.10:gs=0.04:bs=-0.06,eq=brightness=0.04',
    cssFilter: 'sepia(0.12) brightness(1.06)',
    cssOverlay: 'linear-gradient(135deg, rgba(255,180,60,0.25) 0%, transparent 55%)'
  },
  {
    id: 'bokeh_particles',
    name: 'Sunlit Bokeh Fireflies',
    category: 'Atmosphere & Light',
    description: 'Warm floating light orbs and fairy motes drifting across the shot.',
    ffmpegFilter: 'eq=brightness=0.02:saturation=1.1',
    cssFilter: 'brightness(1.02) saturate(1.1)',
    cssOverlay: 'radial-gradient(ellipse at 30% 40%, rgba(255,220,120,0.2) 0%, transparent 40%), radial-gradient(ellipse at 75% 65%, rgba(255,200,80,0.15) 0%, transparent 35%)'
  },
  {
    id: 'golden_embers',
    name: 'Cinematic Embers',
    category: 'Atmosphere & Light',
    description: 'Warm rising sparks and ember glow for dramatic narrative climaxes.',
    ffmpegFilter: 'colorbalance=rs=0.12:gs=0.02:bs=-0.08,eq=contrast=1.08',
    cssFilter: 'contrast(1.08) sepia(0.15)',
    cssOverlay: 'linear-gradient(0deg, rgba(255,100,20,0.2) 0%, transparent 60%)'
  },
  {
    id: 'atmospheric_fog',
    name: 'Atmospheric Mist & Fog',
    category: 'Atmosphere & Light',
    description: 'Moody low-contrast mystery mist diffusing deep backgrounds.',
    ffmpegFilter: 'colorbalance=rs=-0.04:bs=0.06,eq=contrast=0.94:brightness=0.05',
    cssFilter: 'contrast(0.94) brightness(1.05)',
    cssOverlay: 'linear-gradient(180deg, transparent 40%, rgba(200,215,235,0.18) 100%)'
  },
  {
    id: 'vhs_retro',
    name: '90s Retro VHS Tape',
    category: 'Retro & Glitch',
    description: 'Horizontal CRT scanlines, subtle color jitter, and nostalgic analog warmth.',
    ffmpegFilter: 'drawgrid=w=iw:h=4:t=1:c=black@0.15,noise=c0s=12:c0f=t+u,eq=saturation=1.2:contrast=1.1',
    cssFilter: 'contrast(1.1) saturate(1.2)',
    cssOverlay: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 2px, transparent 4px)'
  },
  {
    id: 'chromatic_split',
    name: 'RGB Chromatic Aberration',
    category: 'Retro & Glitch',
    description: 'Prismatic color channel fringing on edges simulating vintage anamorphic lenses.',
    ffmpegFilter: 'colorbalance=rs=0.08:bs=0.08,eq=contrast=1.12',
    cssFilter: 'contrast(1.12) drop-shadow(-2px 0 rgba(255,0,0,0.4)) drop-shadow(2px 0 rgba(0,240,255,0.4))'
  },
  {
    id: 'silent_1920s',
    name: '1920s Silent Movie',
    category: 'Retro & Glitch',
    description: 'Projector shutter flicker, high contrast black & white with sepia tint and grain.',
    ffmpegFilter: 'hue=s=0.2,colorbalance=rs=0.16:gs=0.06:bs=-0.12,noise=alls=22:allf=t+u,eq=contrast=1.35',
    cssFilter: 'grayscale(0.85) sepia(0.3) contrast(1.35)'
  },
  {
    id: 'cyber_matrix',
    name: 'Cyberpunk Glitch',
    category: 'Retro & Glitch',
    description: 'High-tech neon edge sharpness and synthetic digital contrast.',
    ffmpegFilter: 'unsharp=7:7:1.5,eq=contrast=1.25:saturation=1.4,colorbalance=rs=0.08:gs=-0.04:bs=0.12',
    cssFilter: 'contrast(1.25) saturate(1.4) hue-rotate(10deg)'
  },
  {
    id: 'camera_shake',
    name: 'Handheld Camera Shake',
    category: 'Optics & Action',
    description: 'Subtle organic human handheld camera operator tremor for cinematic realism.',
    ffmpegFilter: "crop=w=iw*0.96:h=ih*0.96:x='iw*0.02+iw*0.015*sin(t*4)':y='ih*0.02+ih*0.015*cos(t*3)',scale=1920:1080",
    cssFilter: 'none'
  },
  {
    id: 'flash_impact',
    name: 'White Flash Snap',
    category: 'Optics & Action',
    description: 'High-energy 0.25s white strobe punch on shot entry.',
    ffmpegFilter: 'fade=t=in:st=0:d=0.25:color=white',
    cssFilter: 'brightness(1.08)'
  },
  {
    id: 'tilt_shift',
    name: 'Miniature Tilt-Shift',
    category: 'Optics & Action',
    description: 'Selective optical focal plane blur top & bottom creating miniature world illusion.',
    ffmpegFilter: 'eq=contrast=1.14:saturation=1.28',
    cssFilter: 'contrast(1.14) saturate(1.28)',
    cssOverlay: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.3) 100%)'
  }
];
