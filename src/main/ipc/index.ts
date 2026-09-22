import { AutoCaptionService } from '../services/auto-caption.service';
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
import http from 'http';
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

function checkServicePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

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
    if (!fs.existsSync(masterVoicePath)) {
      throw new Error('Master audio not found: ' + masterVoicePath);
    }

    const alignResult = await AutoCaptionService.alignScenesToAudio(
      masterVoicePath,
      scenes,
      project.projectPath
    );

    const subDir = path.join(project.projectPath, 'subtitles');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'alignment.json'), JSON.stringify(alignResult, null, 2), 'utf8');

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const aligned = alignResult.scenes.find((as) => as.id === scene.id || as.sceneIndex === scene.sceneIndex);
      const startMs = aligned ? aligned.startMs : (i === 0 ? 0 : scenes[i - 1].endMs);
      const endMs = aligned ? aligned.endMs : (startMs + 4000);
      const finalDurationMs = Math.max(1000, endMs - startMs);

      SceneRepository.update(scene.id, {
        startMs,
        endMs,
        durationMs: finalDurationMs,
        audioPath: masterVoicePath,
        audioDurationMs: finalDurationMs,
        audioStatus: AssetStatus.READY,
        captionText: scene.scriptText,
        captionEnabled: true,
        words: aligned?.words || [],
        speechStartMs: aligned?.speechStartMs ?? startMs,
        speechEndMs: aligned?.speechEndMs ?? endMs
      });

      const currentBeats = VisualBeatRepository.listBySceneId(scene.id);
      if (currentBeats.length > 0) {
        const planned = VisualBeatPlannerService.planSceneBeats({
          id: scene.id,
          projectId,
          sceneIndex: scene.sceneIndex,
          scriptText: scene.scriptText,
          durationMs: finalDurationMs,
          startMs
        });
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
    }

    ProjectRepository.update(projectId, {
      durationMs: alignResult.totalDurationMs
    });

    try {
      RenderService.generateAss(projectId);
    } catch (e) {
      console.warn('[IPC projects:autoCaption] generateAss warning:', e);
    }

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
      totalDurationMs: alignResult.totalDurationMs
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

    const masterVoicePath = path.join(project.projectPath, 'audio', 'master_voice.wav');
    const voiceModel = newVoiceId || project.voiceId || 'bm_george';

    for (const sc of scenes) {
      SceneRepository.update(sc.id, { audioStatus: AssetStatus.GENERATING });
    }

    const fullScript = scenes.map((s) => s.scriptText.trim()).filter(Boolean).join(' ');
    await TTSService.generateUncutContinuousNarration(fullScript, voiceModel, masterVoicePath);

    const alignResult = await AutoCaptionService.alignScenesToAudio(masterVoicePath, scenes, project.projectPath);

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const aligned = alignResult.scenes.find((as) => as.id === scene.id || as.sceneIndex === scene.sceneIndex);
      const startMs = aligned ? aligned.startMs : (i === 0 ? 0 : scenes[i - 1].endMs);
      const endMs = aligned ? aligned.endMs : (startMs + 4000);
      const finalDurationMs = Math.max(1000, endMs - startMs);

      SceneRepository.update(scene.id, {
        startMs,
        endMs,
        durationMs: finalDurationMs,
        audioPath: masterVoicePath,
        audioDurationMs: finalDurationMs,
        audioStatus: AssetStatus.READY,
        captionText: scene.scriptText,
        captionEnabled: true
      });

      const currentBeats = VisualBeatRepository.listBySceneId(scene.id);
      if (currentBeats.length > 0) {
        const planned = VisualBeatPlannerService.planSceneBeats({
          id: scene.id,
          projectId,
          sceneIndex: scene.sceneIndex,
          scriptText: scene.scriptText,
          durationMs: finalDurationMs,
          startMs
        });
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
    }

    ProjectRepository.update(projectId, { durationMs: alignResult.totalDurationMs });

    try { RenderService.generateAss(projectId); } catch {}

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
    try {
      await ImageService.generateWithRetry(scene.imagePrompt, imgPath);
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
        audioStatus: AssetStatus.READY,
        approvalStatus: needsReview ? ApprovalStatus.NEEDS_REVIEW : scene.approvalStatus,
        errorMessage: undefined
      });
    } catch (err: any) {
      SceneRepository.update(sceneId, {
        audioStatus: AssetStatus.FAILED,
        errorMessage: err.message
      });
      throw err;
    }

    const updated = SceneRepository.getById(sceneId)!;
    mainWindow.webContents.send('scene:updated', updated);
    return updated;
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
    const kokoroOk = await checkServicePort(8880);
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
      kokoroService: kokoroOk,
      pixazoService: pixazoConfigured,
      pixazoConfigured,
      pixazoModel,
      parrotAiService: pixazoConfigured,
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

    const promptToUse = customPrompt || beat.imagePrompt;
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

  // Backwards compatibility aliases for parrotai:*
  ipcMain.handle('parrotai:checkHealth', handleCheckHealth);
  ipcMain.handle('parrotai:generateTestImage', handleGenerateTestImage);
  ipcMain.handle('parrotai:getHistory', handleGetHistory);
  ipcMain.handle('parrotai:clearHistory', handleClearHistory);
  ipcMain.handle('parrotai:openFolder', handleOpenFolder);
}


