import { Project, Scene, VisualBeat, CreateProjectPayload, ParseResult, AppSettings, SystemStatusInfo, SceneEditConfig, CaptionStyleConfig, VideoExportOptions } from '../shared/types';

export interface DocuforgeApi {
  projects: {
    list: () => Promise<Project[]>;
    get: (id: string) => Promise<{ project: Project; scenes: Scene[] } | null>;
    create: (payload: CreateProjectPayload) => Promise<Project>;
    delete: (id: string) => Promise<boolean>;
    update: (id: string, patch: Partial<Project>) => Promise<Project>;
    autoEdit: (projectId: string) => Promise<Scene[]>;
    autoCaption: (projectId: string) => Promise<any>;
    regenerateAllVoice: (projectId: string) => Promise<any>;
  };
  scripts: {
    parse: (content: string) => Promise<ParseResult>;
  };
  dialog: {
    openScriptFile: () => Promise<{ canceled: boolean; filePath?: string; content?: string }>;
  };
  beats: {
    listByProject: (projectId: string) => Promise<VisualBeat[]>;
    listByScene: (sceneId: string) => Promise<VisualBeat[]>;
    update: (id: string, patch: Partial<VisualBeat>) => Promise<VisualBeat | null>;
    regenerateImage: (beatId: string, customPrompt?: string) => Promise<VisualBeat>;
    replaceImage: (beatId: string, filePath: string) => Promise<VisualBeat>;
    onBeatUpdated: (callback: (beat: VisualBeat) => void) => () => void;
  };
  scenes: {
    update: (id: string, patch: Partial<Scene>) => Promise<Scene>;
    approve: (id: string) => Promise<Scene>;
    approveAll: (projectId: string) => Promise<Scene[]>;
    regenerateImage: (sceneId: string) => Promise<Scene>;
    regenerateVoice: (sceneId: string) => Promise<Scene>;
    replaceImage: (sceneId: string, filePath: string) => Promise<Scene>;
    replaceVoice: (sceneId: string, filePath: string) => Promise<Scene>;
    onSceneUpdated: (callback: (scene: Scene) => void) => () => void;
  };
  generation: {
    start: (projectId: string) => Promise<boolean>;
    pause: () => Promise<boolean>;
    resume: () => Promise<boolean>;
    cancel: () => Promise<boolean>;
    onProgress: (callback: (data: {
      projectId: string;
      totalScenes?: number;
      sceneDone?: number;
      imageDone?: number;
      audioDone?: number;
      audioTotal?: number;
      totalBeats?: number;
      beatDone?: number;
      beatsDone?: number;
      beatsTotal?: number;
      currentScene?: Scene;
      currentBeat?: VisualBeat;
      statusText?: string;
      statusMessage?: string;
      percent?: number;
    }) => void) => () => void;
    onComplete: (callback: (data: { projectId: string }) => void) => () => void;
  };

  render: {
    start: (projectId: string, sceneConfigs?: SceneEditConfig[], colorFilter?: string, bgmVolume?: number, captionStyle?: CaptionStyleConfig, exportOptions?: VideoExportOptions) => Promise<string>;
    onProgress: (callback: (data: { projectId: string; stage: string; percent: number }) => void) => () => void;
    onComplete: (callback: (data: { projectId: string; outputPath: string }) => void) => () => void;
  };
  audio: {
    getBgmTracks: () => Promise<Array<{ id: string; name: string; category: string; description: string; filePath: string; streamUrl?: string }>>;
  };
  youtube: {
    generateMetadata: (projectId: string) => Promise<{
      titles: string[];
      chaptersText: string;
      descriptionText: string;
      tagsText: string;
      totalDurationFormatted: string;
      sceneCount: number;
      suggestedThumbTexts?: string[];
      thumbnailHooks?: string[];
      thumbnailSubtitles?: string[];
      thumbnailPrompt?: string;
      existingThumbnailPath?: string;
      existingRawThumbnailPath?: string;
    }>;
    generateThumbnail: (projectId: string, prompt?: string, selectedTitle?: string, hook?: string, subtitle?: string) => Promise<string>;
    updateThumbnailTitle: (projectId: string, title: string) => Promise<string>;
    saveThumbnail: (projectId: string, base64Data: string) => Promise<string>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    save: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  };
  system: {
    status: () => Promise<SystemStatusInfo>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  shell: {
    openPath: (path: string) => Promise<void>;
    showItemInFolder: (path: string) => Promise<void>;
  };
  pixazo: {
    getConfig: () => Promise<{ apiKey: string; model: string; concurrency?: number }>;
    saveConfig: (apiKey: string, model: string, concurrency?: number) => Promise<{ success: boolean; pixazoApiKeySet: boolean; model: string; concurrency?: number }>;
    checkHealth: () => Promise<{ ready: boolean; service: string; model?: string }>;
    generateTestImage: (prompt: string, model?: string) => Promise<{
      success?: boolean;
      filename: string;
      imagePath: string;
      prompt: string;
      durationMs: number;
      createdAt: number;
      error?: string;
    }>;
    generateParallel: (
      tasks: Array<{ id?: string; prompt: string; outputPath?: string; concept?: string }>,
      model?: string,
      concurrency?: number
    ) => Promise<Array<{
      id: string;
      success: boolean;
      imagePath?: string;
      prompt: string;
      durationMs?: number;
      error?: string;
    }>>;
    cancelParallel: () => Promise<boolean>;
    onParallelProgress: (callback: (progress: any) => void) => () => void;
    getHistory: () => Promise<Array<{
      filename: string;
      imagePath: string;
      prompt: string;
      durationMs: number;
      createdAt: number;
    }>>;
    clearHistory: () => Promise<boolean>;
    openFolder: (filePath?: string) => Promise<boolean>;
    reloadEnv: () => Promise<{ success: boolean; pixazoApiKeySet: boolean; model: string; concurrency?: number }>;
  };
}

declare global {
  interface Window {
    docuforge: DocuforgeApi;
    psychoniche: DocuforgeApi;
  }
}
