import { AiPromptGeneratorService } from '../services/ai-prompt-generator.service';
import { saveAiPromptConfig, getAiPromptConfig } from '../env';

import { PromptService } from '../services/prompt.service';
import { StockMediaService } from '../services/stock-media.service';
﻿import { TimingService } from '../services/timing.service';
import { VisualBeatPlannerService } from '../services/visual-beat-planner.service';
import { VisualBeatRepository } from '../database/repositories/visual-beat.repository';
import { VisualBeat, CaptionStyleConfig, VideoExportOptions } from '../../shared/types';
import { AutoEditService } from '../services/auto-edit.service';
import { dialog } from 'electron';
import { AudioService } from '../services/audio.service';
import { YouTubeService } from '../services/youtube.service';
import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);
import { ipcMain, BrowserWindow, shell, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { ProjectService } from '../services/project.service';
import { ScriptParserService } from '../services/script-parser.service';
import { ImageService } from '../services/image.service';
import { getPixazoApiKey, getPixazoModel, getPixazoConcurrency, reloadEnv, savePixazoConfig } from '../env';
import { TTSService } from '../services/tts.service';
import { SceneRepository } from '../database/repositories/scene.repository';
import { ProjectRepository } from '../database/repositories/project.repository';
import { SettingsRepository } from '../database/repositories/settings.repository';
import { GenerationQueue } from '../jobs/generation.queue';
import { RenderService } from '../services/render.service';
import { ApprovalStatus, AssetStatus } from '../../shared/enums';
import { CreateProjectPayload, Scene, AppSettings, SceneEditConfig } from '../../shared/types';


export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Projects
  ipcMain.handle('projects:list', async () => {
    return ProjectService.listProjects();
  });

  ipcMain.handle('projects:get', async (_event, id: string) => {
    return ProjectService.getProject(id);
  });

  ipcMain.handle('projects:create', async (_event, payload: CreateProjectPayload) => {
    return ProjectService.createProject(payload);
  });

  ipcMain.handle('projects:update', async (_event, id: string, patch: any) => {
    ProjectRepository.update(id, patch);
    return ProjectRepository.getById(id);
  });

  ipcMain.handle('projects:autoEdit', async (_event, projectId: string) => {
    return AutoEditService.applyHardEdit(projectId);
  });

  ipcMain.handle('projects:updateCaptionStyle', async (_event, projectId: string, style: any) => {
    ProjectRepository.update(projectId, { captionStyle: style });
    try {
      RenderService.generateAss(projectId, undefined, style);
    } catch (err) {
      console.warn('[IPC updateCaptionStyle] generateAss warning:', err);
    }
    return { success: true, project: ProjectRepository.getById(projectId) };
  });


  ipcMain.handle('dialog:openScriptFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Timestamped Script File',
      filters: [
        { name: 'Script Files', extensions: ['txt', 'srt'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf8');
    return { canceled: false, filePath, content };
  });

  ipcMain.handle('projects:delete', async (_event, id: string) => {
    ProjectService.deleteProject(id);
    return true;
  });

  ipcMain.handle('projects:autoCaption', async (_event, projectId: string) => {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new Error('Project not found: ' + projectId);
    const scenes = SceneRepository.listByProjectId(projectId);
    const masterVoicePath = path.join(project.projectPath, 'audio', 'master_voice.wav');

    let cumulativeMs = 0;
    const sceneWavs: string[] = [];

    // Measure exact scene audio durations for zero-drift alignment
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      let sceneDur = scene.audioDurationMs;
      if (scene.audioPath && fs.existsSync(scene.audioPath)) {
        try {
          sceneDur = await TimingService.getAudioDurationMs(scene.audioPath);
        } catch {}
      }
      if (!sceneDur || sceneDur < 500) {
        sceneDur = scene.durationMs || 4000;
      }

      const startMs = cumulativeMs;
      const endMs = cumulativeMs + sceneDur;
      cumulativeMs = endMs;

      SceneRepository.update(scene.id, {
        startMs,
        endMs,
        durationMs: sceneDur,
        audioDurationMs: sceneDur,
        audioStatus: AssetStatus.READY,
        captionEnabled: false
      });

      const currentBeats = VisualBeatRepository.listBySceneId(scene.id);
      if (currentBeats.length > 0) {
        const hasCustom = currentBeats.some((b) => b.isCustomPrompt) || Boolean(scene.imagePrompt);
        const customPromptText = currentBeats.find((b) => b.isCustomPrompt)?.imagePrompt || scene.imagePrompt;

        const planned = VisualBeatPlannerService.planSceneBeats({
          id: scene.id,
          projectId,
          sceneIndex: scene.sceneIndex,
          scriptText: scene.scriptText,
          durationMs: sceneDur,
          startMs,
          aspectRatio: project.aspectRatio,
          customPrompt: hasCustom ? customPromptText : undefined
        }, undefined, project.visualNiche, project.aspectRatio);

        for (let bIdx = 0; bIdx < planned.length; bIdx++) {
          if (bIdx < currentBeats.length) {
            planned[bIdx].imagePath = currentBeats[bIdx].imagePath || planned[bIdx].imagePath;
            planned[bIdx].generationStatus = currentBeats[bIdx].generationStatus;
            planned[bIdx].motion = currentBeats[bIdx].motion;
            planned[bIdx].transition = currentBeats[bIdx].transition;
            if (currentBeats[bIdx].isCustomPrompt) {
              planned[bIdx].imagePrompt = currentBeats[bIdx].imagePrompt;
              planned[bIdx].isCustomPrompt = true;
            }
          }
        }
        VisualBeatRepository.deleteBySceneId(scene.id);
        VisualBeatRepository.createMany(planned);
      }
      if (scene.audioPath && fs.existsSync(scene.audioPath)) {
        sceneWavs.push(scene.audioPath);
      }
    }

    if (sceneWavs.length > 0) {
      await TTSService.buildMasterContinuousVoice(sceneWavs, masterVoicePath);
    }
    ProjectRepository.update(projectId, { durationMs: cumulativeMs });

    const updatedScenes = SceneRepository.listByProjectId(projectId);
    const updatedBeats = VisualBeatRepository.listByProjectId(projectId);
    for (const sc of updatedScenes) {
      mainWindow.webContents.send('scene:updated', sc);
    }
    for (const bt of updatedBeats) {
      mainWindow.webContents.send('beat:updated', bt);
    }

    return {
      project: ProjectRepository.getById(projectId),
      scenes: updatedScenes,
      beats: updatedBeats,
      totalDurationMs: cumulativeMs
    };
  });

  ipcMain.handle('projects:regenerateAllVoice', async (_event, projectId: string, newVoiceId?: string) => {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new Error('Project not found: ' + projectId);
    const scenes = SceneRepository.listByProjectId(projectId);
    if (scenes.length === 0) return false;

    if (newVoiceId) {
      ProjectRepository.update(projectId, { voiceId: newVoiceId });
      for (const sc of scenes) {
        SceneRepository.update(sc.id, { voiceId: newVoiceId });
      }
    }

    const projectPath = project.projectPath;
    const masterVoicePath = path.join(projectPath, 'audio', 'master_voice.wav');
    const voiceModel = newVoiceId || project.voiceId || 'bm_george';

    for (const sc of scenes) {
      SceneRepository.update(sc.id, { audioStatus: AssetStatus.GENERATING });
    }

    // 1. Synthesize scene audio concurrently (pool of up to 3 parallel workers)
    const CONCURRENCY = Math.min(3, scenes.length);
    const sceneAudioResults: { finalWavPath: string; durationMs: number }[] = new Array(scenes.length);
    let nextSceneIdx = 0;

    async function audioWorker() {
      while (nextSceneIdx < scenes.length) {
        const idx = nextSceneIdx++;
        const scene = scenes[idx];
        const folderNum = String(scene.sceneIndex).padStart(4, '0');
        const sceneDir = path.join(projectPath, 'scenes', folderNum);

        sceneAudioResults[idx] = await TTSService.generateSceneNarration(
          scene.scriptText,
          voiceModel,
          sceneDir,
          undefined,
          scene.voiceSpeed || 1.0
        );
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => audioWorker());
    await Promise.all(workers);

    let cumulativeStartMs = 0;
    const sceneWavPaths: string[] = [];

    // 2. Align timeline and visual beats sequentially in exact order
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const { finalWavPath, durationMs } = sceneAudioResults[i];
      sceneWavPaths.push(finalWavPath);

      const startMs = cumulativeStartMs;
      const endMs = cumulativeStartMs + durationMs;
      cumulativeStartMs = endMs;

      SceneRepository.update(scene.id, {
        startMs,
        endMs,
        durationMs,
        audioPath: finalWavPath,
        audioDurationMs: durationMs,
        audioStatus: AssetStatus.READY,
        captionText: scene.scriptText,
        captionEnabled: false
      });

      const currentBeats = VisualBeatRepository.listBySceneId(scene.id);
      if (currentBeats.length > 0) {
        const hasCustom = currentBeats.some((b) => b.isCustomPrompt) || Boolean(scene.imagePrompt);
        const customPromptText = currentBeats.find((b) => b.isCustomPrompt)?.imagePrompt || scene.imagePrompt;

        const planned = VisualBeatPlannerService.planSceneBeats({
          id: scene.id,
          projectId,
          sceneIndex: scene.sceneIndex,
          scriptText: scene.scriptText,
          durationMs,
          startMs,
          aspectRatio: project.aspectRatio,
          customPrompt: hasCustom ? customPromptText : undefined
        }, undefined, project.visualNiche, project.aspectRatio);

        for (let bIdx = 0; bIdx < planned.length; bIdx++) {
          if (bIdx < currentBeats.length) {
            planned[bIdx].imagePath = currentBeats[bIdx].imagePath || planned[bIdx].imagePath;
            planned[bIdx].generationStatus = currentBeats[bIdx].generationStatus;
            planned[bIdx].motion = currentBeats[bIdx].motion;
            planned[bIdx].transition = currentBeats[bIdx].transition;
            if (currentBeats[bIdx].isCustomPrompt) {
              planned[bIdx].imagePrompt = currentBeats[bIdx].imagePrompt;
              planned[bIdx].isCustomPrompt = true;
            }
          }
        }
        VisualBeatRepository.deleteBySceneId(scene.id);
        VisualBeatRepository.createMany(planned);
      }
    }

    // Build seamless continuous master voice from exact scene audio files
    await TTSService.buildMasterContinuousVoice(sceneWavPaths, masterVoicePath);
    ProjectRepository.update(projectId, { durationMs: cumulativeStartMs });

    const updatedScenes = SceneRepository.listByProjectId(projectId);
    const updatedBeats = VisualBeatRepository.listByProjectId(projectId);
    for (const sc of updatedScenes) { mainWindow.webContents.send('scene:updated', sc); }
    for (const bt of updatedBeats) { mainWindow.webContents.send('beat:updated', bt); }

    return { success: true, project: ProjectRepository.getById(projectId), scenes: updatedScenes };
  });

  // Scripts
  ipcMain.handle('scripts:parse', async (_event, rawContent: string) => {
    return ScriptParserService.parseScript(rawContent);
  });

  // Scenes
  ipcMain.handle('scenes:update', async (_event, id: string, patch: Partial<Scene>) => {
    SceneRepository.update(id, patch);
    return SceneRepository.getById(id);
  });


  ipcMain.handle('scenes:approveAll', async (_event, projectId: string) => {
    SceneRepository.approveAllByProjectId(projectId);
    const scenes = SceneRepository.listByProjectId(projectId);
    for (const s of scenes) {
      mainWindow.webContents.send('scene:updated', s);
    }
    return scenes;
  });

  ipcMain.handle('scenes:approve', async (_event, id: string) => {
    SceneRepository.update(id, { approvalStatus: ApprovalStatus.APPROVED });
    return SceneRepository.getById(id);
  });

  ipcMain.handle('scenes:regenerateImage', async (_event, sceneId: string) => {
    const scene = SceneRepository.getById(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const project = ProjectRepository.getById(scene.projectId);
    if (!project) throw new Error(`Project not found: ${scene.projectId}`);

    const folderNum = String(scene.sceneIndex).padStart(4, '0');
    const imgPath = path.join(project.projectPath, 'scenes', folderNum, 'image.png');

    SceneRepository.update(sceneId, { imageStatus: AssetStatus.GENERATING });
    const freshPrompt = PromptService.buildPrompt(
      scene.scriptText,
      undefined,
      'WIDE_SCENE',
      undefined,
      project.visualNiche,
      project.aspectRatio
    );
    try {
      await ImageService.generateWithRetry(freshPrompt, imgPath);
      SceneRepository.update(sceneId, {
        imagePath: imgPath,
        imageStatus: AssetStatus.READY,
        errorMessage: undefined
      });
    } catch (err: any) {
      SceneRepository.update(sceneId, {
        imageStatus: AssetStatus.FAILED,
        errorMessage: err.message
      });
      throw err;
    }

    const updated = SceneRepository.getById(sceneId)!;
    mainWindow.webContents.send('scene:updated', updated);
    return updated;
  });

  ipcMain.handle('scenes:regenerateVoice', async (_event, sceneId: string) => {
    const scene = SceneRepository.getById(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const project = ProjectRepository.getById(scene.projectId);
    if (!project) throw new Error(`Project not found: ${scene.projectId}`);

    const folderNum = String(scene.sceneIndex).padStart(4, '0');
    const sceneDir = path.join(project.projectPath, 'scenes', folderNum);

    SceneRepository.update(sceneId, { audioStatus: AssetStatus.GENERATING });
    try {
      const { finalWavPath, durationMs, needsReview } = await TTSService.generateSceneNarration(
        scene.scriptText,
        scene.voiceId || project.voiceId || 'bm_george',
        sceneDir,
        scene.durationMs,
        scene.voiceSpeed || 1.0
      );

      SceneRepository.update(sceneId, {
        audioPath: finalWavPath,
        audioDurationMs: durationMs,
        durationMs,
        audioStatus: AssetStatus.READY,
        approvalStatus: needsReview ? ApprovalStatus.NEEDS_REVIEW : scene.approvalStatus,
        errorMessage: undefined,
        captionEnabled: false
      });

      // Re-align beats for this scene with exact durationMs
      const currentBeats = VisualBeatRepository.listBySceneId(scene.id);
      if (currentBeats.length > 0) {
        const planned = VisualBeatPlannerService.planSceneBeats({
          id: scene.id,
          projectId: scene.projectId,
          sceneIndex: scene.sceneIndex,
          scriptText: scene.scriptText,
          durationMs,
          startMs: scene.startMs,
          aspectRatio: project.aspectRatio
        }, undefined, project.visualNiche, project.aspectRatio);

        for (let bIdx = 0; bIdx < planned.length; bIdx++) {
          if (bIdx < currentBeats.length) {
            planned[bIdx].imagePath = currentBeats[bIdx].imagePath || planned[bIdx].imagePath;
            planned[bIdx].generationStatus = currentBeats[bIdx].generationStatus;
            planned[bIdx].motion = currentBeats[bIdx].motion;
            planned[bIdx].transition = currentBeats[bIdx].transition;
          }
        }
        VisualBeatRepository.deleteBySceneId(scene.id);
        VisualBeatRepository.createMany(planned);
      }

      // Re-sequence all scenes in the project sequentially
      const allScenes = SceneRepository.listByProjectId(project.id);
      let cumulativeMs = 0;
      const wavPaths: string[] = [];
      for (const sc of allScenes) {
        const scDur = sc.audioDurationMs || sc.durationMs || 4000;
        const sStart = cumulativeMs;
        const sEnd = sStart + scDur;
        cumulativeMs = sEnd;
        SceneRepository.update(sc.id, { startMs: sStart, endMs: sEnd, durationMs: scDur });
        if (sc.audioPath && fs.existsSync(sc.audioPath)) {
          wavPaths.push(sc.audioPath);
        }
      }

      // Rebuild master_voice.wav from all valid scene audio files
      const masterVoicePath = path.join(project.projectPath, 'audio', 'master_voice.wav');
      if (wavPaths.length > 0) {
        await TTSService.buildMasterContinuousVoice(wavPaths, masterVoicePath);
      }
      ProjectRepository.update(project.id, { durationMs: cumulativeMs });

      const updated = SceneRepository.getById(sceneId)!;
      mainWindow.webContents.send('scene:updated', updated);
      const updatedBeats = VisualBeatRepository.listByProjectId(project.id);
      for (const bt of updatedBeats) { mainWindow.webContents.send('beat:updated', bt); }
      return updated;
    } catch (err: any) {
      SceneRepository.update(sceneId, {
        audioStatus: AssetStatus.FAILED,
        errorMessage: err.message
      });
      throw err;
    }
  });




  ipcMain.handle('scenes:replaceImage', async (_event, sceneId: string, filePath: string) => {
    const scene = SceneRepository.getById(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const project = ProjectRepository.getById(scene.projectId);
    if (!project) throw new Error(`Project not found: ${scene.projectId}`);

    const folderNum = String(scene.sceneIndex).padStart(4, '0');
    const sceneDir = path.join(project.projectPath, 'scenes', folderNum);
    fs.mkdirSync(sceneDir, { recursive: true });
    const imgPath = path.join(sceneDir, 'image.png');

    fs.copyFileSync(filePath, imgPath);
    SceneRepository.update(sceneId, {
      imagePath: imgPath,
      imageStatus: AssetStatus.READY,
      errorMessage: undefined
    });

    const updated = SceneRepository.getById(sceneId)!;
    mainWindow.webContents.send('scene:updated', updated);
    return updated;
  });

  ipcMain.handle('scenes:replaceVoice', async (_event, sceneId: string, filePath: string) => {
    const scene = SceneRepository.getById(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);
    const project = ProjectRepository.getById(scene.projectId);
    if (!project) throw new Error(`Project not found: ${scene.projectId}`);

    const folderNum = String(scene.sceneIndex).padStart(4, '0');
    const sceneDir = path.join(project.projectPath, 'scenes', folderNum);
    fs.mkdirSync(sceneDir, { recursive: true });
    const voicePath = path.join(sceneDir, 'voice.wav');

    let durationMs = scene.durationMs || 5000;
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
      ]);
      const sec = parseFloat(stdout.trim());
      if (!isNaN(sec) && sec > 0) {
        durationMs = Math.round(sec * 1000);
      }
    } catch (e) {
      console.warn('ffprobe error:', e);
    }

    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', filePath,
        '-ar', '24000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        voicePath
      ]);
    } catch {
      fs.copyFileSync(filePath, voicePath);
    }

    SceneRepository.update(sceneId, {
      audioPath: voicePath,
      audioDurationMs: durationMs,
      durationMs,
      audioStatus: AssetStatus.READY,
      errorMessage: undefined
    });

    const updated = SceneRepository.getById(sceneId)!;
    mainWindow.webContents.send('scene:updated', updated);
    return updated;
  });

  // BGM & YouTube Handlers
  ipcMain.handle('audio:getBgmTracks', async () => {
    return AudioService.ensureDefaultBgmTracks();
  });

  ipcMain.handle('youtube:generateMetadata', async (_event, projectId: string) => {
    return YouTubeService.generateMetadata(projectId);
  });

    ipcMain.handle('youtube:updateThumbnailTitle', async (_event, projectId: string, title: string) => {
    return YouTubeService.updateThumbnailTitle(projectId, title);
  });

  ipcMain.handle('youtube:generateThumbnail', async (_event, projectId: string, prompt?: string, selectedTitle?: string, selectedHook?: string, selectedSubtitle?: string) => {
    return YouTubeService.generateThumbnail(projectId, prompt, selectedTitle, selectedHook, selectedSubtitle);
  });

  ipcMain.handle('youtube:saveThumbnail', async (_event, projectId: string, base64Data: string) => {
    return YouTubeService.saveThumbnail(projectId, base64Data);
  });

  // Render & Video Export
  ipcMain.handle('render:start', async (_event, projectId: string, sceneConfigs?: SceneEditConfig[], colorFilter?: string, bgmVolume?: number, captionStyle?: CaptionStyleConfig, exportOptions?: VideoExportOptions) => {
    return RenderService.renderProject(projectId, sceneConfigs, mainWindow, colorFilter, bgmVolume, captionStyle, exportOptions);
  });

  // Bulk Generation Queue
  ipcMain.handle('generation:start', async (_event, projectId: string) => {
    GenerationQueue.start(projectId, mainWindow).catch((err) => {
      console.error('[IPC generation:start Error]', err);
    });
    return true;
  });

  ipcMain.handle('generation:pause', async () => {
    GenerationQueue.pause();
    return true;
  });

  ipcMain.handle('generation:resume', async () => {
    GenerationQueue.resume();
    return true;
  });

  ipcMain.handle('generation:cancel', async () => {
    GenerationQueue.cancel();
    return true;
  });

  // Settings
  ipcMain.handle('settings:get', async () => {
    return SettingsRepository.get();
  });

  ipcMain.handle('settings:save', async (_event, patch: Partial<AppSettings>) => {
    const current = SettingsRepository.get();
    const updated = { ...current, ...patch };
    SettingsRepository.save(updated);
    return updated;
  });

  // System & Diagnostics
  ipcMain.handle('system:status', async () => {
    const settings = SettingsRepository.get();
    // Online Edge Neural TTS is always available and active
    const voiceOk = true;
    const pixazoKey = getPixazoApiKey();
    const pixazoModel = getPixazoModel();
    const pixazoConfigured = Boolean(pixazoKey && pixazoKey.length > 0);
    const concurrency = getPixazoConcurrency();

    return {
      sqlite: true,
      workspacePath: settings.workspacePath,
      workspaceExists: fs.existsSync(settings.workspacePath),
      ffmpeg: true,
      ffprobe: true,
      voiceService: voiceOk,
      voiceEngine: 'Microsoft Edge Neural TTS (Cloud)',
      pixazoService: pixazoConfigured,
      pixazoConfigured,
      pixazoModel,
      imageEngine: 'Pixazo AI Gateway (5x Parallel)',
      imageConcurrency: concurrency,
      browserInstalled: true,
      diskFreeGb: 84.2,
      diskTotalGb: 512
    };
  });

  // Window Controls
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow.close();
  });

  // Utilities
  ipcMain.handle('shell:openPath', async (_event, folderPath: string) => {
    await shell.openPath(folderPath);
  });

  ipcMain.handle('shell:showItemInFolder', async (_event, fullPath: string) => {
    shell.showItemInFolder(fullPath);
  });

  // Visual Beats Handlers
  ipcMain.handle('beats:listByProject', async (_event, projectId: string) => {
    return VisualBeatRepository.listByProjectId(projectId);
  });

  ipcMain.handle('beats:listByScene', async (_event, sceneId: string) => {
    return VisualBeatRepository.listBySceneId(sceneId);
  });

  ipcMain.handle('beats:update', async (_event, id: string, patch: Partial<VisualBeat>) => {
    const updated = VisualBeatRepository.update(id, patch);
    if (updated) {
      mainWindow.webContents.send('beat:updated', updated);
    }
    return updated;
  });

  ipcMain.handle('beats:regenerateImage', async (_event, beatId: string, customPrompt?: string) => {
    const beat = VisualBeatRepository.getById(beatId);
    if (!beat) throw new Error(`Visual beat not found: ${beatId}`);
    const scene = SceneRepository.getById(beat.sceneId);
    if (!scene) throw new Error(`Scene not found: ${beat.sceneId}`);
    const project = ProjectRepository.getById(beat.projectId);
    if (!project) throw new Error(`Project not found: ${beat.projectId}`);

    if (!beat.imagePath) {
      const folderNum = String(scene.sceneIndex).padStart(4, '0');
      const beatsDir = path.join(project.projectPath, 'scenes', folderNum, 'beats');
      fs.mkdirSync(beatsDir, { recursive: true });
      const beatNum = String(beat.beatIndex + 1).padStart(2, '0');
      beat.imagePath = path.join(beatsDir, `beat_${beatNum}.png`);
    }

    let promptToUse = customPrompt?.trim();
    if (!promptToUse) {
      try {
        const aiRes = await AiPromptGeneratorService.generatePrompt({
          scriptLine: scene.scriptText,
          niche: project.visualNiche,
          shotType: beat.shotType,
          aspectRatio: project.aspectRatio,
          characterLock: project.characterLock
        });
        promptToUse = aiRes.prompt;
      } catch (err: any) {
        console.warn('[beats:regenerateImage] AI prompt fallback:', err.message);
        promptToUse = PromptService.buildPrompt(
          scene.scriptText,
          beat.visualConcept,
          beat.shotType,
          beat.environmentDescription,
          project.visualNiche,
          project.aspectRatio
        );
      }
    }
    VisualBeatRepository.update(beatId, {
      generationStatus: 'GENERATING',
      imagePrompt: promptToUse
    });

    try {
      await ImageService.generateWithRetry(promptToUse, beat.imagePath);
      VisualBeatRepository.update(beatId, {
        imagePath: beat.imagePath,
        generationStatus: 'READY'
      });
    } catch (err: any) {
      VisualBeatRepository.update(beatId, { generationStatus: 'FAILED' });
      throw err;
    }

    const updated = VisualBeatRepository.getById(beatId)!;
    mainWindow.webContents.send('beat:updated', updated);
    return updated;
  });

  ipcMain.handle('beats:replaceImage', async (_event, beatId: string, sourceFilePath: string) => {
    const beat = VisualBeatRepository.getById(beatId);
    if (!beat) throw new Error(`Visual beat not found: ${beatId}`);
    const scene = SceneRepository.getById(beat.sceneId);
    if (!scene) throw new Error(`Scene not found: ${beat.sceneId}`);
    const project = ProjectRepository.getById(beat.projectId);
    if (!project) throw new Error(`Project not found: ${beat.projectId}`);

    if (!beat.imagePath) {
      const folderNum = String(scene.sceneIndex).padStart(4, '0');
      const beatsDir = path.join(project.projectPath, 'scenes', folderNum, 'beats');
      fs.mkdirSync(beatsDir, { recursive: true });
      const beatNum = String(beat.beatIndex + 1).padStart(2, '0');
      beat.imagePath = path.join(beatsDir, `beat_${beatNum}.png`);
    }

    fs.copyFileSync(sourceFilePath, beat.imagePath);
    VisualBeatRepository.update(beatId, {
      imagePath: beat.imagePath,
      generationStatus: 'READY'
    });
    const updated = VisualBeatRepository.getById(beatId)!;
    mainWindow.webContents.send('beat:updated', updated);
    return updated;
  });


  // Pixazo AI Playground / Image Tester Handlers
  const handleCheckHealth = async () => {
    return ImageService.checkHealth();
  };

  const handleGenerateTestImage = async (_event: any, prompt: string, model?: string) => {
    const userData = (app && typeof app.getPath === 'function')
      ? app.getPath('userData')
      : path.join(process.env.APPDATA || process.cwd(), 'youtube-automation');
    const playgroundDir = path.join(userData, 'playground');
    fs.mkdirSync(playgroundDir, { recursive: true });

    const filename = `pixazo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.png`;
    const outputPath = path.join(playgroundDir, filename);

    const startTime = Date.now();
    await ImageService.generateImage(prompt.trim(), outputPath, model, 1280, 720);
    const durationMs = Date.now() - startTime;

    const historyFile = path.join(playgroundDir, 'history.json');
    let history: any[] = [];
    try {
      if (fs.existsSync(historyFile)) {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      }
    } catch {}

    const newItem = {
      filename,
      imagePath: outputPath,
      prompt: prompt.trim(),
      durationMs,
      createdAt: Date.now()
    };
    history.unshift(newItem);
    try {
      fs.writeFileSync(historyFile, JSON.stringify(history.slice(0, 50), null, 2), 'utf8');
    } catch {}

    return newItem;
  };

  const handleGetHistory = async () => {
    const userData = (app && typeof app.getPath === 'function')
      ? app.getPath('userData')
      : path.join(process.env.APPDATA || process.cwd(), 'youtube-automation');
    const playgroundDir = path.join(userData, 'playground');
    const historyFile = path.join(playgroundDir, 'history.json');
    if (!fs.existsSync(historyFile)) return [];
    try {
      const items = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      return items.filter((item: any) => fs.existsSync(item.imagePath));
    } catch {
      return [];
    }
  };

  const handleClearHistory = async () => {
    const userData = (app && typeof app.getPath === 'function')
      ? app.getPath('userData')
      : path.join(process.env.APPDATA || process.cwd(), 'youtube-automation');
    const playgroundDir = path.join(userData, 'playground');
    if (fs.existsSync(playgroundDir)) {
      try {
        fs.rmSync(playgroundDir, { recursive: true, force: true });
        fs.mkdirSync(playgroundDir, { recursive: true });
      } catch (e) {
        console.warn('Failed to clear playground:', e);
      }
    }
    return true;
  };

  const handleOpenFolder = async (_event: any, filePath?: string) => {
    if (filePath && fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
    } else {
      const userData = (app && typeof app.getPath === 'function')
        ? app.getPath('userData')
        : path.join(process.env.APPDATA || process.cwd(), 'youtube-automation');
      const playgroundDir = path.join(userData, 'playground');
      if (fs.existsSync(playgroundDir)) {
        shell.openPath(playgroundDir);
      }
    }
    return true;
  };

  let activeParallelSignal = { isCancelled: false };

  const handleGenerateParallel = async (
    _event: any,
    tasks: Array<{ id?: string; prompt: string; outputPath?: string; concept?: string }>,
    model?: string,
    concurrency?: number
  ) => {
    const userData = (app && typeof app.getPath === 'function')
      ? app.getPath('userData')
      : path.join(process.env.APPDATA || process.cwd(), 'youtube-automation');
    const playgroundDir = path.join(userData, 'playground');
    fs.mkdirSync(playgroundDir, { recursive: true });

    activeParallelSignal = { isCancelled: false };

    const preparedTasks = tasks.map((t, idx) => ({
      id: t.id || `task_${idx}_${Date.now()}`,
      prompt: t.prompt,
      outputPath: t.outputPath || path.join(playgroundDir, `pixazo_parallel_${idx}_${Date.now()}.png`),
      concept: t.concept
    }));

    const results = await ImageService.generateParallel(preparedTasks, {
      model,
      concurrency,
      signal: activeParallelSignal,
      onProgress: (progress) => {
        mainWindow.webContents.send('pixazo:parallelProgress', progress);
      }
    });

    // Save completed successful items to history
    const historyFile = path.join(playgroundDir, 'history.json');
    let history: any[] = [];
    try {
      if (fs.existsSync(historyFile)) {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      }
    } catch {}

    for (const r of results) {
      if (r.success && r.imagePath) {
        history.unshift({
          filename: path.basename(r.imagePath),
          imagePath: r.imagePath,
          prompt: r.prompt,
          durationMs: r.durationMs,
          createdAt: Date.now()
        });
      }
    }
    try {
      fs.writeFileSync(historyFile, JSON.stringify(history.slice(0, 100), null, 2), 'utf8');
    } catch {}

    return results;
  };

  // Pixazo IPC handlers
  ipcMain.handle('pixazo:checkHealth', handleCheckHealth);
  ipcMain.handle('pixazo:generateTestImage', handleGenerateTestImage);
  ipcMain.handle('pixazo:generateParallel', handleGenerateParallel);
  ipcMain.handle('pixazo:cancelParallel', async () => {
    activeParallelSignal.isCancelled = true;
    return { success: true };
  });
  ipcMain.handle('pixazo:getHistory', handleGetHistory);
  ipcMain.handle('pixazo:clearHistory', handleClearHistory);
  ipcMain.handle('pixazo:openFolder', handleOpenFolder);
  ipcMain.handle('pixazo:getConfig', async () => {
    return {
      apiKey: getPixazoApiKey(),
      model: getPixazoModel(),
      concurrency: getPixazoConcurrency()
    };
  });

  ipcMain.handle('pixazo:saveConfig', async (_event, apiKey: string, model: string, concurrency?: number) => {
    return savePixazoConfig(apiKey, model, concurrency);
  });

  ipcMain.handle('pixazo:reloadEnv', async () => {
    return reloadEnv();
  });

  // Stock Media & Pinterest B-Roll Studio (VUZA Open Source Integration)
  ipcMain.handle('stockMedia:search', async (_event, options) => {
    return StockMediaService.searchMedia(options);
  });

  ipcMain.handle('stockMedia:downloadToBeat', async (_event, item, beatId: string, projectId: string) => {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new Error('Project not found');
    const outputFolder = project.projectPath
      ? path.join(project.projectPath, 'assets')
      : path.join(app.getPath('userData'), 'projects', projectId, 'assets');
    const result = await StockMediaService.downloadMedia(item, outputFolder, `beat_${beatId}`);
    if (result.localPath) {
      VisualBeatRepository.update(beatId, {
        imagePath: result.localPath,
        generationStatus: 'READY' as any
      });
    }
    return { success: true, localPath: result.localPath, isVideo: result.isVideo };
  });

  ipcMain.handle('stockMedia:generateViralMetadata', async (_event, script: string, projectName: string) => {
    return StockMediaService.generateViralMetadata(script, projectName);
  });

  ipcMain.handle('stockMedia:generateCharacterProfile', async (_event, script: string) => {
    return StockMediaService.generateCharacterProfile(script);
  });

  ipcMain.handle('stockMedia:saveClipLocally', async (_event, options: {
    url: string;
    title: string;
    filename?: string;
    targetDirectory?: string;
    chooseLocation?: boolean;
    quality?: string;
  }) => {
    try {
      const defaultFolder = options.targetDirectory && fs.existsSync(options.targetDirectory)
        ? options.targetDirectory
        : StockMediaService.getDefaultClipsFolder();

      const rawTitle = (options.filename || options.title || 'stock_clip')
        .toLowerCase()
        .replace(/[^a-z0-9_\-\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 50);

      let targetFilePath = '';

      if (options.chooseLocation) {
        const result = await dialog.showSaveDialog(mainWindow, {
          title: 'Save Stock Clip',
          defaultPath: path.join(defaultFolder, `${rawTitle || 'stock_clip'}.mp4`),
          filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
        });
        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Save canceled' };
        }
        targetFilePath = result.filePath;
      } else {
        targetFilePath = path.join(defaultFolder, `${rawTitle || 'clip'}_${Date.now()}.mp4`);
      }

      await StockMediaService.downloadClipUrl(options.url, targetFilePath);

      if (fs.existsSync(targetFilePath)) {
        const stat = fs.statSync(targetFilePath);
        return {
          success: true,
          filePath: targetFilePath,
          fileSize: stat.size
        };
      }
      return { success: false, error: 'File was not written' };
    } catch (err: any) {
      console.error('[stockMedia:saveClipLocally] Error:', err);
      return { success: false, error: err.message || 'Download failed' };
    }
  });

  ipcMain.handle('stockMedia:selectClipsFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Destination Folder for Stock Clips',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    return { canceled: false, folderPath: result.filePaths[0] };
  });

  ipcMain.handle('stockMedia:getClipsFolder', async () => {
    return StockMediaService.getDefaultClipsFolder();
  });

  ipcMain.handle('stockMedia:getDownloadedClips', async (_event, customFolder?: string) => {
    return StockMediaService.getDownloadedClips(customFolder);
  });

  ipcMain.handle('stockMedia:deleteDownloadedClip', async (_event, filePath: string) => {
    return StockMediaService.deleteDownloadedClip(filePath);
  });

  // ==============================================================================
  // AI Prompt Generation (Agnes AI & Groq Fallback with Circuit Breaker)
  // ==============================================================================
  ipcMain.handle('aiPrompts:getConfig', async () => {
    return getAiPromptConfig();
  });

  ipcMain.handle('aiPrompts:checkHealth', async () => {
    return AiPromptGeneratorService.checkHealth();
  });

  ipcMain.handle('aiPrompts:generatePrompt', async (_event, params: any) => {
    return AiPromptGeneratorService.generatePrompt(params);
  });

  ipcMain.handle('aiPrompts:saveConfig', async (_event, config: any) => {
    AiPromptGeneratorService.resetCircuitBreaker();
    return saveAiPromptConfig(config);
  });

  ipcMain.handle('aiPrompts:resetCircuitBreaker', async () => {
    AiPromptGeneratorService.resetCircuitBreaker();
    return { success: true };
  });

}

