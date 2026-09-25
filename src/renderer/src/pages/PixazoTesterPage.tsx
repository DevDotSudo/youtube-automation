import React, { useState, useEffect, useRef } from 'react';
import { ParallelImageProgress } from '../../../shared/types';
import { getMediaUrl } from '../utils/media';

interface TestImageRecord {
  id?: string;
  filename: string;
  imagePath: string;
  prompt: string;
  durationMs?: number;
  createdAt?: number;
  success?: boolean;
}


export const PixazoTesterPage: React.FC = () => {
  // Mode selection
  const [activeTab, setActiveTab] = useState<'batch' | 'single'>('batch');

  // Single Generation State
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('flux-1-schnell');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parallel Batch Generation State
  const [batchPromptsText, setBatchPromptsText] = useState<string>('');
  const [concurrency, setConcurrency] = useState<number>(5);
  const [isParallelRunning, setIsParallelRunning] = useState(false);
  const [parallelProgress, setParallelProgress] = useState<ParallelImageProgress | null>(null);
  const [batchGeneratedImages, setBatchGeneratedImages] = useState<TestImageRecord[]>([]);

  // Telemetry & Environment
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [history, setHistory] = useState<TestImageRecord[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Check Pixazo credentials and load history
  useEffect(() => {
    checkConfig();
    loadHistory();

    // Listen to live parallel progress events from Main Process
    let unsubscribe: (() => void) | undefined;
    if (window.docuforge?.pixazo?.onParallelProgress) {
      unsubscribe = window.docuforge.pixazo.onParallelProgress((progress: ParallelImageProgress) => {
        setParallelProgress(progress);

        if (progress.lastCompleted && progress.lastCompleted.success && progress.lastCompleted.imagePath) {
          const newRecord: TestImageRecord = {
            id: progress.lastCompleted.id,
            filename: progress.lastCompleted.imagePath.split(/[\\/]/).pop() || 'image.png',
            imagePath: progress.lastCompleted.imagePath,
            prompt: progress.lastCompleted.prompt,
            durationMs: progress.lastCompleted.durationMs,
            createdAt: Date.now()
          };
          setBatchGeneratedImages((prev) => [newRecord, ...prev.filter((item) => item.id !== newRecord.id)]);
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const checkConfig = async () => {
    try {
      if (window.docuforge?.pixazo?.getConfig) {
        const cfg = await window.docuforge.pixazo.getConfig();
        setIsConfigured(!!cfg.apiKey && cfg.apiKey.trim().length > 0);
        if (cfg.model) setSelectedModel(cfg.model);
        if (cfg.concurrency) setConcurrency(cfg.concurrency);
      }
    } catch {
      setIsConfigured(false);
    }
  };

  const loadHistory = async () => {
    try {
      if (window.docuforge?.pixazo?.getHistory) {
        const hist = await window.docuforge.pixazo.getHistory();
        setHistory(hist || []);
      }
    } catch {
      setHistory([]);
    }
  };

  const handleStartTimer = () => {
    setElapsedTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - start) / 100) / 10);
    }, 100);
  };

  const handleStopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Start Parallel Batch Generation
  const handleStartParallel = async () => {
    const rawLines = batchPromptsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) {
      setErrorMessage('Please enter at least one prompt in the list.');
      return;
    }

    setErrorMessage(null);
    setIsParallelRunning(true);
    setBatchGeneratedImages([]);
    handleStartTimer();

    setParallelProgress({
      total: rawLines.length,
      completed: 0,
      generating: Math.min(concurrency, rawLines.length),
      pending: Math.max(0, rawLines.length - concurrency),
      failed: 0
    });

    try {
      const tasks = rawLines.map((p, idx) => ({
        id: `batch_${idx}_${Date.now()}`,
        prompt: p
      }));

      if (!window.docuforge?.pixazo?.generateParallel) {
        throw new Error('Parallel generation IPC bridge is not available');
      }

      const results = await window.docuforge.pixazo.generateParallel(tasks, selectedModel, concurrency);

      const successfulImages: TestImageRecord[] = results
        .filter((r) => r.success && r.imagePath)
        .map((r) => ({
          id: r.id,
          filename: r.imagePath!.split(/[\\/]/).pop() || 'image.png',
          imagePath: r.imagePath!,
          prompt: r.prompt,
          durationMs: r.durationMs,
          createdAt: Date.now()
        }));

      setBatchGeneratedImages(successfulImages);
      await loadHistory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Parallel generation batch failed.');
    } finally {
      setIsParallelRunning(false);
      handleStopTimer();
    }
  };

  // Cancel running parallel batch
  const handleCancelParallel = async () => {
    try {
      if (window.docuforge?.pixazo?.cancelParallel) {
        await window.docuforge.pixazo.cancelParallel();
      }
    } catch (err) {
      console.warn('Cancel parallel failed:', err);
    } finally {
      setIsParallelRunning(false);
      handleStopTimer();
    }
  };

  // Single Image Generation Handler
  const handleGenerateSingle = async () => {
    if (!prompt.trim()) return;

    setErrorMessage(null);
    setIsGenerating(true);
    setDuration(null);
    handleStartTimer();

    try {
      if (!window.docuforge?.pixazo?.generateTestImage) {
        throw new Error('Pixazo generation API is not initialized');
      }

      const result = await window.docuforge.pixazo.generateTestImage(prompt, selectedModel);

      if (result.imagePath) {
        setCurrentImage(result.imagePath);
        setDuration(result.durationMs || 0);
        await loadHistory();
      } else {
        throw new Error(result.error || 'Failed to generate image');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Image generation failed.');
    } finally {
      setIsGenerating(false);
      handleStopTimer();
    }
  };

  return (
    <div className="p-10 flex flex-col gap-6 w-full select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest text-[#00e5ff] uppercase bg-[#00e5ff]/10 px-2 py-0.5 rounded-full border border-[#00e5ff]/20 font-semibold">
              High-Speed Sliding-Queue Engine
            </span>
            <span className="text-[11px] font-mono text-[#34d399] bg-[#34d399]/10 px-2 py-0.5 rounded-full border border-[#34d399]/25 font-bold">
              {concurrency}x Simultaneous Workers
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F0F0F3] tracking-tight font-display">
            Pixazo AI Parallel Generation Studio
          </h1>
          <p className="text-xs text-[#C7C4D8]">
            Dispatches 5 image requests simultaneously using a sliding-window queue pool. Whenever one finishes, the next pending prompt begins instantly.
          </p>
        </div>

        {/* Global Key Status */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 ${
              isConfigured
                ? 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/30'
                : 'bg-[#FFDE82]/10 text-[#FFDE82] border-[#FFDE82]/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-[#34d399] animate-pulse' : 'bg-[#FFDE82]'}`}
            ></span>
            <span>{isConfigured ? 'Pixazo API Key Connected' : 'PIXAZO_API_KEY Missing'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
        <button
          onClick={() => setActiveTab('batch')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'batch'
              ? 'bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/40 shadow-sm'
              : 'text-[#918FA1] hover:text-[#F0F0F3] hover:bg-white/[0.03]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span>5x Parallel Batch Synthesis</span>
        </button>

        <button
          onClick={() => setActiveTab('single')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'single'
              ? 'bg-[#8781FF]/15 text-[#C4C0FF] border border-[#8781FF]/40 shadow-sm'
              : 'text-[#918FA1] hover:text-[#F0F0F3] hover:bg-white/[0.03]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">palette</span>
          <span>Single Prompt Canvas</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#FFB4AB]/10 border border-[#FFB4AB]/30 text-[#FFB4AB] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[11px] font-mono hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* TAB 1: 5X PARALLEL BATCH SYNTHESIS */}
      {activeTab === 'batch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Batch Config & Queue Inputs (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-[#121419] border border-white/[0.06] flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00e5ff] text-[20px]">queue_play_next</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F0F0F3]">
                    Parallel Batch Settings
                  </span>
                </div>

                {batchPromptsText && (
                  <button
                    type="button"
                    onClick={() => setBatchPromptsText('')}
                    disabled={isParallelRunning}
                    className="text-[10px] font-mono bg-white/[0.04] hover:bg-white/[0.08] text-[#C7C4D8] px-2.5 py-1 rounded border border-white/[0.08] cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    Clear Prompts
                  </button>
                )}
              </div>

              {/* Model & Concurrency Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase text-[#918FA1]">Pixazo Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isParallelRunning}
                    className="h-9 px-2.5 bg-[#0C0E11] text-[#E2E2E6] text-xs rounded-lg border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#00e5ff] cursor-pointer disabled:opacity-50"
                  >
                    <option value="flux-1-schnell">Flux 1 Schnell (~2s)</option>
                    <option value="studio-ghibli">Studio Ghibli</option>
                    <option value="flux-dev">Flux Dev</option>
                    <option value="flux-pro">Flux Pro</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase text-[#918FA1]">Concurrency</label>
                    <span className="text-[10px] font-mono text-[#00e5ff] font-bold">
                      {concurrency} active
                    </span>
                  </div>
                  <select
                    value={concurrency}
                    onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
                    disabled={isParallelRunning}
                    className="h-9 px-2.5 bg-[#0C0E11] text-[#E2E2E6] text-xs rounded-lg border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#00e5ff] cursor-pointer disabled:opacity-50 font-mono"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} simultaneous {num === 5 ? '(Default 5)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prompts Input Area */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase text-[#918FA1]">
                    Prompt Queue (One per line)
                  </label>
                  <span className="text-[10px] font-mono text-[#C4C0FF]">
                    {batchPromptsText.split('\n').filter((l) => l.trim().length > 0).length} prompts queued
                  </span>
                </div>
                <textarea
                  value={batchPromptsText}
                  onChange={(e) => setBatchPromptsText(e.target.value)}
                  rows={10}
                  disabled={isParallelRunning}
                  placeholder="Enter prompts, one per line..."
                  className="w-full p-3 bg-[#0C0E11] text-[#E2E2E6] text-xs font-mono leading-relaxed rounded-xl border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#00e5ff] resize-none placeholder:text-[#525060] disabled:opacity-50"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                {!isParallelRunning ? (
                  <button
                    type="button"
                    onClick={handleStartParallel}
                    disabled={!batchPromptsText.trim()}
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#00b0ff] hover:from-[#33eaff] hover:to-[#22baff] text-[#002830] font-bold text-xs font-mono tracking-wider shadow-lg shadow-[#00e5ff]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    <span>Start {concurrency}x Parallel Generation</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelParallel}
                    className="flex-1 h-11 rounded-xl bg-[#FFB4AB]/20 hover:bg-[#FFB4AB]/30 text-[#FFB4AB] border border-[#FFB4AB]/40 font-bold text-xs font-mono tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    <span>Cancel Batch ({elapsedTime.toFixed(1)}s elapsed)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Telemetry Dashboard & Live Gallery (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Real-Time Telemetry HUD */}
            <div className="p-5 rounded-2xl bg-[#121419] border border-white/[0.06] flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00e5ff] text-[20px]">speed</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F0F0F3]">
                    Live Queue Telemetry
                  </span>
                </div>
                {isParallelRunning && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></span>
                    <span className="text-xs font-mono text-[#00e5ff] font-semibold">
                      Running ({elapsedTime.toFixed(1)}s)
                    </span>
                  </div>
                )}
              </div>

              {/* 5 Required Telemetry Metric Cards */}
              <div className="grid grid-cols-5 gap-2.5">
                {/* 1. TOTAL */}
                <div className="p-3 bg-[#0C0E11] rounded-xl border border-white/[0.04] flex flex-col gap-1 items-center text-center">
                  <span className="text-[10px] font-mono text-[#918FA1] uppercase tracking-wider">TOTAL</span>
                  <span className="text-xl font-bold font-mono text-[#F0F0F3]">
                    {parallelProgress?.total ?? 0}
                  </span>
                </div>

                {/* 2. COMPLETED */}
                <div className="p-3 bg-[#0C0E11] rounded-xl border border-[#34d399]/30 flex flex-col gap-1 items-center text-center">
                  <span className="text-[10px] font-mono text-[#34d399] uppercase tracking-wider">COMPLETED</span>
                  <span className="text-xl font-bold font-mono text-[#34d399]">
                    {parallelProgress?.completed ?? 0}
                  </span>
                </div>

                {/* 3. GENERATING (Active Requests) */}
                <div className="p-3 bg-[#0C0E11] rounded-xl border border-[#00e5ff]/40 flex flex-col gap-1 items-center text-center relative overflow-hidden">
                  <span className="text-[10px] font-mono text-[#00e5ff] uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse"></span>
                    GENERATING
                  </span>
                  <span className="text-xl font-bold font-mono text-[#00e5ff]">
                    {parallelProgress?.generating ?? 0}
                  </span>
                </div>

                {/* 4. PENDING */}
                <div className="p-3 bg-[#0C0E11] rounded-xl border border-white/[0.04] flex flex-col gap-1 items-center text-center">
                  <span className="text-[10px] font-mono text-[#FFDE82] uppercase tracking-wider">PENDING</span>
                  <span className="text-xl font-bold font-mono text-[#FFDE82]">
                    {parallelProgress?.pending ?? 0}
                  </span>
                </div>

                {/* 5. FAILED */}
                <div className="p-3 bg-[#0C0E11] rounded-xl border border-[#FFB4AB]/30 flex flex-col gap-1 items-center text-center">
                  <span className="text-[10px] font-mono text-[#FFB4AB] uppercase tracking-wider">FAILED</span>
                  <span className="text-xl font-bold font-mono text-[#FFB4AB]">
                    {parallelProgress?.failed ?? 0}
                  </span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              {parallelProgress && parallelProgress.total > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#918FA1]">
                    <span>Overall Batch Progress</span>
                    <span className="text-[#00e5ff] font-bold">
                      {Math.round(
                        ((parallelProgress.completed + parallelProgress.failed) / parallelProgress.total) * 100
                      )}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0C0E11] h-2.5 rounded-full overflow-hidden border border-white/[0.06]">
                    <div
                      className="bg-gradient-to-r from-[#00e5ff] to-[#34d399] h-full transition-all duration-300"
                      style={{
                        width: `${Math.round(
                          ((parallelProgress.completed + parallelProgress.failed) / parallelProgress.total) * 100
                        )}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Parallel Generated Results Gallery */}
            <div className="p-5 rounded-2xl bg-[#121419] border border-white/[0.06] flex flex-col gap-3 shadow-sm min-h-[350px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#34d399] text-[20px]">photo_library</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F0F0F3]">
                    Live Output Gallery ({batchGeneratedImages.length} images)
                  </span>
                </div>
              </div>

              {batchGeneratedImages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#7D7A8B] gap-2 py-12">
                  <span className="material-symbols-outlined text-[42px] text-white/10">dynamic_feed</span>
                  <span className="text-xs font-mono">No images synthesized in this batch session yet.</span>
                  <span className="text-[11px] text-[#525060]">
                    Click &quot;Start 5x Parallel Generation&quot; to synthesize images simultaneously.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[480px] pr-1">
                  {batchGeneratedImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-xl overflow-hidden bg-[#0C0E11] border border-white/[0.06] hover:border-[#00e5ff]/50 transition-all flex flex-col"
                    >
                      <div className="w-full aspect-video bg-black/40 relative overflow-hidden">
                        <img
                          src={getMediaUrl(img.imagePath)}
                          alt={img.prompt}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {img.durationMs && (
                          <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-[#00e5ff] border border-white/10">
                            {(img.durationMs / 1000).toFixed(1)}s
                          </div>
                        )}
                      </div>
                      <div className="p-2 flex flex-col gap-0.5">
                        <p className="text-[10px] text-[#E2E2E6] line-clamp-2 leading-snug font-sans">
                          {img.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* TAB 2: SINGLE PROMPT CANVAS */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Canvas Controls */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-[#121419] border border-white/[0.06] flex flex-col gap-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8781FF] text-[20px]">edit_note</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#F0F0F3]">
                  Single Prompt Generator
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase text-[#918FA1]">Pixazo Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isGenerating}
                  className="h-9 px-2.5 bg-[#0C0E11] text-[#E2E2E6] text-xs rounded-lg border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#8781FF] cursor-pointer"
                >
                  <option value="flux-1-schnell">Flux 1 Schnell (~2s)</option>
                  <option value="studio-ghibli">Studio Ghibli</option>
                  <option value="flux-dev">Flux Dev</option>
                  <option value="flux-pro">Flux Pro</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase text-[#918FA1]">Scene Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  disabled={isGenerating}
                  placeholder="Enter image prompt here..."
                  className="w-full p-3 bg-[#0C0E11] text-[#E2E2E6] text-xs font-mono leading-relaxed rounded-xl border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#8781FF] resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateSingle}
                disabled={isGenerating || !prompt.trim()}
                className="h-11 rounded-xl bg-gradient-to-r from-[#8781FF] to-[#635BFF] hover:from-[#9B96FF] hover:to-[#736BFF] text-[#0C0E11] font-bold text-xs tracking-wider shadow-lg shadow-[#8781FF]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
              >
                <span className={`material-symbols-outlined text-[18px] ${isGenerating ? 'animate-spin' : ''}`}>
                  {isGenerating ? 'progress_activity' : 'auto_fix_high'}
                </span>
                <span>
                  {isGenerating ? `Synthesizing (${elapsedTime.toFixed(1)}s)...` : 'Generate Single Image'}
                </span>
              </button>
            </div>
          </div>

          {/* Right Canvas Preview */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-[#121419] border border-white/[0.06] flex flex-col gap-3 shadow-sm min-h-[420px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F0F0F3]">
                  Rendered Preview (1280x720 16:9)
                </span>
                {duration && (
                  <span className="text-xs font-mono text-[#4EDEA3]">
                    Generated in {(duration / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              <div className="flex-1 w-full aspect-video rounded-xl bg-[#0C0E11] border border-white/[0.04] overflow-hidden flex items-center justify-center relative">
                {currentImage ? (
                  <img
                    src={getMediaUrl(currentImage)}
                    alt="Current Render"
                    className="w-full h-full object-cover animate-in fade-in duration-300"
                  />
                ) : isGenerating ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-[#8781FF]">
                    <span className="material-symbols-outlined text-[42px] animate-spin text-[#C4C0FF]">
                      progress_activity
                    </span>
                    <span className="text-xs font-mono">Dispatched to Pixazo Cloud Gateway...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#7D7A8B] gap-2">
                    <span className="material-symbols-outlined text-[42px] text-white/10">image</span>
                    <span className="text-xs font-mono">Ready to synthesize</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent History Archive */}
      {history.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#121419] border border-white/[0.06] flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8781FF] text-[18px]">history</span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F0F0F3]">
                Past Generations Archive ({history.length} saved)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 overflow-x-auto pb-1">
            {history.slice(0, 12).map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden bg-[#0C0E11] border border-white/[0.06] flex flex-col"
              >
                <div className="w-full aspect-video bg-black/40 overflow-hidden">
                  <img
                    src={getMediaUrl(item.imagePath)}
                    alt={item.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-1.5">
                  <p className="text-[9px] text-[#918FA1] line-clamp-1">{item.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
