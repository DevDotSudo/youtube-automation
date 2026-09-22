import { getMediaUrl } from '../utils/media';
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/project.store';
import { AssetStatus } from '../../../shared/enums';
import { Scene, VisualBeat } from '../../../shared/types';

export const GenerationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, currentScenes, currentBeats, fetchProject, updateSceneInList, updateBeatInList } = useProjectStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);
  const [activeBeat, setActiveBeat] = useState<VisualBeat | null>(null);
  const [liveStatusText, setLiveStatusText] = useState<string>('');
  const [totalBeatsCount, setTotalBeatsCount] = useState<number>(0);
  const [beatsDoneCount, setBeatsDoneCount] = useState<number>(0);
  const [scenesDoneCount, setScenesDoneCount] = useState<number>(0);
  const [isAutoEditing, setIsAutoEditing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<{ time: string; text: string }[]>([]);

  useEffect(() => {
    if (id) {
      fetchProject(id);
    }
  }, [id, fetchProject]);

  const addLog = (text: string) => {
    const time = new Date().toLocaleTimeString();
    setLogMessages((prev) => [...prev.slice(-40), { time, text }]);
  };

  useEffect(() => {
    if (!window.docuforge) return;

    const unsubProgress = window.docuforge.generation.onProgress((data) => {
      setIsGenerating(true);
      if (data.currentScene) {
        setActiveScene(data.currentScene);
        updateSceneInList(data.currentScene);
      }
      if (data.currentBeat) {
        setActiveBeat(data.currentBeat);
        updateBeatInList(data.currentBeat);
      }
      const statusMsg = data.statusText || (data as any).statusMessage;
      if (statusMsg) {
        setLiveStatusText(statusMsg);
        addLog(statusMsg);
      }
      const bTotal = data.totalBeats ?? (data as any).beatsTotal;
      if (bTotal !== undefined) setTotalBeatsCount(bTotal);
      const bDone = data.beatDone ?? (data as any).beatsDone;
      if (bDone !== undefined) setBeatsDoneCount(bDone);
      const sDone = data.sceneDone ?? (data as any).audioDone;
      if (sDone !== undefined) setScenesDoneCount(sDone);
    });

    const unsubComplete = window.docuforge.generation.onComplete(() => {
      setIsGenerating(false);
      setIsPaused(false);
      setIsAutoEditing(true);
      setErrorMessage(null);
      addLog('All assets generated! Assembling master production timeline...');
      if (id) fetchProject(id);
      setTimeout(() => {
        navigate(`/project/${id}/render`);
      }, 1600);
    });

    const unsubError = window.docuforge.generation.onError ? window.docuforge.generation.onError((data) => {
      setIsGenerating(false);
      setIsPaused(false);
      setErrorMessage(data.error || 'Generation pipeline encountered an error.');
      addLog(`⚠️ Generation halted: ${data.error || 'Unknown error'}`);
    }) : () => {};

    const unsubScene = window.docuforge.scenes.onSceneUpdated((scene) => {
      updateSceneInList(scene);
    });

    const unsubBeat = window.docuforge.beats?.onBeatUpdated ? window.docuforge.beats.onBeatUpdated((beat) => {
      updateBeatInList(beat);
    }) : () => {};

    return () => {
      unsubProgress();
      unsubComplete();
      if (unsubError) unsubError();
      unsubScene();
      unsubBeat();
    };
  }, [id, fetchProject, updateSceneInList, updateBeatInList]);

  const totalScenes = currentScenes.length || 1;
  const audioDone = useMemo(() => scenesDoneCount || currentScenes.filter((s) => s.audioStatus === AssetStatus.READY).length, [currentScenes, scenesDoneCount]);
  
  const totalBeats = useMemo(() => totalBeatsCount || currentBeats.length || (currentScenes.length * 2), [totalBeatsCount, currentBeats.length, currentScenes.length]);
  const beatsDone = useMemo(() => beatsDoneCount || currentBeats.filter((b) => b.generationStatus === 'READY').length, [beatsDoneCount, currentBeats]);

  const overallTotal = totalScenes + totalBeats;
  const overallDone = audioDone + beatsDone;
  const overallPercent = Math.min(100, Math.round((overallDone / overallTotal) * 100));

  const isComplete = audioDone === totalScenes && beatsDone === totalBeats && currentScenes.length > 0;

  const handleStart = async () => {
    if (!id || !window.docuforge) return;
    setErrorMessage(null);
    setIsGenerating(true);
    addLog('Pipeline started by user');
    await window.docuforge.generation.start(id);
  };

  const handleRetry = async () => {
    if (!id || !window.docuforge) return;
    setErrorMessage(null);
    setIsGenerating(true);
    setIsPaused(false);
    addLog('Resuming generation pipeline from checkpoint...');
    await window.docuforge.generation.start(id);
  };

  const handlePause = async () => {
    if (!window.docuforge) return;
    await window.docuforge.generation.pause();
    setIsPaused(true);
    addLog('Pipeline paused');
  };

  const handleResume = async () => {
    if (!window.docuforge) return;
    await window.docuforge.generation.resume();
    setIsPaused(false);
    addLog('Pipeline resumed');
  };

  const handleCancel = async () => {
    if (!window.docuforge) return;
    await window.docuforge.generation.cancel();
    setIsGenerating(false);
    setIsPaused(false);
    addLog('Pipeline cancelled');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 select-none relative bg-[#0A0C0F]">
      {/* Auto-Edit Finalizing Loading Overlay */}
      {isAutoEditing && (
        <div className="fixed inset-0 z-50 bg-[#0A0C0F]/95 backdrop-blur-md flex flex-col items-center justify-center gap-6 p-6 text-center animate-in fade-in duration-200">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-4 border-[#8781FF]/20 border-t-[#8781FF] animate-spin" />
            <span className="material-symbols-outlined text-[36px] text-[#8781FF] absolute">auto_fix_high</span>
          </div>
          <div className="flex flex-col gap-2 max-w-md">
            <h2 className="text-xl font-bold text-[#F0F0F3] tracking-tight font-display">Generation Complete</h2>
            <p className="text-xs text-[#918FA1] font-mono">
              Clips, camera motions, color filters, and synchronized audio tracks have been assembled. Opening Studio Editor...
            </p>
          </div>
        </div>
      )}

      {/* Error Alert Card */}
      {errorMessage && (
        <div className="p-4 mb-4 rounded-xl bg-[#2A0E12] border border-[#FF5449]/40 flex flex-col gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[#FF5449] text-[24px]">error</span>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">Generation Paused Due to Error</h4>
              <p className="text-xs text-[#FFB4AB] font-mono mt-1 break-all">{errorMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end">
            <button
              onClick={() => navigate('/projects')}
              className="px-3 py-1.5 rounded-lg bg-[#1A1C1F] hover:bg-[#282A2D] text-[#C7C4D8] text-xs font-mono border border-[#464555]/30 cursor-pointer"
            >
              Back to Projects
            </button>
            <button
              onClick={handleRetry}
              className="px-4 py-1.5 rounded-lg bg-[#4EDEA3] hover:bg-[#4EDEA3]/90 text-[#0C0E11] text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#4EDEA3]/20"
            >
              <span className="material-symbols-outlined text-[16px]">replay</span>
              Resume Pipeline
            </button>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-[#8781FF] uppercase bg-[#8781FF]/10 px-2.5 py-0.5 rounded-full border border-[#8781FF]/25 font-bold">
              Pixazo Parallel Generation Telemetry
            </span>
            <span className="text-[#918FA1] text-[11px] font-mono">
              Pixazo AI 5x Parallel Sliding-Queue Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F0F0F3] tracking-tight font-display">
            {currentProject?.name || 'Story Production'}
          </h1>
          <p className="text-xs text-[#C7C4D8]">
            Synthesizing continuous master narration and multi-beat Studio Ghibli hand-painted anime illustrations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {!isGenerating && !isComplete && (
            <button
              onClick={handleStart}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#8781FF] to-[#635BFF] text-[#0C0E11] font-bold text-xs tracking-wide shadow-md shadow-[#8781FF]/20 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              <span>Start Pipeline</span>
            </button>
          )}

          {isGenerating && !isPaused && (
            <button
              onClick={handlePause}
              className="h-9 px-4 rounded-xl bg-[#121419] hover:bg-[#181B22] text-[#FFB95F] font-semibold text-xs transition-colors border border-white/[0.08] flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">pause</span>
              <span>Pause</span>
            </button>
          )}

          {isGenerating && isPaused && (
            <button
              onClick={handleResume}
              className="h-9 px-4 rounded-xl bg-[#8781FF] text-[#0C0E11] font-bold text-xs hover:bg-[#9D98FF] transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#8781FF]/20"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              <span>Resume</span>
            </button>
          )}

          {isGenerating && (
            <button
              onClick={handleCancel}
              className="h-9 px-3.5 rounded-xl bg-white/[0.04] hover:bg-[#FF453A]/20 text-[#918FA1] hover:text-[#FF8577] text-xs font-mono transition-colors border border-white/[0.06] cursor-pointer"
            >
              Cancel
            </button>
          )}

          {/* Direct jump to editor */}
          <button
            onClick={() => navigate(`/project/${id}/render`)}
            className="h-9 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#C7C4D8] hover:text-white text-xs font-medium transition-colors border border-white/[0.06] flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">timeline</span>
            <span>Jump to Editor</span>
          </button>
        </div>
      </div>

      {/* Main Overall Progress HUD */}
      <div className="p-5 rounded-2xl bg-[#121419] border border-white/[0.06] shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8781FF]/15 flex items-center justify-center text-[#8781FF] shadow-sm shadow-[#8781FF]/20">
              <span className={`material-symbols-outlined text-[22px] ${isGenerating && !isPaused ? 'animate-spin' : ''}`}>
                {isComplete ? 'check_circle' : 'hourglass_top'}
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#F0F0F3] font-display">
                  {isComplete ? 'Asset Synthesis Complete' : isPaused ? 'Pipeline Paused' : 'Synthesizing Story Assets'}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#8781FF] bg-[#8781FF]/15 px-2 py-0.5 rounded-full border border-[#8781FF]/30">
                  {overallPercent}%
                </span>
              </div>
              <span className="text-xs text-[#918FA1] font-mono">
                {liveStatusText || 'Waiting for next queue event...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#7D7A8B]">
            <span>{audioDone}/{totalScenes} Scenes</span>
            <span>·</span>
            <span>{beatsDone}/{totalBeats} Beats</span>
          </div>
        </div>

        {/* Big Overall Progress Bar */}
        <div className="w-full h-2.5 bg-[#0C0E11] rounded-full overflow-hidden p-0.5 border border-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8781FF] via-[#4EDEA3] to-[#8781FF] transition-all duration-300 shadow-sm"
            style={{ width: `${overallPercent}%` }}
          ></div>
        </div>

        {/* Dual Progress Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Audio Narration Progress */}
          <div className="p-3.5 rounded-xl bg-[#0C0E11] border border-white/[0.05] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#E2E2E6] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#4EDEA3]">record_voice_over</span>
                Voiceover Narration
              </span>
              <span className="font-mono text-[11px] text-[#4EDEA3] font-bold">
                {audioDone} / {totalScenes} Cuts
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4EDEA3] rounded-full transition-all duration-300"
                style={{ width: `${totalScenes ? (audioDone / totalScenes) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Visual Art Beat Progress */}
          <div className="p-3.5 rounded-xl bg-[#0C0E11] border border-white/[0.05] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#E2E2E6] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8781FF]">palette</span>
                Dual-Engine Visual Beats
              </span>
              <span className="font-mono text-[11px] text-[#8781FF] font-bold">
                {beatsDone} / {totalBeats} Beats
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8781FF] rounded-full transition-all duration-300"
                style={{ width: `${totalBeats ? (beatsDone / totalBeats) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Workspace: Active Beat Inspector & Streaming Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Visual Beat Card */}
        <div className="flex flex-col gap-3 p-5 rounded-2xl bg-[#121419] border border-white/[0.06] shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#8781FF]">image</span>
              <span className="text-xs font-bold text-[#F0F0F3] font-display uppercase tracking-wider">
                Active Visual Beat Processing
              </span>
            </div>
            {activeBeat && (
              <span className="text-[10px] font-mono text-[#4EDEA3] bg-[#4EDEA3]/10 px-2 py-0.5 rounded border border-[#4EDEA3]/25 font-semibold">
                B{activeBeat.beatIndex + 1} · {(activeBeat.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          {/* Beat Image Preview */}
          <div className="w-full aspect-video bg-[#0C0E11] rounded-xl border border-white/[0.08] overflow-hidden relative shadow-lg flex items-center justify-center">
            {activeBeat?.generationStatus === 'READY' && activeBeat?.imagePath ? (
              <img
                key={`beat-preview-${activeBeat.id}-${activeBeat.imagePath}`}
                src={getMediaUrl(activeBeat.imagePath, true)}
                alt="Active Beat Preview"
                onError={(e) => {
                  const target = e.currentTarget;
                  setTimeout(() => {
                    if (activeBeat?.imagePath) {
                      target.src = getMediaUrl(activeBeat.imagePath, Date.now());
                    }
                  }, 500);
                }}
                className="w-full h-full object-cover animate-in fade-in duration-300"
              />
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center gap-2.5 text-[#8781FF]">
                <span className="material-symbols-outlined text-[36px] animate-spin text-[#C4C0FF]">progress_activity</span>
                <span className="text-xs font-mono font-semibold">Pixazo AI Parallel Synthesizing Scene...</span>
                <span className="text-[10px] font-mono text-[#918FA1]">
                  {liveStatusText || 'Dispatching concurrent requests to Pixazo cloud gateway'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-[#7D7A8B]">
                <span className="material-symbols-outlined text-[36px]">image</span>
                <span className="text-xs font-mono">Waiting for generation queue</span>
              </div>
            )}
          </div>

          {/* Scene narration context */}
          {activeScene && (
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#0C0E11] border border-white/[0.04]">
              <span className="text-[10px] font-mono uppercase text-[#7D7A8B]">
                Scene {String(activeScene.sceneIndex).padStart(2, '0')} Narration Script
              </span>
              <p className="text-xs text-[#E2E2E6] font-sans leading-relaxed line-clamp-2">
                &quot;{activeScene.scriptText}&quot;
              </p>
            </div>
          )}

          {/* Active Beat Details */}
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#0C0E11] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase text-[#7D7A8B]">Visual Prompt Concept</span>
            <p className="text-xs text-[#E2E2E6] font-mono leading-relaxed line-clamp-2">
              {activeBeat?.visualConcept || activeBeat?.imagePrompt || 'No prompt loaded yet.'}
            </p>
          </div>
        </div>

        {/* Live Streaming Execution Log Terminal */}
        <div className="flex flex-col gap-3 p-5 rounded-2xl bg-[#121419] border border-white/[0.06] shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#4EDEA3]">terminal</span>
              <span className="text-xs font-bold text-[#F0F0F3] font-display uppercase tracking-wider">
                Live Execution Stream
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#7D7A8B]">
              {logMessages.length} Events
            </span>
          </div>

          {/* Terminal Box */}
          <div className="flex-1 bg-[#0C0E11] rounded-xl p-3.5 border border-white/[0.06] overflow-y-auto max-h-[300px] flex flex-col gap-1.5 font-mono text-[11px]">
            {logMessages.length === 0 ? (
              <span className="text-[#525060] italic">Connecting to generation queue...</span>
            ) : (
              logMessages.map((log, index) => (
                <div key={index} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[#7D7A8B] shrink-0">[{log.time}]</span>
                  <span className="text-[#C7C4D8]">{log.text}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#7D7A8B] pt-1">
            <span>Pixazo 5x Parallel Engine with sliding queue and automatic retry</span>
            <span className="text-[#4EDEA3]">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
