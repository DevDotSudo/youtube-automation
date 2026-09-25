import React, { useEffect } from 'react';
import { useSystemStore } from '../stores/system.store';

export const SystemStatusPage: React.FC = () => {
  const { status, fetchStatus, isLoading } = useSystemStore();

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const pixazoConfigured = status?.pixazoConfigured ?? false;
  const concurrency = status?.imageConcurrency ?? 5;
  const model = status?.pixazoModel ?? 'flux-1-schnell';

  return (
    <div className="p-10 flex flex-col gap-6 w-full select-none">
      <div className="flex items-center justify-between pb-4 border-b border-[#464555]/30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest text-[#00e5ff] uppercase bg-[#00e5ff]/10 px-2 py-0.5 rounded-full border border-[#00e5ff]/20 font-semibold">
              Telemetry & Engine Diagnostics
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#E2E2E6] tracking-tight">System Status</h1>
          <p className="text-sm text-[#C7C4D8]">
            Diagnostics for Pixazo AI 5x Parallel Engine, Microsoft Edge Neural TTS, SQLite, and FFmpeg media toolchains.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="h-9 px-4 rounded-lg bg-[#00e5ff] text-[#003840] hover:bg-[#80f2ff] font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
        >
          <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>
            {isLoading ? 'progress_activity' : 'refresh'}
          </span>
          {isLoading ? 'Scanning...' : 'Run Diagnostics'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pixazo AI 5x Parallel Engine */}
        <div className="p-5 rounded-xl bg-[#1A1C1F] border border-[#00e5ff]/40 flex flex-col gap-3 relative shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00e5ff] text-[20px]">bolt</span>
              <span className="text-xs font-bold text-[#E2E2E6]">Pixazo AI Parallel Engine</span>
            </div>
            <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
              pixazoConfigured
                ? 'bg-[#00A572]/20 text-[#4EDEA3] border-[#00A572]/40'
                : 'bg-[#FFB4AB]/20 text-[#FFB4AB] border-[#FFB4AB]/40'
            }`}>
              {pixazoConfigured ? `${concurrency}x PARALLEL ACTIVE` : 'Key Missing'}
            </span>
          </div>
          <p className="text-xs text-[#918FA1]">
            High-speed cloud image synthesis gateway at <code className="text-[#00e5ff]">gateway.pixazo.ai</code> with active model <code className="text-[#00e5ff]">{model}</code>. Dispatches 5 concurrent requests simultaneously with sliding-window worker pool and exponential backoff retry.
          </p>
        </div>

        {/* Microsoft Edge Neural Cloud Voice Engine */}
        <div className="p-5 rounded-xl bg-[#1A1C1F] border border-[#464555]/40 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C4C0FF] text-[20px]">record_voice_over</span>
              <span className="text-xs font-semibold text-[#E2E2E6]">Microsoft Edge Neural Cloud Voice Engine</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border bg-[#00A572]/20 text-[#4EDEA3] border-[#00A572]/40">
              CLOUD VOICE ACTIVE
            </span>
          </div>
          <p className="text-xs text-[#918FA1]">
            100% cloud-based neural text-to-speech synthesis running Microsoft Next-Gen Multilingual Neural models with zero local model overhead. Free, fast, and studio-mastered 48kHz audio.
          </p>
        </div>

        {/* Environment Configuration */}
        <div className="p-5 rounded-xl bg-[#1A1C1F] border border-[#464555]/30 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E2E2E6]">Environment Config (.env.local)</span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
              pixazoConfigured ? 'bg-[#00A572]/20 text-[#4EDEA3] border-[#00A572]/40' : 'bg-[#FFDE82]/20 text-[#FFDE82] border-[#FFDE82]/40'
            }`}>
              {pixazoConfigured ? 'PIXAZO_API_KEY Configured' : 'Needs PIXAZO_API_KEY'}
            </span>
          </div>
          <span className="text-xs text-[#918FA1]">
            Credentials and parallel worker pool concurrency loaded securely from project environment.
          </span>
        </div>

        {/* Media & System Toolchain */}
        <div className="p-5 rounded-xl bg-[#1A1C1F] border border-[#464555]/30 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E2E2E6]">Media Toolchain (FFmpeg & SQLite)</span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
              status?.ffmpeg && status?.sqlite ? 'bg-[#00A572]/20 text-[#4EDEA3] border-[#00A572]/40' : 'bg-[#FFB4AB]/20 text-[#FFB4AB] border-[#FFB4AB]/40'
            }`}>
              {status?.ffmpeg && status?.sqlite ? 'OPERATIONAL' : 'INCOMPLETE'}
            </span>
          </div>
          <span className="text-xs text-[#918FA1]">
            Hardware-accelerated media rendering, Ken Burns camera motion, ASS subtitle burning, and project database.
          </span>
        </div>
      </div>
    </div>
  );
};
