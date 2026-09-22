import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/project.store';
import { getMediaUrl } from '../utils/media';

export const CompletedPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();

  const [metadata, setMetadata] = useState<{
    titles?: string[];
    descriptionText?: string;
    chaptersText?: string;
    tagsText?: string;
  } | null>(null);
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);

  const masterVideoPath = useMemo(() => {
    if (!currentProject) return '';
    return `${currentProject.projectPath}/output/master_video.mp4`;
  }, [currentProject]);

  const videoSrc = useMemo(() => {
    if (!masterVideoPath) return '';
    return getMediaUrl(masterVideoPath);
  }, [masterVideoPath]);

  useEffect(() => {
    if (currentProject?.thumbnailPath) {
      setThumbnailUrl(getMediaUrl(currentProject.thumbnailPath, true));
    }
  }, [currentProject]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateMetadata = async () => {
    if (!currentProject?.id || !window.docuforge?.youtube?.generateMetadata) return;
    setIsGeneratingMeta(true);
    try {
      const res = await window.docuforge.youtube.generateMetadata(currentProject.id);
      if (res) {
        setMetadata(res);
      }
    } catch (err) {
      console.error('Failed to generate YouTube metadata:', err);
    } finally {
      setIsGeneratingMeta(false);
    }
  };

  const handleGenerateThumbnail = async () => {
    if (!currentProject?.id || !window.docuforge?.youtube?.generateThumbnail) return;
    setIsGeneratingThumb(true);
    try {
      const res = await window.docuforge.youtube.generateThumbnail(currentProject.id);
      if (res) {
        setThumbnailUrl(getMediaUrl(`${res}?v=${Date.now()}`));
      }
    } catch (err) {
      console.error('Failed to generate thumbnail:', err);
    } finally {
      setIsGeneratingThumb(false);
    }
  };

  const handleOpenFolder = () => {
    if (currentProject?.projectPath && window.docuforge?.shell?.openPath) {
      window.docuforge.shell.openPath(currentProject.projectPath);
    }
  };

  const handleOpenVideoFile = () => {
    if (currentProject && window.docuforge?.shell?.showItemInFolder) {
      const winPath = masterVideoPath.replace(/\//g, '\\');
      window.docuforge.shell.showItemInFolder(winPath);
    }
  };

  return (
    <div className="p-8 flex flex-col gap-6 max-w-6xl mx-auto w-full select-none bg-[#0A0C0F]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-[#4EDEA3] uppercase bg-[#4EDEA3]/10 px-2.5 py-0.5 rounded-full border border-[#4EDEA3]/25 font-bold">
              Render Masterpiece Complete
            </span>
            <span className="text-[#918FA1] text-[11px] font-mono">1080p 30fps H.264 / AAC</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F0F0F3] tracking-tight font-display">
            {currentProject?.name || 'Story Production'} · Master Video Ready
          </h1>
          <p className="text-xs text-[#C7C4D8]">
            Your Studio Ghibli watercolor storytelling video has been compiled with synchronized voiceover, animated captions, and Ken Burns camera drifts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="h-9 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#C7C4D8] hover:text-white text-xs font-medium transition-colors border border-white/[0.06] cursor-pointer"
          >
            All Projects
          </button>
          <button
            onClick={() => navigate('/new')}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#8781FF] to-[#635BFF] hover:from-[#9B96FF] hover:to-[#736BFF] text-[#0C0E11] font-bold text-xs tracking-wide shadow-md shadow-[#8781FF]/20 transition-all cursor-pointer active:scale-[0.98]"
          >
            Create Another Story
          </button>
        </div>
      </div>

      {/* Embedded Master Video Player */}
      <div className="w-full aspect-video bg-[#0C0E11] rounded-2xl border border-white/[0.08] overflow-hidden relative shadow-2xl flex items-center justify-center group">
        {videoSrc ? (
          <video
            src={videoSrc}
            controls
            preload="auto"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-[#918FA1]">
            <span className="material-symbols-outlined text-[48px] text-[#8781FF]">movie</span>
            <span className="text-xs font-mono">Master video ready in project directory</span>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-[#121419] rounded-2xl border border-white/[0.06] gap-3 shadow-lg">
        <div className="flex items-center gap-3 text-xs font-mono text-[#918FA1]">
          <span className="text-[#F0F0F3] font-semibold">Format: MP4 (H.264 / AAC)</span>
          <span>·</span>
          <span>Resolution: 1920×1080 Full HD</span>
          <span>·</span>
          <span className="text-[#4EDEA3]">Audio: 24kHz Uncompressed</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenVideoFile}
            className="h-8 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#C7C4D8] hover:text-white text-xs font-medium transition-colors border border-white/[0.06] flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">file_open</span>
            <span>Highlight File</span>
          </button>
          <button
            onClick={handleOpenFolder}
            className="h-8 px-3.5 rounded-xl bg-[#8781FF] text-[#0C0E11] font-bold text-xs hover:bg-[#9D98FF] transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#8781FF]/20"
          >
            <span className="material-symbols-outlined text-[16px]">folder_open</span>
            <span>Open in Explorer</span>
          </button>
        </div>
      </div>

      {/* YouTube Distribution Hub: Metadata & Monumental Thumbnail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* YouTube SEO Metadata Card */}
        <div className="p-5 rounded-2xl bg-[#121419] border border-white/[0.06] shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#FF453A]/15 flex items-center justify-center text-[#FF453A]">
                <span className="material-symbols-outlined text-[17px]">smart_display</span>
              </div>
              <h2 className="text-xs font-bold text-[#F0F0F3] uppercase tracking-wider font-mono">
                YouTube SEO Metadata
              </h2>
            </div>
            <button
              onClick={handleGenerateMetadata}
              disabled={isGeneratingMeta}
              className="h-7 px-2.5 rounded-lg bg-[#8781FF]/15 hover:bg-[#8781FF]/25 text-[#C4C0FF] text-[11px] font-mono flex items-center gap-1.5 transition-colors border border-[#8781FF]/30 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[13px] ${isGeneratingMeta ? 'animate-spin' : ''}`}>
                {isGeneratingMeta ? 'sync' : 'auto_fix_high'}
              </span>
              <span>{isGeneratingMeta ? 'Generating...' : 'Generate Metadata'}</span>
            </button>
          </div>

          {metadata ? (
            <div className="flex flex-col gap-3.5 text-xs">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#918FA1]">Video Title Options</span>
                  <button
                    onClick={() => copyToClipboard(metadata.titles?.[0] || '', 'title')}
                    className="text-[10px] font-mono text-[#4EDEA3] hover:underline cursor-pointer"
                  >
                    {copiedKey === 'title' ? 'Copied!' : 'Copy Primary Title'}
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {(metadata.titles || []).slice(0, 3).map((t, idx) => (
                    <div
                      key={idx}
                      onClick={() => copyToClipboard(t, `title-${idx}`)}
                      className="p-2.5 bg-[#0C0E11] rounded-xl border border-white/[0.06] hover:border-[#8781FF]/40 text-[#E2E2E6] font-medium text-xs cursor-pointer flex items-center justify-between transition-colors"
                      title="Click to copy title"
                    >
                      <span className="truncate">{t}</span>
                      <span className="text-[10px] font-mono text-[#8781FF] shrink-0 ml-2">
                        {copiedKey === `title-${idx}` ? 'Copied' : 'Copy'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description & Chapters */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#918FA1]">Description & Chapters</span>
                  <button
                    onClick={() => copyToClipboard(`${metadata.descriptionText || ''}\n\n${metadata.chaptersText || ''}`, 'desc')}
                    className="text-[10px] font-mono text-[#4EDEA3] hover:underline cursor-pointer"
                  >
                    {copiedKey === 'desc' ? 'Copied!' : 'Copy Description'}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={6}
                  value={`${metadata.descriptionText || ''}\n\n${metadata.chaptersText || ''}`}
                  className="p-2.5 bg-[#0C0E11] rounded-xl border border-white/[0.06] text-[#C7C4D8] font-mono text-[11px] leading-relaxed resize-none focus:outline-none"
                />
              </div>

              {/* Tags */}
              {metadata.tagsText && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#918FA1]">Tags</span>
                    <button
                      onClick={() => copyToClipboard(metadata.tagsText || '', 'tags')}
                      className="text-[10px] font-mono text-[#4EDEA3] hover:underline cursor-pointer"
                    >
                      {copiedKey === 'tags' ? 'Copied!' : 'Copy All Tags'}
                    </button>
                  </div>
                  <div className="p-2 bg-[#0C0E11] rounded-xl border border-white/[0.06] text-[11px] font-mono text-[#918FA1] line-clamp-2">
                    {metadata.tagsText}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-[#7D7A8B] gap-2 text-center">
              <span className="material-symbols-outlined text-[32px] text-[#8781FF]">lightbulb</span>
              <span className="text-xs">Generate optimized high-CTR YouTube titles, chapter timestamps, and tags.</span>
              <button
                onClick={handleGenerateMetadata}
                disabled={isGeneratingMeta}
                className="mt-2 h-8 px-3 rounded-xl bg-[#8781FF]/15 text-[#C4C0FF] text-xs font-medium hover:bg-[#8781FF]/25 border border-[#8781FF]/30 cursor-pointer"
              >
                Generate SEO Metadata
              </button>
            </div>
          )}
        </div>

        {/* YouTube Monumental Thumbnail Card */}
        <div className="p-5 rounded-2xl bg-[#121419] border border-white/[0.06] shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#FFB95F]/15 flex items-center justify-center text-[#FFB95F]">
                <span className="material-symbols-outlined text-[17px]">photo_camera</span>
              </div>
              <h2 className="text-xs font-bold text-[#F0F0F3] uppercase tracking-wider font-mono">
                Monumental YouTube Thumbnail
              </h2>
            </div>
            <button
              onClick={handleGenerateThumbnail}
              disabled={isGeneratingThumb}
              className="h-7 px-2.5 rounded-lg bg-[#8781FF]/15 hover:bg-[#8781FF]/25 text-[#C4C0FF] text-[11px] font-mono flex items-center gap-1.5 transition-colors border border-[#8781FF]/30 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[13px] ${isGeneratingThumb ? 'animate-spin' : ''}`}>
                {isGeneratingThumb ? 'sync' : 'refresh'}
              </span>
              <span>{isGeneratingThumb ? 'Rendering...' : 'Generate Thumbnail'}</span>
            </button>
          </div>

          <div className="w-full aspect-video bg-[#0C0E11] rounded-xl border border-white/[0.08] overflow-hidden relative shadow-lg flex items-center justify-center">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="YouTube Thumbnail"
                className="w-full h-full object-cover"
              />
            ) : isGeneratingThumb ? (
              <div className="flex flex-col items-center justify-center gap-2 text-[#8781FF]">
                <span className="material-symbols-outlined text-[32px] animate-spin text-[#C4C0FF]">progress_activity</span>
                <span className="text-xs font-mono">Synthesizing monumental thumbnail...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-[#7D7A8B] text-center p-4">
                <span className="material-symbols-outlined text-[36px]">image</span>
                <span className="text-xs font-mono">Generate a high-converting thumbnail with monumental title overlay</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-[#7D7A8B]">1280×720 16:9 Thumbnail</span>
            {thumbnailUrl && (
              <a
                href={thumbnailUrl}
                download="thumbnail.png"
                className="h-7 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#4EDEA3] text-xs font-mono flex items-center gap-1 border border-white/[0.06] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                <span>Download Image</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
