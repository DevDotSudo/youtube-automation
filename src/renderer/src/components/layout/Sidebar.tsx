import React, { useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useSystemStore } from '../../stores/system.store';

export const Sidebar: React.FC = () => {
  const { status, fetchStatus } = useSystemStore();

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const storageInfo = useMemo(() => {
    if (!status || !status.diskTotalGb) {
      return { used: '12.4', total: '512', percent: 18 };
    }
    const free = status.diskFreeGb || 0;
    const total = status.diskTotalGb || 512;
    const used = Math.max(0, total - free);
    const percent = Math.min(100, Math.max(5, Math.round((used / total) * 100)));
    return {
      used: used.toFixed(1),
      total: total.toFixed(0),
      percent
    };
  }, [status]);

  return (
    <aside className="fixed left-0 top-9 bottom-0 w-60 bg-[#101216]/95 backdrop-blur-xl border-r border-white/[0.06] z-40 flex flex-col justify-between overflow-y-auto select-none">
      <div className="p-3.5 flex flex-col gap-6">
        {/* Studio Branding */}
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#8781FF] to-[#4F44E2] flex items-center justify-center text-white shadow-md shadow-[#8781FF]/20 shrink-0">
            <span className="material-symbols-outlined text-[20px]">auto_stories</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#F0F0F3] tracking-tight truncate font-display">GhibliForge</span>
              <span className="text-[9px] font-mono font-bold text-[#8781FF] bg-[#00e5ff] animate-pulse/15 px-1 rounded uppercase">
                v2.4
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#918FA1] truncate">
              Studio Anime Suite
            </span>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono tracking-widest uppercase text-[#7D7A8B] px-3 font-semibold">
            CREATIVE WORKSPACE
          </span>

          <nav className="flex flex-col gap-1">
            <NavLink
              to="/new"
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8781FF]/20 to-[#8781FF]/5 text-[#F0F0F3] font-semibold border border-[#8781FF]/30 shadow-sm shadow-[#8781FF]/10'
                    : 'text-[#C7C4D8] hover:bg-white/[0.04] hover:text-[#F0F0F3]'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-[#8781FF] group-hover:scale-105 transition-transform">
                  bolt
                </span>
                <div className="flex flex-col">
                  <span>Fast Studio</span>
                  <span className="text-[10px] font-normal text-[#918FA1]">New story production</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#8781FF] bg-[#00e5ff] animate-pulse/10 px-1.5 py-0.5 rounded border border-[#8781FF]/20">
                START
              </span>
            </NavLink>

            <NavLink
              to="/projects"
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8781FF]/20 to-[#8781FF]/5 text-[#F0F0F3] font-semibold border border-[#8781FF]/30 shadow-sm shadow-[#8781FF]/10'
                    : 'text-[#C7C4D8] hover:bg-white/[0.04] hover:text-[#F0F0F3]'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-[#4EDEA3] group-hover:scale-105 transition-transform">
                  movie
                </span>
                <div className="flex flex-col">
                  <span>Productions</span>
                  <span className="text-[10px] font-normal text-[#918FA1]">Project timeline library</span>
                </div>
              </div>
            </NavLink>

            <NavLink
              to="/playground"
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8781FF]/20 to-[#8781FF]/5 text-[#F0F0F3] font-semibold border border-[#8781FF]/30 shadow-sm shadow-[#8781FF]/10'
                    : 'text-[#C7C4D8] hover:bg-white/[0.04] hover:text-[#F0F0F3]'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-[#34d399] group-hover:scale-105 transition-transform">
                  palette
                </span>
                <div className="flex flex-col">
                  <span>AI Visual Lab</span>
                  <span className="text-[10px] font-normal text-[#918FA1]">Dual-engine AI generator</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#34d399] bg-[#34d399]/10 px-1.5 py-0.5 rounded border border-[#FFB95F]/20">
                LAB
              </span>
            </NavLink>
          </nav>

          <span className="text-[10px] font-mono tracking-widest uppercase text-[#7D7A8B] px-3 font-semibold mt-3">
            SYSTEM & ENGINES
          </span>

          <nav className="flex flex-col gap-1">
            <NavLink
              to="/system"
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8781FF]/20 to-[#8781FF]/5 text-[#F0F0F3] font-semibold border border-[#8781FF]/30 shadow-sm shadow-[#8781FF]/10'
                    : 'text-[#C7C4D8] hover:bg-white/[0.04] hover:text-[#F0F0F3]'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-[#C4C0FF] group-hover:scale-105 transition-transform">
                  memory
                </span>
                <div className="flex flex-col">
                  <span>System Telemetry</span>
                  <span className="text-[10px] font-normal text-[#918FA1]">Hardware & engines</span>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#4EDEA3] bg-[#4EDEA3]/10 px-1.5 py-0.5 rounded-full border border-[#4EDEA3]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4EDEA3] animate-pulse"></span>
                Ready
              </span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8781FF]/20 to-[#8781FF]/5 text-[#F0F0F3] font-semibold border border-[#8781FF]/30 shadow-sm shadow-[#8781FF]/10'
                    : 'text-[#C7C4D8] hover:bg-white/[0.04] hover:text-[#F0F0F3]'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-[#918FA1] group-hover:scale-105 transition-transform">
                  tune
                </span>
                <div className="flex flex-col">
                  <span>Studio Settings</span>
                  <span className="text-[10px] font-normal text-[#918FA1]">Dual engines & defaults</span>
                </div>
              </div>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Bottom Telemetry & Storage HUD */}
      <div className="p-3.5 border-t border-white/[0.06] flex flex-col gap-3 bg-[#0C0E11]/90">
        {/* Dynamic Storage Meter */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#918FA1] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">hard_drive</span>
              <span>Workspace Disk</span>
            </span>
            <span className="text-[#C7C4D8] font-medium">
              {storageInfo.used} / {storageInfo.total} GB
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                storageInfo.percent > 85
                  ? 'bg-[#FF6B6B]'
                  : storageInfo.percent > 65
                  ? 'bg-[#34d399]'
                  : 'bg-gradient-to-r from-[#8781FF] to-[#4EDEA3]'
              }`}
              style={{ width: `${storageInfo.percent}%` }}
            ></div>
          </div>
        </div>

        {/* Pixazo Parallel Engine Chip */}
        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#C4C0FF] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse"></span>
              Pixazo AI
            </span>
            <span className="text-[#00e5ff] font-bold">5x PARALLEL</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#918FA1]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]"></span>
              Queue Pool
            </span>
            <span className="text-[#34d399]">ACTIVE</span>
          </div>
        </div>

        {/* Version & Sync Status */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[10px] font-mono text-[#7D7A8B]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-[#4EDEA3]">check_circle</span>
            <span>SQLite WAL Synced</span>
          </span>
          <span>16:9 Widescreen</span>
        </div>
      </div>
    </aside>
  );
};
