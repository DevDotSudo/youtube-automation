import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/project.store';
import { EDGE_NEURAL_VOICES, VISUAL_NICHES } from '../../../shared/constants';

export const FacebookAutomationPage: React.FC = () => {
  const navigate = useNavigate();
  const { createProject, isLoading } = useProjectStore();

  const [title, setTitle] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<string>('stoic_philosophy');
  const [scriptText, setScriptText] = useState('');
  const [voiceId, setVoiceId] = useState('en-US-AndrewMultilingualNeural');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time Facebook Reel intelligence
  const stats = useMemo(() => {
    const text = scriptText.trim();
    if (!text) {
      return { words: 0, chars: 0, estSec: 0, estBeats: 0, reelType: 'Micro (15s)' };
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const estSec = Math.max(1, Math.round(words / 2.5));
    const estBeats = Math.max(2, Math.ceil(estSec / 3.5));
    let reelType = 'Reel (30s)';
    if (estSec > 60) reelType = 'Long Reel (60s+)';
    else if (estSec > 35) reelType = 'Standard Reel (45s)';
    else if (estSec <= 20) reelType = 'Viral Hook (15-20s)';

    return { words, chars: text.length, estSec, estBeats, reelType };
  }, [scriptText]);

  const currentNiche = useMemo(() => {
    return VISUAL_NICHES.find((n) => n.id === selectedNiche) || VISUAL_NICHES[0];
  }, [selectedNiche]);

  const handleApplyPreset = (sampleText: string, suggestedTitle: string, suggestedNiche?: string) => {
    setScriptText(sampleText);
    setTitle(suggestedTitle);
    if (suggestedNiche) {
      setSelectedNiche(suggestedNiche);
    }
  };

  const handleGenerateFacebookProject = async () => {
    const cleanScript = scriptText.trim();
    if (!cleanScript) {
      setErrorMessage('Please enter or select a narrative script for your Facebook Reel.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const projectTitle = title.trim() || `Facebook Reel: ${currentNiche.name} (${new Date().toLocaleDateString()})`;

      const newProject = await createProject({
        name: projectTitle,
        scriptContent: cleanScript,
        voiceId,
        visualNiche: selectedNiche,
        platform: 'FACEBOOK',
        aspectRatio: '9:16'
      });

      if (window.docuforge?.generation?.start) {
        await window.docuforge.generation.start(newProject.id);
      }

      navigate(`/project/${newProject.id}/generation`);
    } catch (err: any) {
      console.error('Failed to create Facebook project:', err);
      setErrorMessage(err.message || 'Failed to initialize Facebook video automation.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-10 w-full flex flex-col gap-6 select-none">
      {/* Top Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-[#1877F2] uppercase bg-[#1877F2]/10 px-2.5 py-0.5 rounded-full border border-[#1877F2]/30 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2] animate-pulse"></span>
              FACEBOOK AUTOMATION STUDIO
            </span>
            <span className="text-[#00e5ff] text-[10px] font-mono bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/30 font-semibold">
              9:16 VERTICAL REELS
            </span>
            <span className="text-[#34d399] text-[10px] font-mono bg-[#34d399]/10 px-2 py-0.5 rounded border border-[#34d399]/30 font-bold">
              100% VIDEO B-ROLL (ZERO STATIC IMAGES)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display flex items-center gap-2">
            Facebook Reels & Viral Video Pipeline
          </h1>
          <p className="text-xs text-[#918FA1] max-w-2xl leading-relaxed">
            Automated 9:16 Facebook Reels engine. Visuals are scraped directly from Pinterest & internet video sources based on your scene script with 0ms audio synchronization. Zero captions burned into video.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateFacebookProject}
            disabled={isSubmitting || isLoading || !scriptText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#0A57C2] text-white text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#1877F2]/25 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting || isLoading ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>Scraping & Synthesizing...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[17px]">play_circle</span>
                <span>Generate Facebook Video</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/25 text-[#FF6B6B] text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMessage}</span>
          </span>
          <button onClick={() => setErrorMessage(null)} className="hover:opacity-75">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {/* Main Grid Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script & Reel Configuration */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Project Title */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-mono text-[#918FA1] uppercase tracking-wider font-semibold">
              Reel Title
            </label>
            <input
              type="text"
              placeholder={`e.g., The Secret Stoic Rule for Unshakable Focus`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#101216] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#7D7A8B] focus:border-[#1877F2] focus:outline-none transition-all"
            />
          </div>

          {/* Script Text Input */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-[#918FA1] uppercase tracking-wider font-semibold">
                Reel Narration Script
              </label>
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#918FA1]">
                <span>{stats.words} words</span>
                <span>·</span>
                <span>~{stats.estSec}s</span>
                <span>·</span>
                <span className="text-[#1877F2] font-semibold">{stats.reelType}</span>
                <span>·</span>
                <span className="text-[#34d399] font-semibold">{stats.estBeats} Video Clips</span>
              </div>
            </div>

            <textarea
              rows={9}
              placeholder="Paste your script here... Each beat will trigger an intelligent internet & Pinterest video scrape matching the words."
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className="w-full bg-[#101216] border border-white/[0.08] rounded-xl p-3.5 text-xs text-white placeholder-[#7D7A8B] focus:border-[#1877F2] focus:outline-none leading-relaxed transition-all resize-none font-sans"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono text-[#7D7A8B] uppercase tracking-wider">
              Quick Viral Reel Presets
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'You earn more money…\n\nbut somehow, you’re still broke.\n\nHere’s why.\n\nEvery time your income goes up, your lifestyle goes up too.\n\nBetter phone. More food deliveries. More subscriptions. More things you don’t actually need.\n\nThis is called lifestyle inflation.\n\nThe trick is simple:\n\nWhen your income increases, don’t increase your spending at the same speed.\n\nSave the difference.\n\nInvest part of it.\n\nAnd keep your lifestyle below your income.\n\nGetting rich isn’t only about earning more.\n\nIt’s about keeping more.',
                    'Why You’re Still Broke Even When You Earn More',
                    'billionaire_mindset'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[#10B981]/40 text-[11px] text-[#C7C4D8] hover:text-white transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[13px] text-[#10B981]">trending_down</span>
                <span>Why You're Still Broke (38s)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'The ultra-wealthy do not trade time for money. They build leverage. Code, capital, and content work while you sleep. If you don\'t find a way to make money while you rest, you will work until the day you die. Change the vehicle, not just the effort.',
                    'The 1% Leverage Secret',
                    'billionaire_mindset'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[#10B981]/40 text-[11px] text-[#C7C4D8] hover:text-white transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[13px] text-[#10B981]">attach_money</span>
                <span>Billionaire Leverage (30s)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'Most people live in constant fear of what others think of them. Marcus Aurelius understood a profound truth two thousand years ago. When you detach your self-worth from external validation, you become genuinely invincible. The noise fades. Your focus sharpens. Master your mind, or someone else will.',
                    'Marcus Aurelius on True Invincibility',
                    'stoic_philosophy'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[#1877F2]/40 text-[11px] text-[#C7C4D8] hover:text-white transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[13px] text-[#D4AF37]">account_balance</span>
                <span>Stoic Invincibility (35s)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'In the darkest corner of the archives, a folder marked classified had remained untouched for thirty years. No one questioned why the lights flickered in room 402 until the tapes began to play on their own.',
                    'The Vault 402 Mystery',
                    'true_crime_noir'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[#1877F2]/40 text-[11px] text-[#C7C4D8] hover:text-white transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[13px] text-[#FF6B6B]">visibility_off</span>
                <span>Dark Noir Mystery (28s)</span>
              </button>
            </div>
          </div>

          {/* Voice Model Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-mono text-[#918FA1] uppercase tracking-wider font-semibold">
              Voice Narration (Cloud Neural Engine)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {EDGE_NEURAL_VOICES.slice(0, 6).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoiceId(v.id)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    voiceId === v.id
                      ? 'bg-[#1877F2]/15 border-[#1877F2] text-white shadow-sm shadow-[#1877F2]/15'
                      : 'bg-white/[0.02] border-white/[0.05] text-[#918FA1] hover:text-[#C7C4D8] hover:border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate">{v.label}</span>
                    {voiceId === v.id && (
                      <span className="material-symbols-outlined text-[14px] text-[#1877F2]">check_circle</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono opacity-70 truncate">{v.tone || v.gender}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Niches & 9:16 Video Scraper Engine Preview */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#918FA1] uppercase tracking-wider font-semibold">
              Visual Niches Selection
            </span>
            <span className="text-[10px] font-mono text-[#1877F2] bg-[#1877F2]/10 px-2 py-0.5 rounded border border-[#1877F2]/20 font-bold">
              {VISUAL_NICHES.length} NICHES
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
            {VISUAL_NICHES.map((niche) => {
              const isSelected = niche.id === selectedNiche;
              return (
                <button
                  key={niche.id}
                  type="button"
                  onClick={() => setSelectedNiche(niche.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#1877F2]/15 border-[#1877F2] shadow-sm shadow-[#1877F2]/15'
                      : 'bg-[#101216] border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${niche.color}25`, color: niche.color }}
                    >
                      <span className="material-symbols-outlined text-[17px]">{niche.icon}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate">{niche.name}</span>
                      <span className="text-[10px] text-[#918FA1] truncate">{niche.category}</span>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="text-[10px] font-mono font-bold text-[#1877F2] bg-[#1877F2]/20 px-2 py-0.5 rounded border border-[#1877F2]/30">
                      SELECTED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#7D7A8B]">{niche.badge || '9:16'}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Facebook Engine Specs Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#1877F2]/10 via-[#101216] to-[#0A57C2]/5 border border-[#1877F2]/25 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#1877F2] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                FACEBOOK REELS SPECIFICATIONS
              </span>
              <span className="text-[9px] font-mono text-[#34d399] font-bold">100% READY</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04] flex flex-col gap-0.5">
                <span className="text-[#918FA1]">Output Aspect Ratio</span>
                <span className="text-white font-bold">9:16 Vertical (1080x1920)</span>
              </div>
              <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04] flex flex-col gap-0.5">
                <span className="text-[#918FA1]">Visual Asset Type</span>
                <span className="text-[#00e5ff] font-bold">100% Scraped MP4 Videos</span>
              </div>
              <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04] flex flex-col gap-0.5">
                <span className="text-[#918FA1]">Subtitles / Captions</span>
                <span className="text-[#34d399] font-bold">0% Burned (Voice Only)</span>
              </div>
              <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04] flex flex-col gap-0.5">
                <span className="text-[#918FA1]">Export Metadata</span>
                <span className="text-[#FFB95F] font-bold">Caption + 3-5 Viral Tags</span>
              </div>
            </div>

            <p className="text-[10px] text-[#918FA1] leading-relaxed">
              When started, the pipeline scrapes Pinterest & stock video sources for each scene's beats, synchronizes voice narration with 0ms drift, and equips you with a ready-to-copy Facebook post pack.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookAutomationPage;
