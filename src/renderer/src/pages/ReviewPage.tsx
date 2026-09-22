import { getMediaUrl } from '../utils/media';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/project.store';
import { ApprovalStatus, VisualShotType } from '../../../shared/enums';
import { EDGE_NEURAL_VOICES } from '../../../shared/constants';

const SHOT_TYPE_OPTIONS: { value: VisualShotType; label: string; icon: string }[] = [
  { value: VisualShotType.WIDE_SCENE, label: 'Wide Scene', icon: 'crop_16_9' },
  { value: VisualShotType.MEDIUM_SCENE, label: 'Medium Scene', icon: 'person' },
  { value: VisualShotType.CLOSE_UP, label: 'Close Up', icon: 'face' },
  { value: VisualShotType.PROP_CLOSEUP, label: 'Prop Detail', icon: 'smartphone' },
  { value: VisualShotType.REACTION_SHOT, label: 'Reaction', icon: 'sentiment_satisfied' },
  { value: VisualShotType.CONCEPT_SHOT, label: 'Concept Shot', icon: 'lightbulb' },
  { value: VisualShotType.DIAGRAM, label: 'Diagram', icon: 'schema' },
  { value: VisualShotType.ENVIRONMENT_SHOT, label: 'Environment', icon: 'landscape' },
  { value: VisualShotType.KEYWORD_SCENE, label: 'Keyword Focus', icon: 'label' }
];

