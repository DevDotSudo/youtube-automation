import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/project.store';
import { EDGE_NEURAL_VOICES } from '../../../shared/constants';


export const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { createProject, isLoading } = useProjectStore();

  const [title, setTitle] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [voiceId, setVoiceId] = useState('en-US-AndrewMultilingualNeural');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [beatCadence, setBeatCadence] = useState<'dynamic' | 'cinematic'>('dynamic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detect paired scenes (Script + Image Prompt)
  const pairedScenesCount = useMemo(() => {
    if (!scriptText.trim()) return 0;
    // Format 1: scene 1 (narration) \n prompt
    const matches1 = scriptText.match(/scene\s*\d+\s*\([^)]+\)/gi);
    if (matches1 && matches1.length > 0) return matches1.length;

    // Format 2: [Script] or Script: paired with [Prompt] or Prompt:
    const matches2 = scriptText.match(/\[?(?:Prompt|Image\s*Prompt)\]?[:.\s]/gi);
    if (matches2 && matches2.length > 0) return matches2.length;

    // Format 3: Pipe delimiter per line "script | prompt"
    const lines = scriptText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const pipeLines = lines.filter((l) => {
      const parts = l.split('|');
      return parts.length === 2 && parts[0].trim().length > 0 && parts[1].trim().length >= 3;
    });
    if (pipeLines.length > 0 && pipeLines.length === lines.length) return pipeLines.length;

    return 0;
  }, [scriptText]);

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
    // If paired scenes are present, use exact count
    const estScenes = pairedScenesCount > 0 ? pairedScenesCount : Math.max(1, Math.ceil(words / 24));
    // If paired scenes are present, each scene is paired 1:1 with a locked custom prompt
    const estBeats = pairedScenesCount > 0 ? pairedScenesCount : Math.max(1, Math.round(estSec / 4.5));

    return { words, chars, estSec, estScenes, estBeats };
  }, [scriptText, voiceSpeed, beatCadence, pairedScenesCount]);

  const handleInsertExample = () => {
    setTitle('Dawn of Humanity');
    setScriptText(
`scene 1 (Early humans struggled against harsh winters in small wandering groups.)
Cartoon stick figure Stone Age men huddled inside a dark cave, holding a burning torch, flat 2D animation style.

scene 2 (To survive, they developed the first stone hunting weapons.)
Cartoon stick figure Stone Age man knapping sharp flint tools on a boulder, holding crude stone hammer, flat 2D animation style.

scene 3 (Together, hunters cooperated across snowy plains to track large beasts.)
Cartoon stick figure Stone Age men tracking animal footprints in snow, holding stone spears, flat 2D animation style.

scene 4 (Back at the shelter, families gathered to cook food and share the warmth of fire.)
Cartoon stick figure Stone Age people gathered around an open crackling fire cooking food, flat 2D animation style.`
    );
  };

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
      const projectTitle = title.trim() || `Story Production ${new Date().toLocaleDateString()}`;

      const newProject = await createProject({
        name: projectTitle,
        scriptContent: cleanScript,
        voiceId,
        visualNiche: 'custom'
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
    <div className="p-10 w-full flex flex-col gap-6 select-none" onKeyDown={handleKeyDown}>
      {/* Top Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-[#8781FF] uppercase bg-[#8781FF]/10 px-2.5 py-0.5 rounded-full border border-[#8781FF]/25 font-bold">
              Fast Story Production
            </span>
            <span className="text-[#918FA1] text-[11px] font-mono flex items-center gap-1.5">
              <span>16:9 Widescreen</span>
              <span>·</span>
              <span className="text-[#4EDEA3] font-semibold flex items-center gap-1">
                Direct Script & Prompt Mode
              </span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F0F0F3] tracking-tight font-display flex items-center gap-2.5">
            <span>Create New Story Production</span>
          </h1>
          <p className="text-xs text-[#C7C4D8]">
            Input your spoken narrative script and custom text-to-image prompts. The pipeline synthesizes master voice narration, aligns subtitles, and renders your exact visual prompts with 100% fidelity.
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
                <span className="text-xs font-semibold text-[#E2E2E6]">Story Script & Prompts</span>
                {pairedScenesCount > 0 && (
                  <span className="text-[10px] font-mono text-[#4EDEA3] bg-[#4EDEA3]/15 px-2 py-0.5 rounded-full border border-[#4EDEA3]/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4EDEA3] animate-pulse"></span>
                    <span>{pairedScenesCount} Custom Prompts Locked</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsertExample}
                  className="h-7 px-2.5 rounded-lg bg-white/[0.04] hover:bg-[#8781FF]/20 text-[#C7C4D8] hover:text-[#8781FF] text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer border border-white/[0.06]"
                  title="Insert Script + Custom Prompt template example"
                >
                  <span className="material-symbols-outlined text-[13px]">lightbulb</span>
                  <span>Insert Example</span>
                </button>
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
              placeholder={`Paste or write your story script and image prompts here...

Supported Modes:
1. Script + Image Prompts:
   scene 1 (Early humans struggled against harsh winters in small wandering groups.)
   Cartoon stick figure Stone Age men huddled inside a dark cave, holding a burning torch, flat 2D animation style.

   scene 2 (To survive, they developed the first stone hunting weapons.)
   Cartoon stick figure Stone Age man knapping sharp flint tools on a boulder, holding crude stone hammer, flat 2D animation style.

2. Tag Style:
   [Script] Spoken narration line
   [Prompt] Your text-to-image prompt here

3. Single Line:
   Spoken narration line | Your text-to-image prompt here

4. Standard Narration Script:
   Paste narration text normally. Visual scenes and prompts are created automatically.`}
              className="flex-1 w-full bg-transparent text-[#E2E2E6] text-xs font-mono leading-relaxed resize-none focus:outline-none placeholder:text-[#525060]"
              rows={14}
            />

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10px] font-mono text-[#7D7A8B]">
              <span>
                {pairedScenesCount > 0
                  ? `✨ Custom prompt mode active: ${pairedScenesCount} scenes will use your exact prompts with 0 AI hallucinations.`
                  : 'Pro Tip: You can input Script Only, or pair Script + Prompt for 100% visual consistency.'}
              </span>
              <span>{stats.chars} characters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
