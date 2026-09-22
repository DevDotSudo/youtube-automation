import React, { useState, useEffect, useRef } from 'react';
import { getMediaUrl } from '../../utils/media';
import { useProjectStore } from '../../stores/project.store';

interface YouTubeMetadataPack {
  titles: string[];
  chaptersText: string;
  descriptionText: string;
  tagsText: string;
  totalDurationFormatted: string;
  sceneCount: number;
  suggestedThumbTexts?: string[];
  thumbnailHooks?: string[];
  thumbnailSubtitles?: string[];
  thumbnailPrompt?: string;
  existingThumbnailPath?: string;
  existingRawThumbnailPath?: string;
}

interface Props {
  projectId: string;
  onClose: () => void;
}

export const YouTubeExportModal: React.FC<Props> = ({ projectId, onClose }) => {
  const { fetchProject } = useProjectStore();
  const [data, setData] = useState<YouTubeMetadataPack | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'thumbnail' | 'titles' | 'chapters' | 'description' | 'tags'>('thumbnail');

  // Thumbnail State (Pure AI Artwork with AI-rendered Title Overlay - No Canvas Teaser Text)
  const [rawThumbnailPath, setRawThumbnailPath] = useState<string | null>(null);
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedHook, setSelectedHook] = useState('');
  const [selectedSubtitle, setSelectedSubtitle] = useState('');
  const [isSavingThumb, setIsSavingThumb] = useState(false);
  const [thumbSavedSuccess, setThumbSavedSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadMetadata = () => {
    if (window.docuforge?.youtube) {
      window.docuforge.youtube.generateMetadata(projectId).then(async (pack) => {
        setData(pack);
        const initialTitle = pack.titles && pack.titles.length > 0 ? pack.titles[0] : '';
        if (initialTitle && !selectedTitle) {
          setSelectedTitle(initialTitle);
        }
        if (pack.thumbnailHooks && pack.thumbnailHooks.length > 0 && !selectedHook) {
          setSelectedHook(pack.thumbnailHooks[0]);
        }
        if (pack.thumbnailSubtitles && pack.thumbnailSubtitles.length > 0 && !selectedSubtitle) {
          setSelectedSubtitle(pack.thumbnailSubtitles[0]);
        }
        if (pack.existingThumbnailPath) {
          setRawThumbnailPath(pack.existingThumbnailPath);
        } else if (pack.existingRawThumbnailPath) {
          // If only raw exists without text overlay, auto-composite the title onto it
          if (window.docuforge?.youtube?.updateThumbnailTitle && initialTitle) {
            try {
              const outPath = await window.docuforge.youtube.updateThumbnailTitle(projectId, initialTitle);
              setRawThumbnailPath(outPath);
              fetchProject(projectId);
              return;
            } catch {}
          }
          setRawThumbnailPath(pack.existingRawThumbnailPath);
        }
      }).catch(console.error);
    }
  };

  // Let AI image generator render thumbnail with large hook, Ghibli story subtitle, and authentic calligraphy
  const handleApplyTitle = async (titleOverride?: string, hookOverride?: string, subtitleOverride?: string) => {
    const titleToUse = (titleOverride !== undefined ? titleOverride : selectedTitle).trim();
    const hookToUse = (hookOverride !== undefined ? hookOverride : selectedHook).trim();
    const subToUse = (subtitleOverride !== undefined ? subtitleOverride : selectedSubtitle).trim();
    if (!titleToUse && !hookToUse && !subToUse) return;
    handleGenerateThumbnail(titleToUse, hookToUse, subToUse);
  };

  useEffect(() => {
    loadMetadata();
  }, [projectId]);

  // Generate or regenerate YouTube thumbnail with large hook (~1/4 image size) and Ghibli story subtitle
  const handleGenerateThumbnail = async (titleOverride?: string, hookOverride?: string, subtitleOverride?: string) => {
    if (!window.docuforge?.youtube?.generateThumbnail) return;
    setIsGeneratingThumb(true);
    try {
      const titleToUse = titleOverride !== undefined ? titleOverride : selectedTitle;
      const hookToUse = hookOverride !== undefined ? hookOverride : selectedHook;
      const subToUse = subtitleOverride !== undefined ? subtitleOverride : selectedSubtitle;
      const outPath = await window.docuforge.youtube.generateThumbnail(
        projectId,
        undefined,
        titleToUse || undefined,
        hookToUse || undefined,
        subToUse || undefined
      );
      setRawThumbnailPath(outPath);
      fetchProject(projectId);
    } catch (err) {
      console.error('Failed to generate thumbnail:', err);
    } finally {
      setIsGeneratingThumb(false);
    }
  };

  // Auto-generate initial thumbnail if none exists
  useEffect(() => {
    if (!rawThumbnailPath && !isGeneratingThumb && activeTab === 'thumbnail') {
      handleGenerateThumbnail();
    }
  }, [activeTab]);

  // Render thumbnail canvas with pure AI-generated artwork (NO canvas teaser text overlay)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const drawCleanCanvas = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (rawThumbnailPath) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } else {
        // Aesthetic Ghibli twilight placeholder
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#1A1C1F');
        grad.addColorStop(1, '#0B0D10');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    if (rawThumbnailPath) {
      img.src = getMediaUrl(rawThumbnailPath, true);
      img.onload = drawCleanCanvas;
      if (img.complete) {
        drawCleanCanvas();
      }
    } else {
      drawCleanCanvas();
    }
  }, [rawThumbnailPath]);

  // Save Thumbnail (Download + write to project output/thumbnail.png)
  const handleSaveThumbnail = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSavingThumb(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');

      // Save to project output folder and set as official project image
      if (window.docuforge?.youtube?.saveThumbnail) {
        await window.docuforge.youtube.saveThumbnail(projectId, dataUrl);
        fetchProject(projectId);
      }

      // Trigger browser instant download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `YouTube_Thumbnail_${projectId.slice(0, 6)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setThumbSavedSuccess(true);
      setTimeout(() => setThumbSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save thumbnail:', err);
    } finally {
      setIsSavingThumb(false);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000]/80 backdrop-blur-md p-4 select-none">
        <div className="bg-[#1A1C1F] p-6 rounded-2xl border border-[#464555]/30 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#8781FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-[#918FA1]">Generating YouTube SEO & Thumbnail Pack...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000]/80 backdrop-blur-md p-4 select-none font-sans">
      <div className="bg-[#111317] border border-[#464555]/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 border-b border-[#464555]/30 px-6 flex items-center justify-between bg-[#141619] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF4D4D]/20 border border-[#FF4D4D]/40 flex items-center justify-center text-[#FF4D4D]">
              <span className="material-symbols-outlined text-[20px]">smart_display</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#E2E2E6] flex items-center gap-2">
                YouTube Ready Pack
                <span className="text-[10px] font-mono font-bold bg-[#FF4D4D]/20 text-[#FF4D4D] px-2 py-0.5 rounded-full border border-[#FF4D4D]/30">
                  EXPORT READY
                </span>
              </h2>
              <p className="text-[11px] font-mono text-[#918FA1]">
                High-CTR AI Thumbnail • Viral Titles • Clean Description • Chapters
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#1E2023] flex items-center justify-center text-[#918FA1] hover:text-[#E2E2E6] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#464555]/30 bg-[#0C0E11] px-6 gap-2 shrink-0">
          {[
            { id: 'thumbnail', label: 'SEO Thumbnail', icon: 'image' },
            { id: 'titles', label: 'Viral Titles', icon: 'title' },
            { id: 'chapters', label: 'Chapters', icon: 'format_list_numbered' },
            { id: 'description', label: 'Clean Description', icon: 'description' },
            { id: 'tags', label: 'Tags & SEO', icon: 'tag' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#FF4D4D] text-[#E2E2E6] bg-[#141619]/60'
                  : 'border-transparent text-[#918FA1] hover:text-[#E2E2E6] hover:bg-[#141619]/30'
              }`}
            >
              <span className={`material-symbols-outlined text-[16px] ${activeTab === tab.id ? 'text-[#FF4D4D]' : ''}`}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 1. SEO THUMBNAIL TAB (Clean AI Artwork with embedded title overlay) */}
          {activeTab === 'thumbnail' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* 16:9 Canvas Preview */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#464555]/40 bg-[#000] shadow-2xl flex items-center justify-center group">
                    <canvas
                      ref={canvasRef}
                      width={1280}
                      height={720}
                      className="w-full h-full object-contain"
                    />

                    {isGeneratingThumb && (
                      <div className="absolute inset-0 bg-[#000]/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-3 border-[#4EDEA3] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-mono text-[#E2E2E6]">Generating Pure AI Thumbnail Artwork (No Text Overlay)...</p>
                        <p className="text-[11px] font-mono text-[#918FA1]">Pixazo AI (1280x720 Widescreen)</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#918FA1]">
                    <span>Resolution: 1280 × 720 (YouTube Standard 16:9)</span>
                    <span className="text-[#4EDEA3] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4EDEA3]"></span>
                      Clean Artwork Mode (No Text Overlay)
                    </span>
                  </div>
                </div>

                {/* AI Title Controls (No Canvas Teaser Text) */}
                <div className="bg-[#1A1C1F] p-4 rounded-xl border border-[#464555]/30 space-y-4 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#E2E2E6] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#4EDEA3]">auto_awesome</span>
                      AI Title Overlay
                    </span>
                    <button
                      onClick={() => handleGenerateThumbnail()}
                      disabled={isGeneratingThumb}
                      className="px-2.5 py-1 rounded-lg bg-[#282A2D] hover:bg-[#34373C] text-[#4EDEA3] text-[11px] font-mono flex items-center gap-1 border border-[#4EDEA3]/30 disabled:opacity-50 cursor-pointer transition-colors"
                      title="Regenerate AI thumbnail with clean artwork"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      Redesign AI Artwork
                    </button>
                  </div>

                  {/* Diffusion Engine Info */}
                  <div className="p-2.5 bg-[#0C0E11] rounded-lg border border-[#464555]/30 text-[11px] text-[#918FA1] leading-relaxed">
                    <span className="text-[#4EDEA3] font-semibold">Pixazo AI Gateway:</span> Generates pure 16:9 widescreen artwork with zero text overlay, keeping the image cinematic, clean, and visually captivating.
                  </div>

                  {/* High-CTR Hook Input (~1/4 of Image) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#4EDEA3] flex items-center gap-1 font-bold">
                        <span className="material-symbols-outlined text-[13px]">bolt</span>
                        Thumbnail Theme / Hook Concept:
                      </label>
                      <span className="text-[9px] font-mono text-[#918FA1]">Eye-Catchy & Bold</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedHook}
                        onChange={(e) => setSelectedHook(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleApplyTitle(undefined, selectedHook); }}
                        placeholder="e.g. NEVER LOOK BACK"
                        className="flex-1 bg-[#0C0E11] border border-[#4EDEA3]/50 rounded-lg px-3 py-2 text-xs font-black uppercase text-[#4EDEA3] tracking-wide focus:outline-none focus:border-[#4EDEA3]"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyTitle(undefined, selectedHook)}
                        disabled={isGeneratingThumb || !selectedHook.trim()}
                        className="px-3 py-2 rounded-lg bg-[#4EDEA3] hover:bg-[#4EDEA3]/80 text-[#0C0E11] text-xs font-black cursor-pointer disabled:opacity-50 transition-all shrink-0 uppercase tracking-wide"
                        title="Generate clean thumbnail artwork for this concept"
                      >
                        Generate
                      </button>
                    </div>

                    {/* Content-Tailored Hook Chips */}
                    {data?.thumbnailHooks && data.thumbnailHooks.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {data.thumbnailHooks.map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => {
                              setSelectedHook(h);
                              handleApplyTitle(undefined, h);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                              selectedHook === h
                                ? 'bg-[#4EDEA3] text-[#0C0E11] border-[#4EDEA3] shadow-md'
                                : 'bg-[#0C0E11] text-[#918FA1] border-[#464555]/30 hover:border-[#4EDEA3]/50 hover:text-white'
                            }`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ghibli Story Subtitle ("A story about...") */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#FFB95F] flex items-center gap-1 font-bold">
                        <span className="material-symbols-outlined text-[13px]">history_edu</span>
                        Story Narrative / Atmosphere:
                      </label>
                      <span className="text-[9px] font-mono text-[#918FA1]">Narrative Tone</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedSubtitle}
                        onChange={(e) => setSelectedSubtitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleApplyTitle(undefined, undefined, selectedSubtitle); }}
                        placeholder="e.g. A story about a lonely journey along the sea"
                        className="flex-1 bg-[#0C0E11] border border-[#FFB95F]/50 rounded-lg px-3 py-2 text-xs italic text-[#FFDFB0] focus:outline-none focus:border-[#FFB95F]"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyTitle(undefined, undefined, selectedSubtitle)}
                        disabled={isGeneratingThumb || !selectedSubtitle.trim()}
                        className="px-3 py-2 rounded-lg bg-[#FFB95F]/20 hover:bg-[#FFB95F]/30 text-[#FFB95F] text-xs font-bold border border-[#FFB95F]/50 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                        title="Apply Story Atmosphere"
                      >
                        Apply
                      </button>
                    </div>

                    {/* Story Subtitle Chips */}
                    {data?.thumbnailSubtitles && data.thumbnailSubtitles.length > 0 && (
                      <div className="flex flex-col gap-1 pt-0.5">
                        {data.thumbnailSubtitles.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setSelectedSubtitle(s);
                              handleApplyTitle(undefined, undefined, s);
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] text-left italic transition-all cursor-pointer border flex items-center justify-between ${
                              selectedSubtitle === s
                                ? 'bg-[#FFB95F]/15 text-[#FFB95F] border-[#FFB95F]/60 font-medium'
                                : 'bg-[#0C0E11] text-[#918FA1] border-[#464555]/30 hover:border-[#FFB95F]/40 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{s}</span>
                            {selectedSubtitle === s && (
                              <span className="material-symbols-outlined text-[13px] text-[#FFB95F] shrink-0">check</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Content Title Input */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#918FA1]">
                        Video Content Title:
                      </label>
                      <button
                        type="button"
                        onClick={() => handleApplyTitle()}
                        disabled={isGeneratingThumb || !selectedTitle.trim()}
                        className="text-[10px] font-mono text-[#4EDEA3] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[12px]">done</span>
                        Update Title
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedTitle}
                        onChange={(e) => setSelectedTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleApplyTitle(); }}
                        placeholder="e.g. The Wind's Quiet Passenger"
                        className="flex-1 bg-[#0C0E11] border border-[#464555]/40 rounded-lg px-3 py-2 text-xs font-bold text-[#E2E2E6] focus:outline-none focus:border-[#4EDEA3]"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyTitle()}
                        disabled={isGeneratingThumb || !selectedTitle.trim()}
                        className="px-3 py-2 rounded-lg bg-[#4EDEA3]/20 hover:bg-[#4EDEA3]/30 text-[#4EDEA3] text-xs font-bold border border-[#4EDEA3]/40 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
                        title="Update title and regenerate"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Viral Title Selection */}
                  {data?.titles && data.titles.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#918FA1]">
                        Select Title & Regenerate:
                      </label>
                      <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
                        {data.titles.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setSelectedTitle(t);
                              handleApplyTitle(t);
                            }}
                            className={`p-2 rounded-lg text-left text-[11px] transition-all cursor-pointer border flex items-center justify-between ${
                              selectedTitle === t
                                ? 'bg-[#4EDEA3]/15 text-[#4EDEA3] border-[#4EDEA3]/60 font-semibold shadow-sm'
                                : 'bg-[#0C0E11] text-[#C7C4D8] border-[#464555]/30 hover:border-[#464555]/60 hover:text-white'
                            }`}
                          >
                            <span className="truncate pr-2">{t}</span>
                            {selectedTitle === t && (
                              <span className="material-symbols-outlined text-[14px] text-[#4EDEA3] shrink-0">check</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save Thumbnail Button */}
                  <div className="pt-2 border-t border-[#464555]/30">
                    <button
                      onClick={handleSaveThumbnail}
                      disabled={isSavingThumb || isGeneratingThumb || !rawThumbnailPath}
                      className="w-full h-10 rounded-xl bg-gradient-to-r from-[#4EDEA3] to-[#00A572] hover:opacity-95 text-[#0C0E11] font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {thumbSavedSuccess ? 'check_circle' : 'file_download'}
                      </span>
                      {thumbSavedSuccess ? 'Saved as Project Image & Downloaded!' : isSavingThumb ? 'Saving...' : 'Save 1280x720 & Set as Project Image'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. VIRAL TITLES TAB */}
          {activeTab === 'titles' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#918FA1] uppercase tracking-wider">
                  Script-Grounded High-CTR Title Options (Algorithm & Click-Tested)
                </span>
                <span className="text-[10px] font-mono text-[#4EDEA3] bg-[#4EDEA3]/10 px-2 py-0.5 rounded border border-[#4EDEA3]/20">
                  SEO Optimized
                </span>
              </div>

              {data.titles.map((title, idx) => (
                <div
                  key={idx}
                  className="bg-[#1A1C1F] p-3.5 rounded-xl border border-[#464555]/30 flex items-center justify-between group hover:border-[#8781FF]/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <span className="w-6 h-6 rounded-md bg-[#0C0E11] text-[#8781FF] font-mono text-xs font-bold flex items-center justify-center border border-[#464555]/30 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-[#E2E2E6] truncate">{title}</span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(title, `title-${idx}`)}
                    className="h-7 px-3 rounded-lg bg-[#282A2D] hover:bg-[#8781FF] hover:text-[#0B0D10] text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedSection === `title-${idx}` ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedSection === `title-${idx}` ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 3. CLEAN CHAPTERS TAB */}
          {activeTab === 'chapters' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#918FA1] uppercase tracking-wider">
                  YouTube Timestamps & Clean Chapters
                </span>
                <button
                  onClick={() => copyToClipboard(data.chaptersText, 'chapters')}
                  className="h-7 px-3 rounded-lg bg-[#8781FF]/20 hover:bg-[#8781FF] text-[#C4C0FF] hover:text-[#0B0D10] text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-[#8781FF]/30"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copiedSection === 'chapters' ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedSection === 'chapters' ? 'Copied All Chapters' : 'Copy Chapters'}</span>
                </button>
              </div>

              <div className="bg-[#0C0E11] p-4 rounded-xl border border-[#464555]/30 font-mono text-xs text-[#E2E2E6] leading-relaxed whitespace-pre-wrap select-text">
                {data.chaptersText}
              </div>
            </div>
          )}

          {/* 4. CLEAN DESCRIPTION TAB */}
          {activeTab === 'description' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-[#918FA1] uppercase tracking-wider">
                    Full High-CTR SEO Description
                  </span>
                  <p className="text-[10px] text-[#4EDEA3]">Script-Grounded Storytelling Highlights & Clean Timestamps</p>
                </div>
                <button
                  onClick={() => copyToClipboard(data.descriptionText, 'description')}
                  className="h-7 px-3 rounded-lg bg-[#8781FF]/20 hover:bg-[#8781FF] text-[#C4C0FF] hover:text-[#0B0D10] text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-[#8781FF]/30"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copiedSection === 'description' ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedSection === 'description' ? 'Copied Full Description' : 'Copy Description'}</span>
                </button>
              </div>

              <div className="bg-[#0C0E11] p-4 rounded-xl border border-[#464555]/30 font-mono text-xs text-[#E2E2E6] leading-relaxed whitespace-pre-wrap select-text max-h-[300px] overflow-y-auto">
                {data.descriptionText}
              </div>
            </div>
          )}

          {/* 5. TAGS & KEYWORDS TAB */}
          {activeTab === 'tags' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#918FA1] uppercase tracking-wider">
                  YouTube Tags & Search Keywords
                </span>
                <button
                  onClick={() => copyToClipboard(data.tagsText, 'tags')}
                  className="h-7 px-3 rounded-lg bg-[#8781FF]/20 hover:bg-[#8781FF] text-[#C4C0FF] hover:text-[#0B0D10] text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-[#8781FF]/30"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copiedSection === 'tags' ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedSection === 'tags' ? 'Copied Tags' : 'Copy Tags'}</span>
                </button>
              </div>

              <div className="bg-[#0C0E11] p-4 rounded-xl border border-[#464555]/30 font-mono text-xs text-[#E2E2E6] leading-relaxed whitespace-pre-wrap select-text">
                {data.tagsText}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[#464555]/30 px-6 flex items-center justify-between bg-[#141619] shrink-0 text-xs text-[#918FA1]">
          <span>Format: Full HD 1080p • Ready for YouTube Studio paste</span>
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-[#282A2D] hover:bg-[#34373C] text-[#E2E2E6] font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