export const ReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentProject,
    currentScenes,
    currentBeats,
    activeSceneId,
    activeBeatId,
    fetchProject,
    updateBeat,
    autoEdit,
    regenerateBeatImage,
    replaceBeatImage,
    updateSceneInList,
    updateBeatInList,
    setActiveSceneId,
    setActiveBeatId,
    isLoading
  } = useProjectStore();

  const [filter, setFilter] = useState<'all' | 'unreviewed' | 'approved'>('all');
  const [search, setSearch] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRegeneratingBeat, setIsRegeneratingBeat] = useState(false);
  const [isAutoEditing, setIsAutoEditing] = useState(false);
  const [autoEditStep, setAutoEditStep] = useState('Analyzing script cadence & trigger keywords...');
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-AndrewMultilingualNeural');
  const [isReGeneratingVoice, setIsReGeneratingVoice] = useState<boolean>(false);
  const [voiceVersion, setVoiceVersion] = useState<number>(Date.now());
  const [editingConcept, setEditingConcept] = useState<string>('');
  const [editingPrompt, setEditingPrompt] = useState<string>('');
  const [editingKeyword, setEditingKeyword] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
    };
  }, []);

  useEffect(() => {
    if (id) {
      fetchProject(id);
      if (currentProject?.voiceId) {
        setSelectedVoice(currentProject.voiceId);
      }
    }
  }, [id, fetchProject]);

  useEffect(() => {
    if (!window.docuforge) return;
    const unsubScene = window.docuforge.scenes.onSceneUpdated((scene) => {
      updateSceneInList(scene);
    });
    const unsubBeat = window.docuforge.beats?.onBeatUpdated ? window.docuforge.beats.onBeatUpdated((beat) => {
      updateBeatInList(beat);
    }) : () => {};

    return () => {
      unsubScene();
      unsubBeat();
    };
  }, [updateSceneInList, updateBeatInList]);

  const activeScene = useMemo(() => {
    return currentScenes.find((s) => s.id === activeSceneId) || currentScenes[0] || null;
  }, [currentScenes, activeSceneId]);

  const sceneBeats = useMemo(() => {
    if (!activeScene) return [];
    return currentBeats.filter((b) => b.sceneId === activeScene.id);
  }, [currentBeats, activeScene]);

  const activeBeat = useMemo(() => {
    if (activeBeatId) {
      const found = currentBeats.find((b) => b.id === activeBeatId);
      if (found) return found;
    }
    return sceneBeats[0] || currentBeats[0] || null;
  }, [currentBeats, activeBeatId, sceneBeats]);

  useEffect(() => {
    if (activeBeat) {
      setEditingConcept(activeBeat.visualConcept);
      setEditingPrompt(activeBeat.imagePrompt);
      setEditingKeyword(activeBeat.keyword || '');
    }
  }, [activeBeat?.id]);

  const filteredScenes = useMemo(() => {
    return currentScenes
      .filter((s) => {
        if (filter === 'unreviewed') return s.approvalStatus === ApprovalStatus.UNREVIEWED || s.approvalStatus === ApprovalStatus.NEEDS_REVIEW;
        if (filter === 'approved') return s.approvalStatus === ApprovalStatus.APPROVED;
        return true;
      })
      .filter((s) => s.scriptText.toLowerCase().includes(search.toLowerCase()));
  }, [currentScenes, filter, search]);

  const approvedCount = useMemo(() => {
    return currentScenes.filter((s) => s.approvalStatus === ApprovalStatus.APPROVED).length;
  }, [currentScenes]);

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const millis = ms % 1000;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0').slice(0, 2)}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePlayToggle = () => {
    const audioPath = activeScene?.audioPath || (currentProject?.projectPath ? currentProject.projectPath + '/audio/master_voice.wav' : null);
    if (!audioPath) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const mediaUrl = getMediaUrl(`${audioPath}?v=${voiceVersion}`);
      const currentSrc = audioRef.current.src ? decodeURIComponent(audioRef.current.src) : '';

      if (!currentSrc.includes(decodeURIComponent(mediaUrl))) {
        audioRef.current.src = mediaUrl;
      }

      const startSec = (activeScene?.startMs || 0) / 1000;
      const endSec = (activeScene?.endMs || 999999) / 1000;
      audioRef.current.currentTime = startSec;

      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
      });

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.currentTime >= endSec) {
          audioRef.current.pause();
          setIsPlaying(false);
          audioRef.current.ontimeupdate = null;
        }
      };

      audioRef.current.onended = () => {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.ontimeupdate = null;
      };
    }
  };

  const handleRegenerateActiveBeat = async () => {
    if (!activeBeat) return;
    setIsRegeneratingBeat(true);
    try {
      await regenerateBeatImage(activeBeat.id, editingPrompt);
      showToast('Visual Beat regenerated successfully!');
    } catch (err) {
      console.error('Failed to regenerate beat image:', err);
      showToast('Generation error: ' + String(err));
    } finally {
      setIsRegeneratingBeat(false);
    }
  };

  const handleReplaceBeatFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeBeat || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const filePath = (file as any).path;
    if (filePath) {
      await replaceBeatImage(activeBeat.id, filePath);
      showToast('Custom beat image imported!');
    }
  };

  const handleSaveBeatEdits = async () => {
    if (!activeBeat) return;
    await updateBeat(activeBeat.id, {
      visualConcept: editingConcept,
      imagePrompt: editingPrompt,
      keyword: editingKeyword || undefined,
      keywordEnabled: Boolean(editingKeyword && editingKeyword.trim())
    });
    showToast('Beat configuration saved');
  };

  const handleEnhanceGhibliPrompt = () => {
    const stylePrefix = 'Studio Ghibli hand-painted gouache watercolor anime illustration, Hayao Miyazaki aesthetic, beautiful natural golden hour lighting, cinematic composition, crisp Japanese animation lines, nostalgic emotion. ';
    const cleanCurrent = editingPrompt.replace(/^Studio Ghibli.*?\.\s*/i, '').trim();
    const enhanced = stylePrefix + (cleanCurrent || editingConcept || 'peaceful countryside anime scenery');
    setEditingPrompt(enhanced);
    showToast('Added Studio Ghibli style descriptors');
  };

  const handleRegenerateVoice = async (voiceIdToUse?: string) => {
    const vId = voiceIdToUse || selectedVoice;
    if (!id) return;
    setIsReGeneratingVoice(true);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      await (window as any).docuforge.projects.regenerateAllVoice(id, vId);
      await fetchProject(id);
      setVoiceVersion(Date.now());
      showToast('Voice narration re-synthesized!');
    } catch (err: any) {
      console.error('Failed to regenerate voice:', err);
      alert('Voice synthesis failed: ' + (err.message || String(err)));
    } finally {
      setIsReGeneratingVoice(false);
    }
  };

  const handleApproveAllAndAutoEdit = async () => {
    if (!currentProject) return;
    setIsAutoEditing(true);

    try {
      setAutoEditStep('🎬 AI Master Animator: Analyzing 3-act narrative cadence & tone...');
      await new Promise(r => setTimeout(r, 300));

      setAutoEditStep('🎥 Choreographing multi-axis camera motion, video effects & transitions...');
      await autoEdit(currentProject.id);

      setAutoEditStep('✍️ Generating kinetic ASS subtitles with power-word highlights...');
      await new Promise(r => setTimeout(r, 350));

      setAutoEditStep('🎵 Harmonizing soundtrack & ducking audio curves (-18dB)...');
      await new Promise(r => setTimeout(r, 250));

      setAutoEditStep('✨ Launching CapCut timeline studio...');
      await new Promise(r => setTimeout(r, 200));

      navigate(`/project/${currentProject.id}/render`);
    } catch (err) {
      console.error('Auto edit failed:', err);
      setIsAutoEditing(false);
    }
  };

  if (isLoading || !currentProject) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-[#918FA1] gap-3">
        <span className="material-symbols-outlined text-[36px] animate-spin text-[#8781FF]">progress_activity</span>
        <span className="text-xs font-mono">Loading review workbench...</span>
      </div>
    );
  }

  const allApproved = approvedCount === currentScenes.length && currentScenes.length > 0;

  return (
    <div className="h-full flex flex-col select-none overflow-hidden relative bg-[#0A0C0F]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 right-6 z-50 bg-[#181B22] border border-[#4EDEA3]/40 text-[#4EDEA3] px-3.5 py-2 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Auto-Editing Loading Overlay */}
      {isAutoEditing && (
        <div className="absolute inset-0 bg-[#0A0C0F]/95 z-50 flex flex-col items-center justify-center gap-6 p-8 text-center animate-in fade-in duration-200 backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8781FF] to-[#635BFF] flex items-center justify-center text-[#0C0E11] shadow-2xl shadow-[#8781FF]/30 animate-bounce">
            <span className="material-symbols-outlined text-[32px]">auto_fix_high</span>
          </div>
          <div className="flex flex-col gap-2 max-w-md">
            <h2 className="text-xl font-bold text-[#F0F0F3] tracking-tight font-display">
              Assembling Production Timeline...
            </h2>
            <p className="text-xs text-[#918FA1] font-mono">
              {autoEditStep}
            </p>
          </div>
          <div className="w-72 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#8781FF] to-[#4EDEA3] rounded-full animate-pulse w-full"></div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Image Replacement */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleReplaceBeatFile}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Top Context Header */}
      <header className="h-14 bg-[#101216] border-b border-white/[0.06] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] text-[#918FA1] hover:text-white flex items-center justify-center transition-colors cursor-pointer mr-1"
            title="Return to Projects"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#8781FF] text-[20px]">movie</span>
            <span className="text-sm font-bold text-[#F0F0F3] font-display truncate max-w-xs">{currentProject.name}</span>
          </div>
          <div className="h-4 w-px bg-white/[0.08] hidden sm:block"></div>
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-semibold hidden md:inline-block ${
            allApproved
              ? 'bg-[#4EDEA3]/20 text-[#4EDEA3] border-[#4EDEA3]/40'
              : 'bg-[#FFB95F]/20 text-[#FFB95F] border-[#FFB95F]/40'
          }`}>
            {allApproved ? 'All Scenes Approved' : `Pending Approval (${currentScenes.length - approvedCount}/${currentScenes.length})`}
          </span>
          <div className="hidden lg:flex items-center gap-2.5 text-xs font-mono text-[#7D7A8B]">
            <span>{currentScenes.length} Scenes</span>
            <span>·</span>
            <span>{currentBeats.length} Visual Beats</span>
            <span>·</span>
            <span>Total: {formatMs(currentProject.durationMs)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Narrator Voice Selector */}
          <div className="flex items-center gap-2 bg-[#0C0E11] border border-white/[0.08] rounded-xl px-2.5 py-1">
            <span className="material-symbols-outlined text-[#8781FF] text-[16px]">record_voice_over</span>
            <select
              value={selectedVoice}
              onChange={(e) => {
                const newV = e.target.value;
                setSelectedVoice(newV);
                handleRegenerateVoice(newV);
              }}
              disabled={isReGeneratingVoice}
              className="bg-transparent text-xs text-[#E2E2E6] font-mono focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <optgroup label="Storyteller Voices">
                {EDGE_NEURAL_VOICES.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#121419]">
                    {v.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <button
              onClick={() => handleRegenerateVoice()}
              disabled={isReGeneratingVoice}
              className="h-6 px-2 rounded-lg bg-[#8781FF]/15 hover:bg-[#8781FF]/25 text-[#C4C0FF] text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
              title="Re-synthesize narration voiceover"
            >
              <span className={`material-symbols-outlined text-[12px] ${isReGeneratingVoice ? 'animate-spin' : ''}`}>
                {isReGeneratingVoice ? 'sync' : 'refresh'}
              </span>
              <span>{isReGeneratingVoice ? 'Rendering...' : 'Sync'}</span>
            </button>
          </div>

          {/* Master Auto-Assemble CTA */}
          <button
            onClick={handleApproveAllAndAutoEdit}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#8781FF] to-[#635BFF] hover:from-[#9B96FF] hover:to-[#736BFF] text-[#0C0E11] font-bold text-xs tracking-wider transition-all flex items-center gap-2 shadow-md shadow-[#8781FF]/20 active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">auto_fix_high</span>
            <span>⚡ AI HARD EDIT (ANIMATOR)</span>
          </button>
        </div>
      </header>

      {/* Main Review Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Scenes & Narrative Stream */}
        <div className="w-1/2 border-r border-white/[0.06] flex flex-col bg-[#0C0E11]/40 overflow-hidden">
          {/* Filter & Search Bar */}
          <div className="p-3 border-b border-white/[0.06] flex items-center gap-3 bg-[#101216]/60">
            <div className="flex items-center bg-[#0C0E11] rounded-xl px-3 py-1.5 border border-white/[0.08] flex-1">
              <span className="material-symbols-outlined text-[16px] text-[#918FA1] mr-2">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search scene narration..."
                className="bg-transparent text-xs text-[#E2E2E6] placeholder-[#7D7A8B] focus:outline-none w-full font-mono"
              />
            </div>

            <div className="flex items-center bg-[#0C0E11] p-0.5 rounded-xl border border-white/[0.08] text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filter === 'all' ? 'bg-[#8781FF]/20 text-[#8781FF] font-semibold' : 'text-[#918FA1]'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unreviewed')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filter === 'unreviewed' ? 'bg-[#8781FF]/20 text-[#8781FF] font-semibold' : 'text-[#918FA1]'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filter === 'approved' ? 'bg-[#8781FF]/20 text-[#8781FF] font-semibold' : 'text-[#918FA1]'}`}
              >
                Approved
              </button>
            </div>
          </div>

          {/* Scene List Rail */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {filteredScenes.map((scene) => {
              const beats = currentBeats.filter((b) => b.sceneId === scene.id);
              const isSelected = scene.id === activeScene?.id;

              return (
                <div
                  key={scene.id}
                  onClick={() => {
                    setActiveSceneId(scene.id);
                    if (beats.length > 0) setActiveBeatId(beats[0].id);
                  }}
                  className={`bg-[#121419] rounded-2xl border transition-all cursor-pointer p-4 flex flex-col gap-3.5 shadow-sm ${
                    isSelected
                      ? 'border-[#8781FF] ring-1 ring-[#8781FF]/50 bg-[#15181F]'
                      : 'border-white/[0.06] hover:border-white/[0.15]'
                  }`}
                >
                  {/* Scene Header */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-[#8781FF] bg-[#8781FF]/10 px-2 py-0.5 rounded border border-[#8781FF]/20">
                        SCENE {String(scene.sceneIndex).padStart(2, '0')}
                      </span>
                      <span className="text-[11px] font-mono text-[#7D7A8B]">
                        {formatMs(scene.startMs)} – {formatMs(scene.endMs)} ({(scene.durationMs / 1000).toFixed(1)}s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                        scene.approvalStatus === ApprovalStatus.APPROVED
                          ? 'bg-[#4EDEA3]/15 text-[#4EDEA3] border-[#4EDEA3]/30'
                          : 'bg-[#FFB95F]/15 text-[#FFB95F] border-[#FFB95F]/30'
                      }`}>
                        {scene.approvalStatus}
                      </span>
                    </div>
                  </div>

                  {/* Narration Script */}
                  <p className="text-xs text-[#E2E2E6] font-sans leading-relaxed">
                    &quot;{scene.scriptText}&quot;
                  </p>

                  {/* Visual Beats Row */}
                  <div className="flex flex-col gap-2 pt-2.5 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#7D7A8B]">
                      <span>VISUAL BEATS ({beats.length})</span>
                      <span>Continuous Audio Synchronized</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {beats.map((beat, bIdx) => {
                        const isBeatActive = beat.id === activeBeat?.id;
                        return (
                          <div
                            key={beat.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSceneId(scene.id);
                              setActiveBeatId(beat.id);
                            }}
                            className={`rounded-xl p-2 flex flex-col gap-1.5 bg-[#0C0E11] border transition-all cursor-pointer ${
                              isBeatActive
                                ? 'border-[#4EDEA3] ring-1 ring-[#4EDEA3]/40'
                                : 'border-white/[0.06] hover:border-white/[0.15]'
                            }`}
                          >
                            <div className="w-full h-20 bg-[#16181D] rounded-lg overflow-hidden relative">
                              {beat.generationStatus === 'READY' && beat.imagePath ? (
                                <img
                                  key={`rev-small-${beat.id}`}
                                  src={getMediaUrl(beat.imagePath, true)}
                                  alt={`Beat ${bIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : beat.generationStatus === 'GENERATING' ? (
                                <div className="w-full h-full flex items-center justify-center text-[#8781FF]">
                                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#37393D]">
                                  <span className="material-symbols-outlined text-[20px]">image</span>
                                </div>
                              )}
                              <span className="absolute top-1 left-1 bg-[#0C0E11]/85 backdrop-blur-sm text-[9px] font-mono px-1 rounded text-[#8781FF] border border-[#8781FF]/30">
                                B{bIdx + 1}
                              </span>
                              <span className="absolute bottom-1 right-1 bg-[#0C0E11]/85 backdrop-blur-sm text-[9px] font-mono px-1 rounded text-[#E2E2E6]">
                                {(beat.durationMs / 1000).toFixed(1)}s
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-[#918FA1]">
                              <span className="truncate max-w-[85px]">{beat.shotType}</span>
                              <span className="text-[#4EDEA3]">{beat.motion}</span>
                            </div>

                            <p className="text-[10px] text-[#C7C4D8] line-clamp-1">
                              {beat.visualConcept}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Visual Beat Inspector & Media Preview */}
        <div className="w-1/2 flex flex-col bg-[#101216]/60 overflow-y-auto p-6 gap-6">
          {activeBeat ? (
            <div className="flex flex-col gap-5">
              {/* Header Info */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#4EDEA3] font-bold bg-[#4EDEA3]/10 px-2 py-0.5 rounded border border-[#4EDEA3]/25">
                      VISUAL BEAT {(activeBeat.beatIndex + 1)} of {sceneBeats.length}
                    </span>
                    <span className="text-xs font-mono text-[#918FA1]">
                      · SCENE {activeScene?.sceneIndex} ({(activeBeat.durationMs / 1000).toFixed(1)}s)
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-[#F0F0F3] truncate max-w-md font-display">
                    {activeBeat.visualConcept}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayToggle}
                    className="h-8 px-3 rounded-xl bg-[#121419] hover:bg-[#181B22] text-[#C4C0FF] text-xs font-mono flex items-center gap-1.5 border border-white/[0.08] cursor-pointer transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{isPlaying ? 'Pause Voice' : 'Play Audio'}</span>
                  </button>
                </div>
              </div>

              {/* Large Image Preview Canvas */}
              <div className="w-full aspect-video bg-[#0C0E11] rounded-2xl border border-white/[0.08] overflow-hidden relative shadow-2xl group">
                {activeBeat.generationStatus === 'READY' && activeBeat.imagePath ? (
                  <img
                    key={`rev-large-${activeBeat.id}`}
                    src={getMediaUrl(activeBeat.imagePath, true)}
                    alt="Active Beat"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : activeBeat.generationStatus === 'GENERATING' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#8781FF] gap-2.5">
                    <span className="material-symbols-outlined text-[36px] animate-spin text-[#C4C0FF]">progress_activity</span>
                    <span className="text-xs font-mono">Synthesizing with Pixazo AI...</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#7D7A8B] gap-2.5">
                    <span className="material-symbols-outlined text-[36px]">image</span>
                    <span className="text-xs font-mono">No Image Generated Yet</span>
                  </div>
                )}

                {/* Overlays on Preview */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="bg-[#0C0E11]/85 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[11px] font-mono text-[#8781FF] border border-[#8781FF]/30 font-semibold">
                    {activeBeat.shotType}
                  </span>
                  <span className="bg-[#0C0E11]/85 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[11px] font-mono text-[#4EDEA3] border border-[#4EDEA3]/30">
                    {activeBeat.motion}
                  </span>
                </div>

                {activeBeat.keywordEnabled && activeBeat.keyword && (
                  <div className="absolute top-3 right-3 bg-[#FF453A]/90 backdrop-blur-md text-white text-xs font-mono font-bold px-3 py-1 rounded-lg border border-white/20 tracking-wider shadow-lg">
                    {activeBeat.keyword.toUpperCase()}
                  </div>
                )}

                {/* Canvas Action Bar */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 px-3 bg-[#0C0E11]/90 hover:bg-[#0C0E11] text-xs text-[#E2E2E6] rounded-xl border border-white/[0.15] flex items-center gap-1.5 cursor-pointer shadow-lg backdrop-blur-md transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">upload</span>
                    <span>Replace Image</span>
                  </button>
                  <button
                    onClick={handleRegenerateActiveBeat}
                    disabled={isRegeneratingBeat}
                    className="h-8 px-3 bg-gradient-to-r from-[#8781FF] to-[#635BFF] hover:from-[#9B96FF] hover:to-[#736BFF] text-xs text-[#0C0E11] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#8781FF]/30 disabled:opacity-50 transition-all active:scale-[0.98]"
                    title="Generate with Pixazo AI"
                  >
                    <span className={`material-symbols-outlined text-[15px] ${isRegeneratingBeat ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                    <span>{isRegeneratingBeat ? 'Synthesizing...' : 'Regenerate Beat'}</span>
                  </button>
                </div>
              </div>

              {/* Beat Settings Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Shot Type Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#918FA1]">SHOT FRAMING</label>
                  <select
                    value={activeBeat.shotType}
                    onChange={(e) => updateBeat(activeBeat.id, { shotType: e.target.value as VisualShotType })}
                    className="bg-[#0C0E11] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#8781FF] cursor-pointer"
                  >
                    {SHOT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Camera Motion Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#918FA1]">CAMERA MOTION</label>
                  <select
                    value={activeBeat.motion}
                    onChange={(e) => updateBeat(activeBeat.id, { motion: e.target.value as any })}
                    className="bg-[#0C0E11] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#8781FF] cursor-pointer"
                  >
                    <option value="STATIC">STATIC (Hard cut energy)</option>
                    <option value="PUSH_IN">PUSH_IN (100% → 103%)</option>
                    <option value="ZOOM_IN">ZOOM_IN (100% → 105%)</option>
                    <option value="ZOOM_OUT">ZOOM_OUT (105% → 100%)</option>
                    <option value="PUNCH_IN">PUNCH_IN (Emphasis)</option>
                    <option value="PAN_LEFT">PAN_LEFT (Drift)</option>
                    <option value="PAN_RIGHT">PAN_RIGHT (Drift)</option>
                  </select>
                </div>

                {/* Transition Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#918FA1]">TRANSITION</label>
                  <select
                    value={activeBeat.transition}
                    onChange={(e) => updateBeat(activeBeat.id, { transition: e.target.value as any })}
                    className="bg-[#0C0E11] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#8781FF] cursor-pointer"
                  >
                    <option value="CUT">HARD CUT (Default)</option>
                    <option value="DISSOLVE">SHORT DISSOLVE (150ms)</option>
                    <option value="FADE">FADE TO BLACK</option>
                  </select>
                </div>

                {/* Duration Control */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#918FA1]">DURATION (MS)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="100"
                      min="500"
                      value={activeBeat.durationMs}
                      onChange={(e) => updateBeat(activeBeat.id, { durationMs: parseInt(e.target.value, 10) || 1000 })}
                      className="bg-[#0C0E11] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#8781FF] flex-1 font-mono"
                    />
                    <span className="text-xs font-mono text-[#7D7A8B]">ms</span>
                  </div>
                </div>
              </div>

              {/* Keyword Overlay */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#918FA1]">KEYWORD OVERLAY TAG</label>
                  <span className="text-[10px] font-mono text-[#7D7A8B]">Appears in bottom-right</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingKeyword}
                    onChange={(e) => setEditingKeyword(e.target.value)}
                    onBlur={handleSaveBeatEdits}
                    placeholder="e.g. KAMAKURA SHRINE (leave blank to disable)"
                    className="flex-1 bg-[#0C0E11] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#8781FF] font-mono"
                  />
                  <button
                    onClick={handleSaveBeatEdits}
                    className="h-8 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#4EDEA3] text-xs font-mono transition-colors border border-white/[0.06] cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Concept & Prompt Editor */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#918FA1]">VISUAL CONCEPT</label>
                  <input
                    type="text"
                    value={editingConcept}
                    onChange={(e) => setEditingConcept(e.target.value)}
                    onBlur={handleSaveBeatEdits}
                    className="bg-[#0C0E11] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#8781FF]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#918FA1]">
                      PROMPT (Pixazo AI Parallel Engine)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEnhanceGhibliPrompt}
                        className="text-[11px] text-[#8781FF] font-mono hover:underline cursor-pointer flex items-center gap-1"
                        title="Inject Ghibli style descriptors"
                      >
                        <span className="material-symbols-outlined text-[12px]">auto_fix_normal</span>
                        <span>Enhance Style</span>
                      </button>
                      <button
                        onClick={handleSaveBeatEdits}
                        className="text-[11px] text-[#4EDEA3] font-mono hover:underline cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={editingPrompt}
                    onChange={(e) => setEditingPrompt(e.target.value)}
                    onBlur={handleSaveBeatEdits}
                    className="bg-[#0C0E11] border border-white/[0.08] rounded-xl p-3 text-xs text-[#C7C4D8] font-mono focus:outline-none focus:border-[#8781FF] resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#7D7A8B] gap-2.5">
              <span className="material-symbols-outlined text-[36px]">touch_app</span>
              <span className="text-xs font-mono">Select a visual beat to inspect and edit</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
