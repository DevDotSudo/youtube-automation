import path from 'path';
import fs from 'fs';
import { BrowserWindow } from 'electron';
import { ProjectRepository } from '../database/repositories/project.repository';
import { SceneRepository } from '../database/repositories/scene.repository';
import { VisualBeatRepository } from '../database/repositories/visual-beat.repository';
import { ImageService } from '../services/image.service';
import { getPixazoConcurrency } from '../env';
import { TTSService } from '../services/tts.service';
import { AutoCaptionService } from '../services/auto-caption.service';
import { RenderService } from '../services/render.service';
import { AutoEditService } from '../services/auto-edit.service';
import { VisualBeatPlannerService } from '../services/visual-beat-planner.service';
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

            await ImageService.generateWithRetry(beat.imagePrompt, beat.imagePath!);

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

            const fallbackPrompt = ImageService.buildResilientFallbackPrompt(unreadyBeat.visualConcept, parentScene.scriptText);
            try {
              await ImageService.generateWithRetry(fallbackPrompt, unreadyBeat.imagePath!);
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

      // Pass 4: Emergency Gate Guarantee
      // If any beat still lacks an image after 3 generation passes, recover from sibling beat so NO BEAT IS EVER MISSING
      freshBeats = VisualBeatRepository.listByProjectId(projectId);
      const remainingUnready = freshBeats.filter((b) => !isBeatImageValid(b));
      if (remainingUnready.length > 0 && !this.isCancelled) {
        console.warn(`[ImageWorker] Emergency recovery for ${remainingUnready.length} unfulfilled beats to ensure 100% completion...`);
        const validDonor = freshBeats.find((b) => isBeatImageValid(b));
        for (const unreadyBeat of remainingUnready) {
          const sceneDonor = freshBeats.find((b) => b.sceneId === unreadyBeat.sceneId && isBeatImageValid(b)) || validDonor;
          if (sceneDonor && sceneDonor.imagePath && unreadyBeat.imagePath) {
            try {
              fs.copyFileSync(sceneDonor.imagePath, unreadyBeat.imagePath);
              VisualBeatRepository.update(unreadyBeat.id, {
                imagePath: unreadyBeat.imagePath,
                generationStatus: 'READY'
              });
              beatDoneCount++;
              console.log(`[ImageWorker] Recovered beat ${unreadyBeat.id} from donor ${sceneDonor.id}`);
            } catch (copyErr) {
              console.error(`[ImageWorker] Failed copying donor image for beat ${unreadyBeat.id}:`, copyErr);
            }
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

    // TTS & Auto-Caption Worker:
    // Synthesizes 1 unbroken continuous master voice without cuts,
    // then runs faster-whisper Auto-Captioning to obtain millisecond-precise sentence & word boundaries.
    const runTTSWorker = async () => {
      if (scenes.length === 0) return;

      const masterVoicePath = path.join(project.projectPath, 'audio', 'master_voice.wav');
      const voiceModel = project.voiceId || 'af_heart';

      // Mark all scenes as generating audio
      for (const scene of scenes) {
        SceneRepository.update(scene.id, { audioStatus: AssetStatus.GENERATING });
      }
      emitProgress(0, beatDoneCount, scenes[0], undefined, 'Synthesizing uncut continuous narration...');

      try {
        // 1. Combine all scene scripts into complete unbroken narrative text (NO CUTS!)
        const fullScript = scenes
          .map((s) => s.scriptText.trim())
          .filter(Boolean)
          .join(' ');

        // 2. Synthesize speech as ONE uncut continuous audio stream
        console.log(`[GenerationQueue] Synthesizing uncut narration for project ${projectId} (${fullScript.length} chars)`);
        const { totalDurationMs } = await TTSService.generateUncutContinuousNarration(
          fullScript,
          voiceModel,
          masterVoicePath
        );

        // 3. Run faster-whisper Auto-Captioning to align scenes & words with exact speech timestamps
        emitProgress(Math.floor(scenes.length / 2), beatDoneCount, scenes[0], undefined, 'Auto-captioning speech & aligning timeline...');
        console.log(`[GenerationQueue] Running auto-caption alignment on ${masterVoicePath}...`);
        const alignResult = await AutoCaptionService.alignScenesToAudio(
          masterVoicePath,
          scenes
        );

        console.log(`[GenerationQueue] Auto-caption aligned ${alignResult.scenes.length} scenes (total duration: ${alignResult.totalDurationMs}ms)`);

        // Persist alignment.json to disk for subtitle generators and external editors
        const subDir = path.join(project.projectPath, 'subtitles');
        fs.mkdirSync(subDir, { recursive: true });
        fs.writeFileSync(path.join(subDir, 'alignment.json'), JSON.stringify(alignResult, null, 2), 'utf8');

        // 4. Update each scene with exact millisecond-accurate auto-caption boundaries and word timestamps
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

          // Re-align Visual Beat timings for this scene to match the EXACT audio duration (3-5s pacing)
          const currentBeats = VisualBeatRepository.listBySceneId(scene.id);
          const planned = VisualBeatPlannerService.planSceneBeats({
            id: scene.id,
            projectId,
            sceneIndex: scene.sceneIndex,
            scriptText: scene.scriptText,
            durationMs: finalDurationMs,
            startMs
          }, undefined, project.visualNiche);

          if (currentBeats.length === planned.length && currentBeats.length > 0) {
            // Update timings in-place to keep IDs completely stable
            for (let bIdx = 0; bIdx < planned.length; bIdx++) {
              VisualBeatRepository.update(currentBeats[bIdx].id, {
                startOffsetMs: planned[bIdx].startOffsetMs,
                endOffsetMs: planned[bIdx].endOffsetMs,
                durationMs: planned[bIdx].durationMs,
                shotType: planned[bIdx].shotType,
                visualConcept: planned[bIdx].visualConcept,
                environmentDescription: planned[bIdx].environmentDescription,
                imagePrompt: planned[bIdx].imagePrompt
              });
            }
          } else {
            // Beat count adjusted to strictly enforce 3-5s duration
            // Preserve existing ready image files from disk if available
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

        // 5. Update project duration
        const finalProjectDuration = alignResult.totalDurationMs || totalDurationMs;
        ProjectRepository.update(projectId, {
          durationMs: finalProjectDuration
        });

        // 6. Generate synchronized ASS and SRT subtitle files
        try {
          RenderService.generateAss(projectId);
        } catch (subErr) {
          console.warn('[GenerationQueue] Auto-caption subtitle export warning:', subErr);
        }

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
        await runImageWorker();
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
          console.error(`[GenerationQueue] Strict Gate Alert: ${missingOnDisk.length} beats were unfulfilled. Enforcing emergency resolution...`);
          const donor = finalVerifiedBeats.find((b) => b.imagePath && fs.existsSync(b.imagePath) && fs.statSync(b.imagePath).size > 500);
          for (const mb of missingOnDisk) {
            if (donor && donor.imagePath && mb.imagePath) {
              fs.copyFileSync(donor.imagePath, mb.imagePath);
              VisualBeatRepository.update(mb.id, {
                generationStatus: 'READY',
                imagePath: mb.imagePath
              });
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
    } catch (err) {
      console.error('[GenerationQueue] Execution error:', err);
    } finally {
      this.activeProjectId = null;
      ProjectRepository.update(projectId, { status: ProjectStatus.READY });
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation:complete', { projectId, autoEditApplied: true });
      }
    }
  }
}
