export interface VisualNicheOption {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  badge?: string;
  samplePromptKeywords: string[];
}

export interface AlignedWord {
  word: string;
  startMs: number;
  endMs: number;
  prob?: number;
}

export type CaptionPresetName =
  | 'GHIBLI_STORYBOOK'
  | 'PSYCH2GO_MINIMAL'
  | 'HORMOZI_POP'
  | 'MRBEAST_BOUNCE'
  | 'CINEMATIC_BAR'
  | 'CINEMATIC_LETTERBOX'
  | 'MINIMALIST_LUXURY'
  | 'NEON_CYBER'
  | 'RETRO_TYPEWRITER'
  | 'BOLD_CLEAN'
  | 'CUSTOM';

export interface CaptionStyleConfig {
  preset: CaptionPresetName;
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  highlightColor: string;
  outlineColor: string;
  outlineWidth: number;
  hasBackgroundBox: boolean;
  boxColor: string;
  boxOpacity: number;
  allCaps: boolean;
  position: 'BOTTOM' | 'MIDDLE_LOWER' | 'CENTER';
  highlightWords: string[];
}

export interface VisualBeat {
  id: string;
  sceneId: string;
  projectId: string;
  beatIndex: number;

  startOffsetMs: number;
  endOffsetMs: number;
  durationMs: number;

  shotType: VisualShotType;

  visualConcept: string;
  environmentDescription: string;

  imagePrompt: string;
  imagePath?: string;

  generationStatus: 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';

  motion: 'STATIC' | 'PUSH_IN' | 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN_LEFT' | 'PAN_RIGHT' | 'PUNCH_IN';

  transition: 'CUT' | 'DISSOLVE' | 'FADE' | 'FADE_WHITE' | 'WIPE_LEFT' | 'WIPE_RIGHT' | 'CIRCLE_CROP' | 'SMOOTH_LEFT' | 'SMOOTH_RIGHT';

  transitionDurationMs: number;

  keyword?: string;
  keywordEnabled: boolean;

  videoEffect?: string;

  inAnimation?: 'NONE' | 'FADE_IN' | 'ZOOM_IN' | 'ZOOM_OUT' | 'SLIDE_LEFT' | 'SLIDE_RIGHT' | 'SLIDE_UP' | 'SLIDE_DOWN' | 'WIPE_IN' | 'FLASH_WHITE' | 'POP_IN';
  outAnimation?: 'NONE' | 'FADE_OUT' | 'ZOOM_OUT' | 'ZOOM_IN' | 'SLIDE_LEFT' | 'SLIDE_RIGHT' | 'SLIDE_DOWN' | 'WIPE_OUT' | 'FLASH_WHITE' | 'DIP_BLACK';
  inAnimationDurationMs?: number;
  outAnimationDurationMs?: number;

  scriptText?: string;
  isCustomPrompt?: boolean;

  createdAt?: string;
  updatedAt?: string;
}

export * from './enums';
import { ProjectStatus, AssetStatus, ApprovalStatus, MotionType, TransitionType, VisualShotType } from './enums';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  projectPath: string;
  scriptPath?: string;
  durationMs: number;
  sceneCount: number;
  voiceId?: string;
  musicPath?: string;
  captionStyle?: CaptionStyleConfig;
  defaultVideoEffect?: string;
  thumbnailPath?: string;
  visualNiche?: string;
  characterLock?: string;
  platform?: 'YOUTUBE' | 'FACEBOOK';
  aspectRatio?: '16:9' | '9:16';
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  projectId: string;
  sceneIndex: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  scriptText: string;
  imagePrompt: string;
  overlayText?: string;
  captionText?: string;
  captionEnabled?: boolean;
  imagePath?: string;
  imageStatus: AssetStatus;
  audioPath?: string;
  audioDurationMs?: number;
  audioStatus: AssetStatus;
  voiceId?: string;
  voiceSpeed: number;
  motionType: MotionType;
  transitionType?: TransitionType;
  transitionDurationMs?: number;
  videoEffect?: string;
  approvalStatus: ApprovalStatus;
  visualBeats?: VisualBeat[];
  errorMessage?: string;
  words?: AlignedWord[];
  speechStartMs?: number;
  speechEndMs?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Canonical configuration shared 1:1 between the React preview editor
 * and the FFmpeg export pipeline (Section 18).
 */
export interface SceneEditConfig {
  sceneId: string;
  beatId?: string;
  startMs: number;
  endMs: number;
  imagePath: string;
  audioPath: string;
  captionText: string;
  captionEnabled: boolean;
  captionStyle?: CaptionStyleConfig;
  videoEffect?: string;
  motion:
    | 'STATIC'
    | 'ZOOM_IN'
    | 'ZOOM_OUT'
    | 'PAN_LEFT'
    | 'PAN_RIGHT'
    | 'PUSH_IN'
    | 'PUNCH_IN';
  transition: 'CUT' | 'DISSOLVE' | 'FADE' | 'FADE_WHITE' | 'WIPE_LEFT' | 'WIPE_RIGHT' | 'CIRCLE_CROP' | 'SMOOTH_LEFT' | 'SMOOTH_RIGHT';
  transitionDurationMs: number;
  sceneIndex?: number;
  beatIndex?: number;
  durationMs?: number;
  shotType?: VisualShotType;
  keyword?: string;
  keywordEnabled?: boolean;
  motionType?: MotionType;
  transitionType?: TransitionType;
  voiceSpeed?: number;
  inAnimation?: string;
  outAnimation?: string;
  inAnimationDurationMs?: number;
  outAnimationDurationMs?: number;
}

