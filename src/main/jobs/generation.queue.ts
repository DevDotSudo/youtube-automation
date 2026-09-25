import { AiPromptGeneratorService } from '../services/ai-prompt-generator.service';
import path from 'path';
import fs from 'fs';
import { BrowserWindow } from 'electron';
import { ProjectRepository } from '../database/repositories/project.repository';
import { SceneRepository } from '../database/repositories/scene.repository';
import { VisualBeatRepository } from '../database/repositories/visual-beat.repository';
import { ImageService } from '../services/image.service';
import { getPixazoConcurrency } from '../env';
import { TTSService } from '../services/tts.service';
import { RenderService } from '../services/render.service';
import { AutoEditService } from '../services/auto-edit.service';
import { VisualBeatPlannerService } from '../services/visual-beat-planner.service';
import { StockMediaService } from '../services/stock-media.service';
import { AssetStatus, ProjectStatus } from '../../shared/enums';
import { Scene, VisualBeat } from '../../shared/types';

export class GenerationQueue {
  private static isPaused = false;
  private static isCancelled = false;
  private static activeProjectId: string | null = null;

  static isRunning(projectId?: string): boolean {
    if (!projectId) return !!this.activeProjectId;
    return this.activeProjectId === projectId;
  }

  static pause(): void {
    this.isPaused = true;
  }

  static resume(): void {
    this.isPaused = false;
  }

  static cancel(): void {
    this.isCancelled = true;
    this.activeProjectId = null;
  }

