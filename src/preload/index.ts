import { contextBridge, ipcRenderer } from 'electron';
import { Project, CreateProjectPayload, Scene, VisualBeat, AppSettings, SceneEditConfig, CaptionStyleConfig, VideoExportOptions } from '../shared/types';

const api = {
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id: string) => ipcRenderer.invoke('projects:get', id),
    create: (payload: CreateProjectPayload) => ipcRenderer.invoke('projects:create', payload),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', id),
    update: (id: string, patch: Partial<Project>) => ipcRenderer.invoke('projects:update', id, patch),
    autoEdit: (projectId: string) => ipcRenderer.invoke('projects:autoEdit', projectId),
    autoCaption: (projectId: string) => ipcRenderer.invoke('projects:autoCaption', projectId),
    syncTimeline: (projectId: string) => ipcRenderer.invoke('projects:autoCaption', projectId),
    syncCaptions: (projectId: string) => ipcRenderer.invoke('projects:autoCaption', projectId),
      updateCaptionStyle: (projectId: string, style: any) => ipcRenderer.invoke('projects:updateCaptionStyle', projectId, style),
    regenerateAllVoice: (projectId: string, voiceId?: string) => ipcRenderer.invoke('projects:regenerateAllVoice', projectId, voiceId)
  },
  scripts: {
    parse: (content: string) => ipcRenderer.invoke('scripts:parse', content)
  },
  dialog: {
    openScriptFile: () => ipcRenderer.invoke('dialog:openScriptFile')
  },
  beats: {
    listByProject: (projectId: string) => ipcRenderer.invoke('beats:listByProject', projectId),
    listByScene: (sceneId: string) => ipcRenderer.invoke('beats:listByScene', sceneId),
    update: (id: string, patch: Partial<VisualBeat>) => ipcRenderer.invoke('beats:update', id, patch),
    regenerateImage: (beatId: string, customPrompt?: string) => ipcRenderer.invoke('beats:regenerateImage', beatId, customPrompt),
    replaceImage: (beatId: string, filePath: string) => ipcRenderer.invoke('beats:replaceImage', beatId, filePath),
    onBeatUpdated: (callback: (beat: VisualBeat) => void) => {
      const handler = (_event: any, beat: VisualBeat) => callback(beat);
      ipcRenderer.on('beat:updated', handler);
      return () => {
        ipcRenderer.removeListener('beat:updated', handler);
      };
    }
  },
  scenes: {
    update: (id: string, patch: Partial<Scene>) => ipcRenderer.invoke('scenes:update', id, patch),
    approve: (id: string) => ipcRenderer.invoke('scenes:approve', id),
    approveAll: (projectId: string) => ipcRenderer.invoke('scenes:approveAll', projectId),
    regenerateImage: (sceneId: string) => ipcRenderer.invoke('scenes:regenerateImage', sceneId),
    regenerateVoice: (sceneId: string) => ipcRenderer.invoke('scenes:regenerateVoice', sceneId),
    replaceImage: (sceneId: string, filePath: string) => ipcRenderer.invoke('scenes:replaceImage', sceneId, filePath),
    replaceVoice: (sceneId: string, filePath: string) => ipcRenderer.invoke('scenes:replaceVoice', sceneId, filePath),
    onSceneUpdated: (callback: (scene: Scene) => void) => {
      const handler = (_event: any, scene: Scene) => callback(scene);
      ipcRenderer.on('scene:updated', handler);
      return () => {
        ipcRenderer.removeListener('scene:updated', handler);
      };
    }
  },
  generation: {
    start: (projectId: string) => ipcRenderer.invoke('generation:start', projectId),
    pause: () => ipcRenderer.invoke('generation:pause'),
    resume: () => ipcRenderer.invoke('generation:resume'),
    cancel: () => ipcRenderer.invoke('generation:cancel'),
    onProgress: (callback: (data: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('generation:progress', handler);
      return () => {
        ipcRenderer.removeListener('generation:progress', handler);
      };
    },
    onComplete: (callback: (data: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('generation:complete', handler);
      return () => {
        ipcRenderer.removeListener('generation:complete', handler);
      };
    },
    onError: (callback: (data: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('generation:error', handler);
      return () => {
        ipcRenderer.removeListener('generation:error', handler);
      };
    }
  },

  render: {
    start: (projectId: string, sceneConfigs?: SceneEditConfig[], colorFilter?: string, bgmVolume?: number, captionStyle?: CaptionStyleConfig, exportOptions?: VideoExportOptions) => ipcRenderer.invoke('render:start', projectId, sceneConfigs, colorFilter, bgmVolume, captionStyle, exportOptions),
    onProgress: (callback: (data: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('render:progress', handler);
      return () => {
        ipcRenderer.removeListener('render:progress', handler);
      };
    },
    onComplete: (callback: (data: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('render:complete', handler);
      return () => {
        ipcRenderer.removeListener('render:complete', handler);
      };
    }
  },
  audio: {
    getBgmTracks: () => ipcRenderer.invoke('audio:getBgmTracks')
  },
  youtube: {
    generateMetadata: (projectId: string) => ipcRenderer.invoke('youtube:generateMetadata', projectId),
    generateThumbnail: (projectId: string, prompt?: string, selectedTitle?: string, hook?: string, subtitle?: string) => ipcRenderer.invoke('youtube:generateThumbnail', projectId, prompt, selectedTitle, hook, subtitle),
    updateThumbnailTitle: (projectId: string, title: string) => ipcRenderer.invoke('youtube:updateThumbnailTitle', projectId, title),
    saveThumbnail: (projectId: string, base64Data: string) => ipcRenderer.invoke('youtube:saveThumbnail', projectId, base64Data)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (patch: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', patch)
  },
  system: {
    status: () => ipcRenderer.invoke('system:status')
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },
  shell: {
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
    showItemInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path)
  },

  aiPrompts: {
    getConfig: () => ipcRenderer.invoke('aiPrompts:getConfig'),
    checkHealth: () => ipcRenderer.invoke('aiPrompts:checkHealth'),
    generatePrompt: (params: any) => ipcRenderer.invoke('aiPrompts:generatePrompt', params),
    saveConfig: (config: any) => ipcRenderer.invoke('aiPrompts:saveConfig', config),
    resetCircuitBreaker: () => ipcRenderer.invoke('aiPrompts:resetCircuitBreaker')
  },

  pixazo: {
    getConfig: () => ipcRenderer.invoke('pixazo:getConfig'),
    saveConfig: (apiKey: string, model: string, concurrency?: number) => ipcRenderer.invoke('pixazo:saveConfig', apiKey, model, concurrency),
    checkHealth: () => ipcRenderer.invoke('pixazo:checkHealth'),
    generateTestImage: (prompt: string, model?: string) => ipcRenderer.invoke('pixazo:generateTestImage', prompt, model),
    generateParallel: (tasks: any[], model?: string, concurrency?: number) => ipcRenderer.invoke('pixazo:generateParallel', tasks, model, concurrency),
    cancelParallel: () => ipcRenderer.invoke('pixazo:cancelParallel'),
    onParallelProgress: (callback: (progress: any) => void) => {
      const handler = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('pixazo:parallelProgress', handler);
      return () => {
        ipcRenderer.removeListener('pixazo:parallelProgress', handler);
      };
    },
    getHistory: () => ipcRenderer.invoke('pixazo:getHistory'),
    clearHistory: () => ipcRenderer.invoke('pixazo:clearHistory'),
    openFolder: (filePath?: string) => ipcRenderer.invoke('pixazo:openFolder', filePath),
    reloadEnv: () => ipcRenderer.invoke('pixazo:reloadEnv')
  },
  stockMedia: {
    search: (queryOrOptions: any, source?: string, mediaType?: string) => {
      const opts = typeof queryOrOptions === 'object'
        ? queryOrOptions
        : { query: queryOrOptions, source, mediaType };
      return ipcRenderer.invoke('stockMedia:search', opts);
    },
    downloadToBeat: (item: any, beatId: string, projectId: string) =>
      ipcRenderer.invoke('stockMedia:downloadToBeat', item, beatId, projectId),
    generateViralMetadata: (script: string, projectName: string) =>
      ipcRenderer.invoke('stockMedia:generateViralMetadata', script, projectName),
    generateCharacterProfile: (script: string) =>
      ipcRenderer.invoke('stockMedia:generateCharacterProfile', script),
    scrapeVideosForScript: (script: string, niche?: string, aspectRatio?: '9:16' | '16:9') =>
      ipcRenderer.invoke('stockMedia:scrapeVideosForScript', script, niche, aspectRatio),
    generateFacebookViralPack: (script: string, projectName: string, niche?: string) =>
      ipcRenderer.invoke('stockMedia:generateFacebookViralPack', script, projectName, niche),
    saveClipLocally: (options: any) =>
      ipcRenderer.invoke('stockMedia:saveClipLocally', options),
    selectClipsFolder: () =>
      ipcRenderer.invoke('stockMedia:selectClipsFolder'),
    getClipsFolder: () =>
      ipcRenderer.invoke('stockMedia:getClipsFolder'),
    getDownloadedClips: (customFolder?: string) =>
      ipcRenderer.invoke('stockMedia:getDownloadedClips', customFolder),
    deleteDownloadedClip: (filePath: string) =>
      ipcRenderer.invoke('stockMedia:deleteDownloadedClip', filePath)
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('docuforge', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore
  window.docuforge = api;
}