export interface RenderRecord {
  id: string;
  projectId: string;
  status: string;
  outputPath?: string;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface AppSettings {
  workspacePath: string;
  defaultVoiceId: string;
  pixazoResolution?: string;
  defaultMotion: MotionType;
  subtitleMode: string;
  musicVolumePercent: number;
  ffmpegPath: string;
  ffprobePath: string;
  verboseLogging: boolean;
  visualStyle?: string;
  backgroundColor?: string;
  characterStyle?: string;
  textOverlayEnabled?: boolean;
  overlayHighlightColor?: string;
  defaultEditStyle?: string;
  imageAspectRatio?: string;
  narrationStyle?: string;
}

export interface ParsedScene {
  index: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  text: string;
  customPrompt?: string;
}

export interface ParseResult {
  scenes: ParsedScene[];
  totalDurationMs: number;
  avgDurationMs: number;
  warnings: string[];
}

export interface CreateProjectPayload {
  name: string;
  scriptContent: string;
  voiceId?: string;
  visualNiche?: string;
  platform?: 'YOUTUBE' | 'FACEBOOK';
  aspectRatio?: '16:9' | '9:16';
}

export interface ParallelImageTask {
  id: string;
  prompt: string;
  outputPath: string;
  concept?: string;
  sceneIndex?: number;
  width?: number;
  height?: number;
}

export interface ParallelImageProgress {
  batchId?: string;
  total: number;
  completed: number;
  generating: number;
  pending: number;
  failed: number;
  activePrompt?: string;
  lastCompleted?: {
    id: string;
    imagePath?: string;
    prompt: string;
    durationMs?: number;
    success: boolean;
    error?: string;
  };
}

export interface ParallelImageResult {
  id: string;
  prompt: string;
  imagePath?: string;
  success: boolean;
  error?: string;
  durationMs?: number;
}

export interface SystemStatusInfo {
  sqlite: boolean;
  workspacePath: string;
  workspaceExists: boolean;
  ffmpeg: boolean;
  ffprobe: boolean;
  voiceService?: boolean;
  voiceEngine?: string;
  pixazoService: boolean;
  pixazoConfigured: boolean;
  pixazoModel?: string;
  browserInstalled?: boolean;
  imageConcurrency?: number;
  imageEngine?: string;
          diskFreeGb: number;
  diskTotalGb: number;
}

export interface VideoExportOptions {
  resolution?: '720p' | '1080p' | '4k';
  fps?: 24 | 30 | 60;
  quality?: 'high' | 'recommended' | 'fast';
  burnSubtitles?: boolean;
  colorFilter?: string;
  bgmVolume?: number;
  captionStyle?: CaptionStyleConfig;
  outputFileName?: string;
}

export interface StockVideoFile {
  quality: string;
  width: number;
  height: number;
  fps?: number;
  link: string;
}

export interface StockMediaItem {
  id: string;
  source: 'pinterest' | 'pexels' | 'pixabay' | 'nasa' | 'wikimedia' | 'archive' | 'youtube';
  mediaType: 'video' | 'photo';
  title: string;
  thumbnailUrl: string;
  previewUrl?: string;
  downloadUrl: string;
  durationSec?: number;
  width?: number;
  height?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  resolution?: string;
  fps?: number;
  author?: string;
  authorUrl?: string;
  tags?: string[];
  videoFiles?: StockVideoFile[];
  hasAudio?: boolean;
  license?: string;
}

export interface StockSearchOptions {
  query: string;
  source?: 'all' | 'pinterest' | 'pexels' | 'pixabay' | 'nasa' | 'wikimedia' | 'archive' | 'youtube';
  mediaType?: 'all' | 'video' | 'photo';
  orientation?: 'all' | 'landscape' | 'portrait' | 'square';
  page?: number;
  limit?: number;
}

export interface SaveClipOptions {
  url: string;
  title: string;
  filename?: string;
  targetDirectory?: string;
  chooseLocation?: boolean;
  quality?: string;
}

export interface SaveClipResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  error?: string;
}

export interface LocalClipRecord {
  filename: string;
  filePath: string;
  sizeBytes: number;
  createdAt: number;
  thumbnail?: string;
}


export interface ViralMetadataResult {
  title: string;
  titles: string[];
  description: string;
  hashtags: string[];
  thumbnailPrompt: string;
}

export interface FacebookViralPack {
  hook: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
  suggestedAudioVibe?: string;
  fullPostText?: string;
}
