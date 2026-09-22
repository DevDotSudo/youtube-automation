import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Project, Scene, VisualBeat, VisualShotType, CreateProjectPayload, ProjectStatus, AssetStatus, ApprovalStatus, MotionType } from '../../shared/types';
import { ProjectRepository } from '../database/repositories/project.repository';
import { SceneRepository } from '../database/repositories/scene.repository';
import { VisualBeatRepository } from '../database/repositories/visual-beat.repository';
import { SettingsRepository } from '../database/repositories/settings.repository';
import { ScriptParserService } from './script-parser.service';
import { PromptService } from './prompt.service';
import { VisualBeatPlannerService } from './visual-beat-planner.service';

export class ProjectService {
  static listProjects(): Project[] {
    return ProjectRepository.list();
  }

  static getProject(id: string): { project: Project; scenes: Scene[]; hasMasterVoice: boolean } | null {
    const project = ProjectRepository.getById(id);
    if (!project) return null;
    const scenes = SceneRepository.listByProjectId(id);
    const beats = VisualBeatRepository.listByProjectId(id);

    // Attach beats to each scene
    scenes.forEach((s) => {
      s.visualBeats = beats.filter((b) => b.sceneId === s.id);
    });

    const masterVoicePath = path.join(project.projectPath, 'audio', 'master_voice.wav');
    let hasMasterVoice = fs.existsSync(masterVoicePath);

    // If master_voice.wav is not present but scenes have audio, auto-build it!
    if (!hasMasterVoice && scenes.length > 0) {
      const readyAudio = scenes.filter(s => s.audioPath && fs.existsSync(s.audioPath));
      if (readyAudio.length === scenes.length) {
        try {
          fs.mkdirSync(path.dirname(masterVoicePath), { recursive: true });
          const listFile = masterVoicePath + '.txt';
          const fileEntries = readyAudio.map(p => `file '${p.audioPath!.replace(/\\/g, '/')}'`).join('\n');
          fs.writeFileSync(listFile, fileEntries, 'utf8');
          const { execFileSync } = require('child_process');
          execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', masterVoicePath]);
          hasMasterVoice = fs.existsSync(masterVoicePath);
        } catch (e) {
          console.warn('[ProjectService] Auto-concat master voice warning:', e);
        }
      }
    }

    return { project, scenes, hasMasterVoice };
  }

  static createProject(payload: CreateProjectPayload): Project {
    const settings = SettingsRepository.get();
    const projectId = uuidv4();
    const now = new Date().toISOString();

    // Sanitize folder name
    const rawName = payload.name && payload.name.trim() ? payload.name.trim() : 'psychology-project';
    const sanitizedName = rawName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
    const projectFolder = `${sanitizedName}_${projectId.slice(0, 6)}`;
    const projectPath = path.join(settings.workspacePath, projectFolder);

    // Create workspace subfolders
    const subdirs = ['scenes', 'subtitles', 'music', 'temp', 'logs', 'output', 'audio'];
    for (const dir of subdirs) {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    }

    // Save original script
    const scriptPath = path.join(projectPath, 'original-script.txt');
    fs.writeFileSync(scriptPath, payload.scriptContent, 'utf8');

    // Parse script into scenes
    const parseResult = ScriptParserService.parseScript(payload.scriptContent);

    const project: Project = {
      id: projectId,
      name: rawName,
      status: ProjectStatus.GENERATING,
      projectPath,
      scriptPath,
      durationMs: parseResult.totalDurationMs,
      sceneCount: parseResult.scenes.length,
      voiceId: payload.voiceId || settings.defaultVoiceId,
      createdAt: now,
      updatedAt: now
    };

    // Save project metadata JSON in folder
    fs.writeFileSync(path.join(projectPath, 'project.json'), JSON.stringify(project, null, 2), 'utf8');

    // Insert project row
    ProjectRepository.create(project);

    // Create scene records and scene folders
    const scenesToInsert: Scene[] = parseResult.scenes.map((ps) => {
      const sceneId = uuidv4();
      const folderNum = String(ps.index).padStart(4, '0');
      const sceneDirPath = path.join(projectPath, 'scenes', folderNum);
      fs.mkdirSync(sceneDirPath, { recursive: true });

      const overlayText = PromptService.generateOverlayText(ps.text);
      const prompt = PromptService.buildPrompt(ps.text, overlayText);

      return {
        id: sceneId,
        projectId,
        sceneIndex: ps.index,
        startMs: ps.startMs,
        endMs: ps.endMs,
        durationMs: ps.durationMs,
        scriptText: ps.text,
        imagePrompt: prompt,
        overlayText,
        imageStatus: AssetStatus.PENDING,
        audioStatus: AssetStatus.PENDING,
        voiceId: payload.voiceId || settings.defaultVoiceId,
        voiceSpeed: 1.0,
        motionType: settings.defaultMotion || MotionType.AUTO_HARD_EDIT,
        approvalStatus: ApprovalStatus.UNREVIEWED,
        createdAt: now,
        updatedAt: now
      };
    });

    SceneRepository.createMany(scenesToInsert);

    // Plan initial Visual Beats for each scene
    const allBeats: VisualBeat[] = [];
    let lastShot: VisualShotType | undefined = undefined;

    for (const sc of scenesToInsert) {
      const beats = VisualBeatPlannerService.planSceneBeats(
        {
          id: sc.id,
          projectId,
          sceneIndex: sc.sceneIndex,
          scriptText: sc.scriptText,
          durationMs: sc.durationMs,
          startMs: sc.startMs
        },
        lastShot
      );

      const folderNum = String(sc.sceneIndex).padStart(4, '0');
      const beatsDir = path.join(projectPath, 'scenes', folderNum, 'beats');
      fs.mkdirSync(beatsDir, { recursive: true });

      beats.forEach((b) => {
        const beatNum = String(b.beatIndex + 1).padStart(2, '0');
        b.imagePath = path.join(beatsDir, `beat_${beatNum}.png`);
        allBeats.push(b);
      });

      if (beats.length > 0) {
        lastShot = beats[beats.length - 1].shotType;
        // Assign first beat image path as scene fallback
        SceneRepository.update(sc.id, { imagePath: beats[0].imagePath });
      }
    }

    VisualBeatRepository.createMany(allBeats);

    return project;
  }

  static deleteProject(id: string): void {
    const project = ProjectRepository.getById(id);
    if (project && fs.existsSync(project.projectPath)) {
      try {
        fs.rmSync(project.projectPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 350 });
      } catch (err) {
        console.error('Failed to remove project folder:', err);
      }
    }
    VisualBeatRepository.deleteByProjectId(id);
    ProjectRepository.delete(id);
  }
}