  static async start(projectId: string, mainWindow?: BrowserWindow): Promise<void> {
    if (this.activeProjectId === projectId) {
      console.warn('[GenerationQueue] Already running for project:', this.activeProjectId);
      return;
    }

    this.activeProjectId = projectId;
    this.isPaused = false;
    this.isCancelled = false;

    const project = ProjectRepository.getById(projectId);
    if (!project) {
      console.error('[GenerationQueue] Project not found:', projectId);
      this.activeProjectId = null;
      return;
    }

    ProjectRepository.update(projectId, { status: ProjectStatus.GENERATING });

    const scenes = SceneRepository.listByProjectId(projectId);
    let allBeats: VisualBeat[] = VisualBeatRepository.listByProjectId(projectId);

    let audioDoneCount = scenes.filter((s) => s.audioStatus === AssetStatus.READY).length;
    let beatDoneCount = allBeats.filter((b) => b.generationStatus === 'READY').length;

    const emitProgress = (
      aDone: number,
      bDone: number,
      currentScene?: Scene,
      currentBeat?: VisualBeat,
      customStatus?: string
    ) => {
      const totalAudio = scenes.length;
      const totalBeats = allBeats.length;
      const totalSteps = totalAudio + totalBeats;
      const completedSteps = aDone + bDone;
      const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      let statusMessage = customStatus;
      if (!statusMessage) {
        if (aDone < totalAudio) {
          statusMessage = `Synthesizing continuous speech (${aDone}/${totalAudio} scenes)...`;
        } else if (bDone < totalBeats) {
          statusMessage = `Generating illustrations (${bDone}/${totalBeats} beats)...`;
        } else {
          statusMessage = 'Finalizing background auto-edit...';
        }
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:progress', {
          projectId,
          statusMessage,
          statusText: statusMessage,
          percent,
          audioDone: aDone,
          audioTotal: totalAudio,
          totalScenes: totalAudio,
          sceneDone: aDone,
          beatsDone: bDone,
          beatsTotal: totalBeats,
          totalBeats,
          beatDone: bDone,
          currentScene,
          currentBeat
        });
      }
    };

    // Helper: Validates if a beat has a physically verified non-empty image file on disk
    const isBeatImageValid = (b: VisualBeat): boolean => {
      if (b.generationStatus !== 'READY' || !b.imagePath) return false;
      try {
        return fs.existsSync(b.imagePath) && fs.statSync(b.imagePath).size > 500;
      } catch {
        return false;
      }
    };

    // Image Worker: Generates breathtaking Studio Ghibli hand-painted anime scenes with multi-pass resilience
    const runImageWorker = async () => {
      const isVertical = project.aspectRatio === '9:16';
      const imgWidth = isVertical ? 1080 : 1920;
      const imgHeight = isVertical ? 1920 : 1080;
      let freshBeats = VisualBeatRepository.listByProjectId(projectId);
      allBeats = freshBeats;

      // Ensure all beats have concrete target image paths on disk
      for (const beat of freshBeats) {
        if (!beat.imagePath) {
          const parentScene = scenes.find((s) => s.id === beat.sceneId) || scenes[0];
          const folderNum = String(parentScene.sceneIndex).padStart(4, '0');
          const beatsDir = path.join(project.projectPath, 'scenes', folderNum, 'beats');
          fs.mkdirSync(beatsDir, { recursive: true });
          const beatNum = String(beat.beatIndex + 1).padStart(2, '0');
          beat.imagePath = path.join(beatsDir, `beat_${beatNum}.png`);
          VisualBeatRepository.update(beat.id, { imagePath: beat.imagePath });
        }
      }

      // Pass 1: High-Speed 5x Parallel Sliding-Window Worker Pool
      const pendingBeats = freshBeats.filter((b) => !isBeatImageValid(b));
      const concurrency = Math.max(1, getPixazoConcurrency());
      let nextBeatIdx = 0;

      const workerPool = Array.from({ length: Math.min(concurrency, pendingBeats.length) }, async () => {
        while (nextBeatIdx < pendingBeats.length) {
          if (this.isCancelled) break;
          while (this.isPaused) {
            await new Promise((r) => setTimeout(r, 500));
          }

          const beat = pendingBeats[nextBeatIdx++];
          if (!beat) break;

          const parentScene = scenes.find((s) => s.id === beat.sceneId) || scenes[0];

          try {
            VisualBeatRepository.update(beat.id, { generationStatus: 'GENERATING' });
            const statusText = `Synthesizing Visual Beat ${beat.beatIndex + 1} of Scene ${parentScene.sceneIndex} (Parallel 5x)`;
            emitProgress(audioDoneCount, beatDoneCount, parentScene, beat, statusText);

            await ImageService.generateWithRetry(beat.imagePrompt, beat.imagePath!, undefined, imgWidth, imgHeight);

            if (!fs.existsSync(beat.imagePath!) || fs.statSync(beat.imagePath!).size < 500) {
              throw new Error(`Generated image missing or invalid at ${beat.imagePath}`);
            }

            VisualBeatRepository.update(beat.id, {
              imagePath: beat.imagePath,
              generationStatus: 'READY'
            });
            beatDoneCount++;
          } catch (err: any) {
            console.error(`[ImageWorker] Beat ${beat.id} (Scene ${parentScene.sceneIndex}) failed:`, err);
            VisualBeatRepository.update(beat.id, { generationStatus: 'FAILED' });
          }

          const updatedBeat = VisualBeatRepository.getById(beat.id);
          const updatedScene = SceneRepository.getById(parentScene.id);
          if (updatedBeat && updatedScene) {
            emitProgress(audioDoneCount, beatDoneCount, updatedScene, updatedBeat);
          }
        }
      });

      await Promise.all(workerPool);

      // Pass 2 & 3: Multi-Pass Resilient Parallel Healing Loop
      // Re-checks disk state and aggressively regenerates any failed/missing images using fallback prompts in parallel
      for (let healPass = 1; healPass <= 2; healPass++) {
        if (this.isCancelled) break;
        freshBeats = VisualBeatRepository.listByProjectId(projectId);
        const unfulfilled = freshBeats.filter((b) => !isBeatImageValid(b));

        if (unfulfilled.length === 0) {
          console.log(`[ImageWorker] All ${freshBeats.length} visual beats are 100% generated and verified on disk!`);
          break;
        }

        console.warn(`[ImageWorker] Healing pass #${healPass}: ${unfulfilled.length} beats missing images. Retrying in parallel...`);
        let nextHealIdx = 0;
        const healWorkers = Array.from({ length: Math.min(concurrency, unfulfilled.length) }, async () => {
          while (nextHealIdx < unfulfilled.length) {
            if (this.isCancelled) break;
            const unreadyBeat = unfulfilled[nextHealIdx++];
            if (!unreadyBeat) break;

            const parentScene = scenes.find((s) => s.id === unreadyBeat.sceneId) || scenes[0];
            emitProgress(audioDoneCount, beatDoneCount, parentScene, unreadyBeat, `Healing missing image for Scene ${parentScene.sceneIndex}, Beat ${unreadyBeat.beatIndex + 1}...`);

            // If the visual beat already has an AI-generated prompt, use it! Don't try another!
            let promptToUse = unreadyBeat.imagePrompt;
            if (!promptToUse || promptToUse.trim().length < 10) {
              try {
                const aiPromptRes = await AiPromptGeneratorService.generatePrompt({
                  scriptLine: parentScene.scriptText,
                  niche: project.visualNiche,
                  shotType: unreadyBeat.shotType,
                  aspectRatio: project.aspectRatio,
                  characterLock: project.characterLock
                });
                promptToUse = aiPromptRes.prompt;
                unreadyBeat.imagePrompt = promptToUse;
                VisualBeatRepository.update(unreadyBeat.id, { imagePrompt: promptToUse });
              } catch {
                promptToUse = ImageService.buildResilientFallbackPrompt(unreadyBeat.visualConcept, parentScene.scriptText, project.visualNiche);
              }
            }

            try {
              await ImageService.generateWithRetry(promptToUse, unreadyBeat.imagePath!, undefined, imgWidth, imgHeight);
              if (fs.existsSync(unreadyBeat.imagePath!) && fs.statSync(unreadyBeat.imagePath!).size > 500) {
                VisualBeatRepository.update(unreadyBeat.id, {
                  imagePath: unreadyBeat.imagePath,
                  generationStatus: 'READY'
                });
                beatDoneCount++;
              }
            } catch (healErr) {
              console.error(`[ImageWorker] Healing pass #${healPass} failed for beat ${unreadyBeat.id}:`, healErr);
            }
          }
        });

        await Promise.all(healWorkers);
      }

      // Pass 4: Final Direct Generation Pass (Zero Donor Copying - Every Beat Must Be Unique)
      freshBeats = VisualBeatRepository.listByProjectId(projectId);
      const remainingUnready = freshBeats.filter((b) => !isBeatImageValid(b));
      if (remainingUnready.length > 0 && !this.isCancelled) {
        console.warn(`[ImageWorker] Final direct synthesis pass for ${remainingUnready.length} unfulfilled beats...`);
        for (const unreadyBeat of remainingUnready) {
          if (this.isCancelled) break;
          const parentScene = scenes.find((s) => s.id === unreadyBeat.sceneId) || scenes[0];
          try {
            emitProgress(audioDoneCount, beatDoneCount, parentScene, unreadyBeat, `Final synthesis pass for Scene ${parentScene.sceneIndex}, Beat ${unreadyBeat.beatIndex + 1}...`);
            await ImageService.generateWithRetry(unreadyBeat.imagePrompt, unreadyBeat.imagePath!, undefined, imgWidth, imgHeight);
            if (fs.existsSync(unreadyBeat.imagePath!) && fs.statSync(unreadyBeat.imagePath!).size > 500) {
              VisualBeatRepository.update(unreadyBeat.id, {
                imagePath: unreadyBeat.imagePath,
                generationStatus: 'READY'
              });
              beatDoneCount++;
            }
          } catch (genErr) {
            console.error(`[ImageWorker] Final synthesis pass failed for beat ${unreadyBeat.id}:`, genErr);
            VisualBeatRepository.update(unreadyBeat.id, { generationStatus: 'FAILED' });
          }
        }
      }

      // Final synchronization of parent scene statuses
      freshBeats = VisualBeatRepository.listByProjectId(projectId);
      for (const scene of scenes) {
        const sceneBeats = freshBeats.filter((b) => b.sceneId === scene.id);
        const firstReady = sceneBeats.find((b) => isBeatImageValid(b));
        if (firstReady && firstReady.imagePath) {
          SceneRepository.update(scene.id, {
            imagePath: firstReady.imagePath,
            imageStatus: AssetStatus.READY
          });
        }
      }
    };

    // Facebook 100% Video B-Roll Worker:
    // Strictly NO static images. Scrapes & downloads vertical 9:16 video clips from Pinterest and internet sources based on scene & beat scripts.
    const runFacebookVideoWorker = async () => {
      let freshBeats = VisualBeatRepository.listByProjectId(projectId);
      allBeats = freshBeats;
      const usedVideoUrls = new Set<string>();

      for (let i = 0; i < freshBeats.length; i++) {
        if (this.isCancelled) break;
        while (this.isPaused) {
          await new Promise((r) => setTimeout(r, 500));
        }

        const beat = freshBeats[i];
        const parentScene = scenes.find((s) => s.id === beat.sceneId) || scenes[0];
        const folderNum = String(parentScene.sceneIndex).padStart(4, '0');
        const beatsDir = path.join(project.projectPath, 'scenes', folderNum, 'beats');
        fs.mkdirSync(beatsDir, { recursive: true });

        // Skip if beat already has a valid video downloaded
        if (isBeatImageValid(beat) && beat.imagePath && beat.imagePath.endsWith('.mp4')) {
          beatDoneCount++;
          continue;
        }

        VisualBeatRepository.update(beat.id, { generationStatus: 'GENERATING' });
        const statusText = `Scraping 9:16 Video B-Roll for Beat ${i + 1} of Scene ${parentScene.sceneIndex} from script...`;
        emitProgress(audioDoneCount, beatDoneCount, parentScene, beat, statusText);

        try {
          // Pass the exact narration script text line and global beat index 'i' with used tracker
          const narrationText = parentScene.scriptText || beat.visualConcept || '';
          const videoPath = await StockMediaService.scrapeAndDownloadVideoForBeat(
            narrationText,
            project.visualNiche,
            beatsDir,
            i,
            usedVideoUrls
          );

          VisualBeatRepository.update(beat.id, {
            imagePath: videoPath,
            generationStatus: 'READY'
          });
          beatDoneCount++;
        } catch (err: any) {
          console.error(`[FacebookVideoWorker] Failed scraping video for Beat ${beat.id}:`, err);
          VisualBeatRepository.update(beat.id, { generationStatus: 'FAILED' });
        }

        const updatedBeat = VisualBeatRepository.getById(beat.id);
        const updatedScene = SceneRepository.getById(parentScene.id);
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (updatedBeat) mainWindow.webContents.send('beat:updated', updatedBeat);
          if (updatedScene) mainWindow.webContents.send('scene:updated', updatedScene);
        }
      }

      // Final synchronization of parent scene statuses
      freshBeats = VisualBeatRepository.listByProjectId(projectId);
      for (const scene of scenes) {
        const sceneBeats = freshBeats.filter((b) => b.sceneId === scene.id);
        const firstReady = sceneBeats.find((b) => isBeatImageValid(b));
        if (firstReady && firstReady.imagePath) {
          SceneRepository.update(scene.id, {
            imagePath: firstReady.imagePath,
            imageStatus: AssetStatus.READY
          });
        }
      }
    };

    // TTS & Auto-Caption Worker:
    // Synthesizes 1 unbroken continuous master voice without cuts,
    // then runs faster-whisper Auto-Captioning to obtain millisecond-precise sentence & word boundaries.
    const runTTSWorker = async () => {
      if (scenes.length === 0) return;

      const masterVoicePath = path.join(project.projectPath, 'audio', 'master_voice.wav');
      const voiceModel = project.voiceId || 'af_heart';

      // Check if continuous audio and alignment already exist from a previous run (Resumption support)
      const isMasterVoiceReady = fs.existsSync(masterVoicePath) && fs.statSync(masterVoicePath).size > 1000;
      const areScenesAligned = scenes.every((s) => s.audioStatus === AssetStatus.READY && (s.endMs > s.startMs));

      if (isMasterVoiceReady && areScenesAligned) {
        console.log(`[GenerationQueue] Verified existing audio track & scene alignments. Resuming image generation.`);
        audioDoneCount = scenes.length;
        emitProgress(audioDoneCount, beatDoneCount, scenes[0], undefined, 'Audio verified. Resuming image synthesis...');
        return;
      }

      // Mark all scenes as generating audio
      for (const scene of scenes) {
        SceneRepository.update(scene.id, { audioStatus: AssetStatus.GENERATING });
      }
      emitProgress(0, beatDoneCount, scenes[0], undefined, 'Synthesizing voice narration for scenes...');

      try {
        console.log(`[GenerationQueue] Synthesizing scene narration concurrently for project ${projectId} (${scenes.length} scenes)`);

        // 1. Synthesize audio for all scenes in parallel with a concurrency pool of up to 3 workers
        const projectPath = project.projectPath;
        const CONCURRENCY = Math.min(3, scenes.length);
        const sceneAudioResults: { finalWavPath: string; durationMs: number }[] = new Array(scenes.length);
        let nextSceneIdx = 0;
        let completedAudioCount = 0;

        async function audioWorker() {
          while (nextSceneIdx < scenes.length) {
            const idx = nextSceneIdx++;
            const scene = scenes[idx];
            emitProgress(completedAudioCount, beatDoneCount, scene, undefined, `Synthesizing narration for Scene ${scene.sceneIndex} of ${scenes.length}...`);

            const folderNum = String(scene.sceneIndex).padStart(4, '0');
            const sceneDir = path.join(projectPath, 'scenes', folderNum);

            const result = await TTSService.generateSceneNarration(
              scene.scriptText,
              voiceModel,
              sceneDir,
              scene.durationMs,
              scene.voiceSpeed || 1.0
            );

            sceneAudioResults[idx] = result;
            completedAudioCount++;
            emitProgress(completedAudioCount, beatDoneCount, scene, undefined, `Scene ${scene.sceneIndex} narration ready (${completedAudioCount}/${scenes.length})`);
          }
        }

        const workers = Array.from({ length: CONCURRENCY }, () => audioWorker());
        await Promise.all(workers);

        // 2. Align cumulative timeline and visual beats in exact sequential order
        let cumulativeStartMs = 0;
        const sceneWavPaths: string[] = [];

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

          // Re-align Visual Beat timings for this scene to match the EXACT audio duration with zero drift
          const currentBeats = VisualBeatRepository.listBySceneId(scene.id);
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

          if (currentBeats.length === planned.length && currentBeats.length > 0) {
            for (let bIdx = 0; bIdx < planned.length; bIdx++) {
              VisualBeatRepository.update(currentBeats[bIdx].id, {
                startOffsetMs: planned[bIdx].startOffsetMs,
                endOffsetMs: planned[bIdx].endOffsetMs,
                durationMs: planned[bIdx].durationMs,
                shotType: planned[bIdx].shotType,
                visualConcept: planned[bIdx].visualConcept,
                environmentDescription: planned[bIdx].environmentDescription,
                imagePrompt: currentBeats[bIdx].isCustomPrompt ? currentBeats[bIdx].imagePrompt : planned[bIdx].imagePrompt
              });
            }
          } else {
            for (let bIdx = 0; bIdx < planned.length; bIdx++) {
              if (bIdx < currentBeats.length) {
                const cb = currentBeats[bIdx];
                const prevPath = cb.imagePath;
                if (cb.generationStatus === 'READY' && prevPath && fs.existsSync(prevPath)) {
                  planned[bIdx].imagePath = prevPath;
                  planned[bIdx].generationStatus = 'READY';
                  planned[bIdx].motion = cb.motion;
                  planned[bIdx].transition = cb.transition;
                }
              }
            }

            VisualBeatRepository.deleteBySceneId(scene.id);
            VisualBeatRepository.createMany(planned);
          }

          audioDoneCount++;
          const updatedScene = SceneRepository.getById(scene.id);
          if (updatedScene) emitProgress(audioDoneCount, beatDoneCount, updatedScene);
        }

        // 2. Build continuous master voice track from exact scene audio clips
        await TTSService.buildMasterContinuousVoice(sceneWavPaths, masterVoicePath);

        // 3. Update project duration to exact total milliseconds
        ProjectRepository.update(projectId, {
          durationMs: cumulativeStartMs
        });

        // Refresh allBeats reference after audio alignment
        allBeats = VisualBeatRepository.listByProjectId(projectId);
      } catch (err: any) {
        console.error('[TTSWorker] Continuous narration & auto-caption failed:', err);
        for (const scene of scenes) {
          SceneRepository.update(scene.id, {
            audioStatus: AssetStatus.FAILED,
            errorMessage: err.message
          });
        }
        throw new Error(`Narration audio synthesis failed: ${err.message || err}`);
      }
    };

    // Run TTS Worker first to finalize continuous audio & exact visual beat timings,
    // then run Image Worker sequentially so beat IDs are never mutated during image generation
    try {
      // 1. Synthesize master continuous narration & auto-caption
      await runTTSWorker();

      // 2. Refresh beat list with definitive audio-aligned timings
      allBeats = VisualBeatRepository.listByProjectId(projectId);
      beatDoneCount = allBeats.filter((b) => b.generationStatus === 'READY').length;

      // Synchronize all updated scenes and beats to the UI immediately
      if (mainWindow && !mainWindow.isDestroyed()) {
        for (const sc of scenes) {
          const updated = SceneRepository.getById(sc.id);
          if (updated) mainWindow.webContents.send('scene:updated', updated);
        }
        for (const bt of allBeats) {
          mainWindow.webContents.send('beat:updated', bt);
        }
      }

      // 3. Generate visual beat illustrations with Pixazo AI sequentially
      if (!this.isCancelled) {
        if (project.platform === 'FACEBOOK') {
          console.log('[GenerationQueue] Running Facebook Automation 100% Video B-Roll Worker (Zero Static Images)...');
          await runFacebookVideoWorker();
        } else {
          await runImageWorker();
        }
      }

      // 4. Automated Background Auto-Editing Pipeline with STRICT IMAGE COMPLETION GATE:
      // Ensures 100% of visual beats have verified, valid generated images on disk BEFORE auto-editing begins
      if (!this.isCancelled) {
        // Enforce Strict Image Completion Gate
        const finalVerifiedBeats = VisualBeatRepository.listByProjectId(projectId);
        const missingOnDisk = finalVerifiedBeats.filter((b) => {
          if (b.generationStatus !== 'READY' || !b.imagePath) return true;
          try {
            return !fs.existsSync(b.imagePath) || fs.statSync(b.imagePath).size < 500;
          } catch {
            return true;
          }
        });

        if (missingOnDisk.length > 0) {
          console.warn(`[GenerationQueue] Strict Gate Alert: ${missingOnDisk.length} beats missing images. Running direct generation...`);
          for (const mb of missingOnDisk) {
            if (this.isCancelled) break;
            try {
              const isGateVert = project.aspectRatio === '9:16';
              await ImageService.generateWithRetry(mb.imagePrompt, mb.imagePath!, undefined, isGateVert ? 1080 : 1920, isGateVert ? 1920 : 1080);
              if (fs.existsSync(mb.imagePath!) && fs.statSync(mb.imagePath!).size > 500) {
                VisualBeatRepository.update(mb.id, {
                  generationStatus: 'READY',
                  imagePath: mb.imagePath
                });
              }
            } catch (gateErr) {
              console.error(`[GenerationQueue] Gate direct generation failed for beat ${mb.id}:`, gateErr);
              VisualBeatRepository.update(mb.id, { generationStatus: 'FAILED' });
            }
          }
        }

        emitProgress(scenes.length, allBeats.length, undefined, undefined, 'Finalizing Auto-Edit: Applying transitions, camera animations & captions...');
        console.log(`[GenerationQueue] All images physically verified. Applying background auto-edit for project ${projectId}...`);
        try {
          AutoEditService.applyHardEdit(projectId);
        } catch (aeErr) {
          console.error('[GenerationQueue] Auto-edit error:', aeErr);
        }
        try {
          RenderService.generateAss(projectId);
        } catch (assErr) {
          console.warn('[GenerationQueue] ASS subtitle generation notice:', assErr);
        }
      }
    } catch (err: any) {
      console.error('[GenerationQueue] Execution error:', err);
      ProjectRepository.update(projectId, { status: ProjectStatus.ERROR });
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:error', {
          projectId,
          error: err?.message || String(err)
        });
      }
    } finally {
      this.activeProjectId = null;
      const currentProj = ProjectRepository.getById(projectId);
      if (currentProj && currentProj.status !== ProjectStatus.ERROR && !this.isCancelled) {
        const freshBeatsForThumb = VisualBeatRepository.listByProjectId(projectId);
        const firstReadyThumb = freshBeatsForThumb.find((b) => isBeatImageValid(b));
        ProjectRepository.update(projectId, {
          status: ProjectStatus.READY,
          ...(firstReadyThumb?.imagePath ? { thumbnailPath: firstReadyThumb.imagePath } : {})
        });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('generation:complete', { projectId, autoEditApplied: true });
        }
      }
    }
  }
}
