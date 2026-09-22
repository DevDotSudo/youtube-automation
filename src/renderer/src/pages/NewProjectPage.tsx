import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/project.store';
import { EDGE_NEURAL_VOICES, VISUAL_NICHES } from '../../../shared/constants';


export const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { createProject, isLoading } = useProjectStore();

  const [title, setTitle] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<string>('stoic_philosophy');
  const [scriptText, setScriptText] = useState('');
  const [voiceId, setVoiceId] = useState('en-US-AndrewMultilingualNeural');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [beatCadence, setBeatCadence] = useState<'dynamic' | 'cinematic'>('dynamic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time script intelligence
  const stats = useMemo(() => {
    const text = scriptText.trim();
    if (!text) {
      return { words: 0, chars: 0, estSec: 0, estScenes: 0, estBeats: 0 };
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    // ~145 words per minute at 1.0x
    const estSec = Math.max(5, Math.round((words / (145 * voiceSpeed)) * 60));
    // Estimate ~20-30 words per scene
    const estScenes = Math.max(1, Math.ceil(words / 24));
    // Estimate beats (dynamic = 2-3 per scene, cinematic = 1-2)
    const multiplier = beatCadence === 'dynamic' ? 2.5 : 1.5;
    const estBeats = Math.max(1, Math.round(estScenes * multiplier));

    return { words, chars, estSec, estScenes, estBeats };
  }, [scriptText, voiceSpeed, beatCadence]);

  const currentNiche = useMemo(() => {
    return VISUAL_NICHES.find((n) => n.id === selectedNiche) || VISUAL_NICHES[0];
  }, [selectedNiche]);

  const formatEstTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const handleUploadFile = async () => {
    try {
      if (window.docuforge?.dialog?.openScriptFile) {
        const res = await window.docuforge.dialog.openScriptFile();
        if (!res.canceled && res.content) {
          setScriptText(res.content);
          if (!title && res.filePath) {
            const fileName = res.filePath.split(/[\\\/]/).pop()?.replace(/\.[^/.]+$/, '') || '';
            setTitle(fileName);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to open file:', err);
    }
  };

  const handleGenerateProject = async () => {
    const cleanScript = scriptText.trim();
    if (!cleanScript) {
      setErrorMessage('Please enter or select a story script before generating.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const projectTitle = title.trim() || `${currentNiche.name} Story ${new Date().toLocaleDateString()}`;

      const newProject = await createProject({
        name: projectTitle,
        scriptContent: cleanScript,
        voiceId,
        visualNiche: selectedNiche
      });

      if (window.docuforge?.generation?.start) {
        await window.docuforge.generation.start(newProject.id);
      }

      navigate(`/project/${newProject.id}/generation`);
    } catch (err: any) {
      console.error('Failed to generate project:', err);
      setErrorMessage(err.message || 'Failed to initialize project generation.');
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (scriptText.trim() && !isSubmitting) {
        handleGenerateProject();
      }
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 select-none" onKeyDown={handleKeyDown}>
      {/* Top Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-[#8781FF] uppercase bg-[#8781FF]/10 px-2.5 py-0.5 rounded-full border border-[#8781FF]/25 font-bold">
              Fast Story Production
            </span>
            <span className="text-[#918FA1] text-[11px] font-mono flex items-center gap-1.5">
              <span>16:9 Landscape</span>
              <span>·</span>
              <span className="text-white font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentNiche.color }}></span>
                {currentNiche.name}
              </span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F0F0F3] tracking-tight font-display flex items-center gap-2.5">
            <span>Create New Story Production</span>
          </h1>
          <p className="text-xs text-[#C7C4D8]">
            Input your narrative script and choose your visual niche. The pipeline automatically decomposes scenes, crafts high-fidelity art beats in your chosen style, and synthesizes master narration.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={handleGenerateProject}
          disabled={isSubmitting || isLoading || !scriptText.trim()}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#8781FF] to-[#635BFF] hover:from-[#9B96FF] hover:to-[#736BFF] text-[#0C0E11] font-bold text-xs tracking-wider shadow-lg shadow-[#8781FF]/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] shrink-0"
        >
          <span className={`material-symbols-outlined text-[19px] ${isSubmitting ? 'animate-spin' : ''}`}>
            {isSubmitting ? 'sync' : 'bolt'}
          </span>
          <span>{isSubmitting ? 'INITIALIZING ENGINES...' : 'INITIALIZE & GENERATE'}</span>
          <span className="hidden sm:inline-block text-[10px] font-mono opacity-60 bg-black/20 px-1.5 py-0.5 rounded">
            Ctrl+↵
          </span>
        </button>
      </div>

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 bg-[#FF453A]/10 border border-[#FF453A]/30 rounded-xl text-xs text-[#FF8577] flex items-center gap-2.5 animate-in fade-in duration-150">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMessage}</span>
        </div>
      )}
      {/* Visual Niche & Aesthetic Selector */}
      <div className="flex flex-col gap-3 p-5 rounded-2xl bg-[#121419] border border-white/[0.06] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: `${currentNiche.color}20`, color: currentNiche.color }}
            >
              <span className="material-symbols-outlined text-[20px]">{currentNiche.icon}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F0F0F3] font-mono flex items-center gap-2">
                <span>Select Visual Niche & Art Style</span>
                {currentNiche.badge && (
                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-tight"
                    style={{
                      backgroundColor: `${currentNiche.color}15`,
                      color: currentNiche.color,
                      border: `1px solid ${currentNiche.color}35`
                    }}
                  >
                    {currentNiche.badge}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-[#918FA1]">
                Active: <strong className="text-[#F0F0F3]">{currentNiche.name}</strong> — {currentNiche.description}
              </span>
            </div>
          </div>
        </div>

        {/* Niche Grid Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
          {VISUAL_NICHES.map((niche) => {
            const isSelected = niche.id === selectedNiche;
            return (
              <button
                key={niche.id}
                type="button"
                onClick={() => setSelectedNiche(niche.id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-gradient-to-b from-white/[0.08] to-transparent border-[#8781FF] shadow-md shadow-[#8781FF]/10 ring-1 ring-[#8781FF]'
                    : 'bg-[#0C0E11] hover:bg-[#181B22] border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                {/* Top Row: Icon + Badge */}
                <div className="flex items-center justify-between">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{ backgroundColor: `${niche.color}20`, color: niche.color }}
                  >
                    <span className="material-symbols-outlined text-[15px]">{niche.icon}</span>
                  </div>
                  {niche.badge && (
                    <span
                      className="text-[8px] font-mono px-1 py-0.2 rounded font-bold uppercase tracking-tighter"
                      style={{
                        backgroundColor: `${niche.color}15`,
                        color: niche.color
                      }}
                    >
                      {niche.badge.split(' ')[0]}
                    </span>
                  )}
                </div>

                {/* Name */}
                <span className={`text-[11px] font-semibold truncate ${isSelected ? 'text-white font-bold' : 'text-[#C7C4D8] group-hover:text-white'}`}>
                  {niche.name}
                </span>

                {/* Category */}
                <span className="text-[9px] font-mono text-[#7D7A8B] uppercase tracking-wider truncate">
                  {niche.category}
                </span>

                {/* Active Indicator Strip */}
                {isSelected && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ backgroundColor: niche.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Specifications & Audio Settings */}
        <div className="flex flex-col gap-5 bg-[#121419] p-5 rounded-2xl border border-white/[0.06] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h2 className="text-xs font-bold text-[#F0F0F3] flex items-center gap-2 uppercase tracking-wider font-mono">
              <span className="material-symbols-outlined text-[18px] text-[#8781FF]">tune</span>
              Production Settings
            </h2>
            <span className="text-[10px] font-mono text-[#4EDEA3] bg-[#4EDEA3]/10 px-1.5 py-0.5 rounded border border-[#4EDEA3]/20">
              1080p 30fps
            </span>
          </div>

          {/* Story Title Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#C7C4D8]">Story Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Whispers of the Bamboo Grove"
              className="w-full h-10 px-3.5 bg-[#0C0E11] text-[#E2E2E6] text-xs rounded-xl border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#8781FF] transition-all"
            />
          </div>

          {/* Voice Narrator Selector */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#C7C4D8]">Story Narrator Voice</label>
              <span className="text-[10px] font-mono text-[#8781FF]">Edge Neural</span>
            </div>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="h-10 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs rounded-xl border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#8781FF] cursor-pointer"
            >
              <optgroup label="Flagship Multilingual Storytellers">
                {EDGE_NEURAL_VOICES.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#121419]">
                    {v.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Voice Pace Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#C7C4D8]">Narration Pace</span>
              <span className="font-mono text-[#8781FF] font-semibold">{voiceSpeed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.85"
              max="1.25"
              step="0.05"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
              className="w-full accent-[#8781FF] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#7D7A8B]">
              <span>Contemplative (0.85x)</span>
              <span>Default (1.0x)</span>
              <span>Brisk (1.25x)</span>
            </div>
          </div>

          {/* Visual Beat Cadence Toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#C7C4D8]">Visual Beat Density</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBeatCadence('dynamic')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  beatCadence === 'dynamic'
                    ? 'bg-[#8781FF]/15 border-[#8781FF]/50 text-white'
                    : 'bg-[#0C0E11] border-white/[0.06] text-[#918FA1] hover:text-[#E2E2E6]'
                }`}
              >
                <span className="text-xs font-semibold">Dynamic Flow</span>
                <span className="text-[10px] opacity-75 font-mono">1 beat every 4–6s</span>
              </button>
              <button
                type="button"
                onClick={() => setBeatCadence('cinematic')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  beatCadence === 'cinematic'
                    ? 'bg-[#8781FF]/15 border-[#8781FF]/50 text-white'
                    : 'bg-[#0C0E11] border-white/[0.06] text-[#918FA1] hover:text-[#E2E2E6]'
                }`}
              >
                <span className="text-xs font-semibold">Cinematic Long</span>
                <span className="text-[10px] opacity-75 font-mono">1 beat every 7–10s</span>
              </button>
            </div>
          </div>

          {/* Dual Engine Info Callout */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-1.5 mt-auto">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-[#C4C0FF] font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-[#8781FF]">palette</span>
                Dual-Engine Enabled
              </span>
              <span className="text-[#4EDEA3] font-bold">READY</span>
            </div>
            <p className="text-[10px] text-[#918FA1] leading-relaxed">
              High-speed synthesis powered by <span className="text-white font-medium">Pixazo AI 5x Parallel Engine</span> with automatic concurrency queue and retry backoff.
            </p>
          </div>
        </div>

        {/* Right Column: Script Editor & Real-Time Intelligence */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Real-time Script Intelligence HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#121419] border border-white/[0.06]">
            <div className="flex flex-col p-2 bg-[#0C0E11] rounded-lg border border-white/[0.04]">
              <span className="text-[10px] font-mono text-[#918FA1]">Word Count</span>
              <span className="text-sm font-bold font-mono text-[#F0F0F3]">{stats.words}</span>
            </div>
            <div className="flex flex-col p-2 bg-[#0C0E11] rounded-lg border border-white/[0.04]">
              <span className="text-[10px] font-mono text-[#918FA1]">Estimated Duration</span>
              <span className="text-sm font-bold font-mono text-[#4EDEA3]">{formatEstTime(stats.estSec)}</span>
            </div>
            <div className="flex flex-col p-2 bg-[#0C0E11] rounded-lg border border-white/[0.04]">
              <span className="text-[10px] font-mono text-[#918FA1]">Estimated Scenes</span>
              <span className="text-sm font-bold font-mono text-[#8781FF]">{stats.estScenes}</span>
            </div>
            <div className="flex flex-col p-2 bg-[#0C0E11] rounded-lg border border-white/[0.04]">
              <span className="text-[10px] font-mono text-[#918FA1]">Visual Beats</span>
              <span className="text-sm font-bold font-mono text-[#FFB95F]">~{stats.estBeats}</span>
            </div>
          </div>

          {/* Script Input Canvas */}
          <div className="flex-1 flex flex-col bg-[#121419] rounded-2xl border border-white/[0.06] p-4 gap-3 shadow-xl min-h-[360px]">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#8781FF]">edit_note</span>
                <span className="text-xs font-semibold text-[#E2E2E6]">Story Script</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUploadFile}
                  className="h-7 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#C7C4D8] hover:text-white text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer border border-white/[0.06]"
                  title="Import plain text or markdown file"
                >
                  <span className="material-symbols-outlined text-[14px]">upload_file</span>
                  <span>Import File</span>
                </button>
                {scriptText && (
                  <button
                    type="button"
                    onClick={() => setScriptText('')}
                    className="h-7 px-2 rounded-lg bg-white/[0.04] hover:bg-[#FF453A]/20 text-[#918FA1] hover:text-[#FF8577] text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer"
                    title="Clear script content"
                  >
                    <span className="material-symbols-outlined text-[14px]">clear</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste or write your story script here...

Example:
Summer in Kyoto had arrived with quiet rain. In the hillside teahouse, steam curled from porcelain cups as lanterns flickered in the soft twilight. An old traveler smiled, sharing memories of forgotten river spirits..."
              className="flex-1 w-full bg-transparent text-[#E2E2E6] text-xs font-mono leading-relaxed resize-none focus:outline-none placeholder:text-[#525060]"
              rows={14}
            />

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10px] font-mono text-[#7D7A8B]">
              <span>Pro Tip: Press Ctrl + Enter anywhere to start generating immediately.</span>
              <span>{stats.chars} characters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
