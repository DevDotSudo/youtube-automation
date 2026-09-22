import React, { useState, useMemo, useEffect } from 'react';
import { CaptionStyleConfig, VideoExportOptions, VisualBeat, SceneEditConfig } from '../../../../shared/types';
import { COLOR_FILTER_PRESETS } from '../../../../shared/constants';
import { getMediaUrl } from '../../utils/media';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectDurationMs: number;
  activeBeat?: VisualBeat;
  selectedColorFilter: string;
  onColorFilterChange: (filterId: string) => void;
  bgmVolume: number;
  onBgmVolumeChange: (vol: number) => void;
  captionStyle: CaptionStyleConfig;
  sceneConfigs?: SceneEditConfig[];
  onOpenYouTubePack?: () => void;
}

export const CapCutExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  projectDurationMs,
  activeBeat,
  selectedColorFilter,
  onColorFilterChange,
  bgmVolume,
  onBgmVolumeChange,
  captionStyle,
  sceneConfigs,
  onOpenYouTubePack
}) => {
  // Export configuration state
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [quality, setQuality] = useState<'high' | 'recommended' | 'fast'>('recommended');
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [outputName, setOutputName] = useState(() => {
    const clean = (projectName || 'master').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${clean}.mp4`;
  });

  // Progress state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('Preparing timeline...');
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Timer for elapsed seconds
  useEffect(() => {
    let timer: any;
    if (isExporting) {
      timer = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isExporting, startTime]);

  // Estimated file size calculation
  const estimatedSizeMb = useMemo(() => {
    const durationSec = Math.max(1, projectDurationMs / 1000);
    let mbps = 12; // 1080p recommended
    if (resolution === '720p') mbps = quality === 'high' ? 10 : quality === 'recommended' ? 6 : 4;
    if (resolution === '1080p') mbps = quality === 'high' ? 18 : quality === 'recommended' ? 12 : 8;
    if (resolution === '4k') mbps = quality === 'high' ? 36 : quality === 'recommended' ? 24 : 16;
    const size = (durationSec * mbps) / 8;
    return size.toFixed(1);
  }, [projectDurationMs, resolution, quality]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (!projectId || !window.docuforge) return;
    setIsExporting(true);
    setErrorMessage(null);
    setExportedFilePath(null);
    setExportProgress(4);
    setExportStage('Initializing CapCut render pipeline...');
    setStartTime(Date.now());
    setElapsedSec(0);

    const unsubProgress = window.docuforge.render.onProgress((data) => {
      setExportStage(data.stage);
      setExportProgress(data.percent);
    });

    const unsubComplete = window.docuforge.render.onComplete((data) => {
      setIsExporting(false);
      setExportProgress(100);
      setExportStage('Export complete!');
      setExportedFilePath(data.outputPath);
      unsubProgress();
      unsubComplete();
    });

    try {
      const exportOptions: VideoExportOptions = {
        resolution,
        fps,
        quality,
        burnSubtitles,
        colorFilter: selectedColorFilter,
        bgmVolume,
        captionStyle,
        outputFileName: outputName.endsWith('.mp4') ? outputName : `${outputName}.mp4`
      };

      await window.docuforge.render.start(
        projectId,
        sceneConfigs,
        selectedColorFilter,
        bgmVolume,
        captionStyle,
        exportOptions
      );
    } catch (err: any) {
      console.error('Export failed:', err);
      setIsExporting(false);
      setErrorMessage(err.message || 'Render pipeline encountered an error');
      unsubProgress();
      unsubComplete();
    }
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#141619] border border-[#2D3139] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col font-sans">
        
        {/* CapCut Header */}
        <header className="h-14 px-6 border-b border-[#2D3139] bg-[#1A1D23] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00E5FF] to-[#0077FF] flex items-center justify-center text-black font-black text-sm shadow-md">
              <span className="material-symbols-outlined text-[18px] text-white">movie_filter</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#E2E2E6]">Export Video</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 font-semibold">
                  CapCut Engine
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#918FA1]">1080p Studio Ghibli Storytelling - Continuous Master Voice</p>
            </div>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#918FA1] hover:text-[#E2E2E6] hover:bg-[#282A2D] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </header>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-6">
          {!isExporting && !exportedFilePath && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Preview & Metadata */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <div className="w-full aspect-video bg-[#08090B] rounded-xl border border-[#2D3139] overflow-hidden relative shadow-inner flex items-center justify-center group">
                  {activeBeat?.imagePath ? (
                    <img
                      src={getMediaUrl(activeBeat.imagePath, true)}
                      alt="Export Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#918FA1] gap-1">
                      <span className="material-symbols-outlined text-[36px]">movie</span>
                      <span className="text-[11px] font-mono">Video Preview</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-[#00E5FF] border border-[#00E5FF]/30">
                    {resolution.toUpperCase()} - {fps}FPS
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-white">
                    {formatDuration(projectDurationMs)}
                  </div>
                </div>

                {/* Output File Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono text-[#918FA1] uppercase tracking-wider">File Name</label>
                  <input
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="bg-[#0B0D10] border border-[#2D3139] rounded-lg px-3 py-2 text-xs text-[#E2E2E6] font-mono focus:outline-none focus:border-[#00E5FF]"
                    placeholder="project_video.mp4"
                  />
                </div>

                {/* File Specs Summary Pill */}
                <div className="bg-[#0B0D10] rounded-xl border border-[#2D3139] p-3 flex flex-col gap-1.5 text-[11px] font-mono text-[#918FA1]">
                  <div className="flex items-center justify-between">
                    <span>Estimated Size:</span>
                    <span className="text-[#00E5FF] font-bold">~{estimatedSizeMb} MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Duration:</span>
                    <span className="text-[#E2E2E6]">{formatDuration(projectDurationMs)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Format / Codec:</span>
                    <span className="text-[#E2E2E6]">MP4 (H.264 / AAC)</span>
                  </div>
                </div>
              </div>

              {/* Right Column: CapCut Settings */}
              <div className="md:col-span-7 flex flex-col gap-4">
                
                {/* Resolution Selector */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#E2E2E6] font-mono uppercase tracking-wider">Resolution</label>
                    <span className="text-[11px] font-mono text-[#00E5FF]">
                      {resolution === '720p' ? '1280x720' : resolution === '1080p' ? '1920x1080 (FHD)' : '3840x2160 (4K UHD)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['720p', '1080p', '4k'] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setResolution(res)}
                        className={`h-9 rounded-lg font-mono text-xs font-semibold border transition-all cursor-pointer ${
                          resolution === res
                            ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-[#00E5FF] shadow-sm'
                            : 'bg-[#0B0D10] border-[#2D3139] text-[#918FA1] hover:text-[#E2E2E6] hover:bg-[#1E2023]'
                        }`}
                      >
                        {res.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frame Rate Selector */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#E2E2E6] font-mono uppercase tracking-wider">Frame Rate</label>
                    <span className="text-[11px] font-mono text-[#918FA1]">
                      {fps === 24 ? 'Cinematic 24 fps' : fps === 30 ? 'Smooth 30 fps' : 'Ultra Smooth 60 fps'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([24, 30, 60] as const).map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setFps(rate)}
                        className={`h-9 rounded-lg font-mono text-xs font-semibold border transition-all cursor-pointer ${
                          fps === rate
                            ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-[#00E5FF] shadow-sm'
                            : 'bg-[#0B0D10] border-[#2D3139] text-[#918FA1] hover:text-[#E2E2E6] hover:bg-[#1E2023]'
                        }`}
                      >
                        {rate} FPS
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality / Bitrate */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#E2E2E6] font-mono uppercase tracking-wider">Encoding Bitrate</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'fast', label: 'Faster (8 Mbps)' },
                      { id: 'recommended', label: 'Standard (12 Mbps)' },
                      { id: 'high', label: 'Higher (18 Mbps)' }
                    ].map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setQuality(q.id as any)}
                        className={`h-9 rounded-lg font-mono text-[11px] font-semibold border transition-all cursor-pointer px-1 truncate ${
                          quality === q.id
                            ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-[#00E5FF] shadow-sm'
                            : 'bg-[#0B0D10] border-[#2D3139] text-[#918FA1] hover:text-[#E2E2E6] hover:bg-[#1E2023]'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Filter & Subtitles Toggles */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Color Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-[#918FA1]">COLOR FILTER</label>
                    <select
                      value={selectedColorFilter}
                      onChange={(e) => onColorFilterChange(e.target.value)}
                      className="h-9 bg-[#0B0D10] border border-[#2D3139] rounded-lg px-2 text-xs text-[#E2E2E6] font-mono focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                    >
                      {COLOR_FILTER_PRESETS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Burn Subtitles */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-[#918FA1]">CAPTIONS</label>
                    <button
                      type="button"
                      onClick={() => setBurnSubtitles(!burnSubtitles)}
                      className={`h-9 rounded-lg border px-3 flex items-center justify-between text-xs font-mono transition-colors cursor-pointer ${
                        burnSubtitles
                          ? 'bg-[#00E5FF]/10 border-[#00E5FF]/50 text-[#00E5FF]'
                          : 'bg-[#0B0D10] border-[#2D3139] text-[#918FA1]'
                      }`}
                    >
                      <span>Burn Subtitles</span>
                      <span className="material-symbols-outlined text-[18px]">
                        {burnSubtitles ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* BGM Volume Slider */}
                <div className="flex flex-col gap-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#918FA1]">
                    <span>BGM DUCKING VOLUME</span>
                    <span className="text-[#4EDEA3] font-bold">{Math.round(bgmVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                    value={bgmVolume}
                    onChange={(e) => onBgmVolumeChange(parseFloat(e.target.value))}
                    className="accent-[#00E5FF] cursor-pointer w-full"
                  />
                </div>

              </div>
            </div>
          )}

          {/* Exporting Progress Screen */}
          {isExporting && (
            <div className="py-8 flex flex-col items-center justify-center gap-6">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke="#2D3139"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke="#00E5FF"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={339.29}
                    strokeDashoffset={339.29 - (339.29 * exportProgress) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black font-mono text-white">{exportProgress}%</span>
                  <span className="text-[10px] font-mono text-[#918FA1]">{elapsedSec}s</span>
                </div>
              </div>

              <div className="flex flex-col items-center text-center gap-1.5 max-w-md">
                <h3 className="text-base font-bold text-white">Rendering CapCut Video</h3>
                <p className="text-xs font-mono text-[#00E5FF] animate-pulse">
                  {exportStage}
                </p>
                <p className="text-[11px] font-mono text-[#918FA1] mt-1">
                  Assembling visual beats with camera motions, transitions, continuous voice narration, and burned ASS subtitles.
                </p>
              </div>
            </div>
          )}

          {/* Completed Screen */}
          {exportedFilePath && !isExporting && (
            <div className="py-6 flex flex-col items-center justify-center gap-5 text-center">
              <div className="w-16 h-16 rounded-full bg-[#00A572]/20 border border-[#00A572] flex items-center justify-center shadow-lg animate-in zoom-in-90">
                <span className="material-symbols-outlined text-[#4EDEA3] text-[36px]">check</span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-white">Video Export Completed!</h3>
                <p className="text-xs font-mono text-[#918FA1] max-w-lg truncate bg-[#0B0D10] px-3 py-1.5 rounded-lg border border-[#2D3139]">
                  {exportedFilePath}
                </p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => window.docuforge?.shell?.openPath(exportedFilePath)}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#0077FF] hover:from-[#33EBFF] hover:to-[#228BFF] text-black font-bold text-xs shadow flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  <span>Play Video</span>
                </button>

                <button
                  onClick={() => window.docuforge?.shell?.showItemInFolder(exportedFilePath)}
                  className="h-10 px-4 rounded-xl bg-[#1E2023] hover:bg-[#282A2D] text-[#E2E2E6] font-mono text-xs border border-[#2D3139] flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">folder_open</span>
                  <span>Show in Folder</span>
                </button>

                {onOpenYouTubePack && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenYouTubePack();
                    }}
                    className="h-10 px-4 rounded-xl bg-[#FFB95F]/15 hover:bg-[#FFB95F]/25 text-[#FFB95F] font-mono text-xs border border-[#FFB95F]/30 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">smart_display</span>
                    <span>YouTube Pack Studio</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#FF5449]/10 border border-[#FF5449]/40 text-[#FF897D] text-xs font-mono flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <footer className="h-16 px-6 border-t border-[#2D3139] bg-[#1A1D23] flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-[#918FA1]">
            {!isExporting && !exportedFilePath && (
              <span>Target: {resolution.toUpperCase()} @ {fps}fps - H.264 MP4</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isExporting && !exportedFilePath && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg bg-[#0B0D10] hover:bg-[#1E2023] text-[#918FA1] hover:text-[#E2E2E6] text-xs font-mono border border-[#2D3139] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartExport}
                  className="h-9 px-6 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#0077FF] hover:from-[#33EBFF] hover:to-[#228BFF] text-black font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">file_download</span>
                  <span>Start Export</span>
                </button>
              </>
            )}

            {exportedFilePath && (
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-6 rounded-lg bg-[#1E2023] hover:bg-[#282A2D] text-[#E2E2E6] font-mono text-xs border border-[#2D3139] cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </footer>

      </div>
    </div>
  );
};
