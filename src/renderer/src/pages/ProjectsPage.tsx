import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/project.store';
import { ProjectStatus } from '../../../shared/enums';
import { getMediaUrl } from '../utils/media';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, fetchProjects, deleteProject, isLoading } = useProjectStore();
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'modified' | 'duration' | 'scenes'>('modified');
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (filter === 'in-progress') return p.status !== ProjectStatus.COMPLETE;
        if (filter === 'completed') return p.status === ProjectStatus.COMPLETE;
        return true;
      })
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sort === 'duration') return b.durationMs - a.durationMs;
        if (sort === 'scenes') return b.sceneCount - a.sceneCount;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [projects, filter, search, sort]);

  const totalScenes = useMemo(() => projects.reduce((acc, p) => acc + p.sceneCount, 0), [projects]);
  const totalDurationSec = useMemo(() => projects.reduce((acc, p) => acc + Math.round(p.durationMs / 1000), 0), [projects]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatTimeHours = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleOpenFolder = (e: React.MouseEvent, projectPath: string) => {
    e.stopPropagation();
    if (window.docuforge?.shell?.openPath) {
      window.docuforge.shell.openPath(projectPath);
    }
  };

  return (
    <div className="p-10 flex flex-col gap-6 w-full select-none">
      {/* Sub-header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-[#8781FF] uppercase bg-[#8781FF]/10 px-2.5 py-0.5 rounded-full border border-[#8781FF]/25 font-bold">
              Production Archives
            </span>
            <span className="text-[#918FA1] text-[11px] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4EDEA3]"></span>
              SQLite WAL Synchronized
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F0F0F3] tracking-tight font-display">
            Story Productions
          </h1>
          <p className="text-xs text-[#C7C4D8]">
            Manage and edit Studio Ghibli watercolor storytelling productions with synchronized multi-track timelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="h-9 px-3.5 flex items-center gap-2 rounded-xl bg-[#121419] text-[#C7C4D8] hover:bg-[#181B22] hover:text-white transition-colors border border-white/[0.06] text-xs font-medium cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] text-[#8781FF]">insights</span>
            <span>{showStats ? 'Hide Telemetry' : 'Show Telemetry'}</span>
          </button>
          <button
            onClick={() => navigate('/new')}
            className="h-9 px-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8781FF] to-[#635BFF] hover:from-[#9B96FF] hover:to-[#736BFF] text-[#0C0E11] font-bold text-xs tracking-wide shadow-md shadow-[#8781FF]/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Production</span>
          </button>
        </div>
      </div>

      {/* Telemetry Bar */}
      {showStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#121419] border border-white/[0.06] shadow-lg">
          <div className="flex items-center gap-3.5 p-3.5 bg-[#0C0E11] rounded-xl border border-white/[0.04]">
            <div className="w-10 h-10 rounded-xl bg-[#8781FF]/15 flex items-center justify-center text-[#8781FF] shrink-0">
              <span className="material-symbols-outlined text-[22px]">video_library</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-[#918FA1] uppercase tracking-wider">Total Productions</span>
              <span className="text-base font-bold font-display text-[#F0F0F3] truncate">{projects.length} Stories</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 bg-[#0C0E11] rounded-xl border border-white/[0.04]">
            <div className="w-10 h-10 rounded-xl bg-[#4EDEA3]/15 flex items-center justify-center text-[#4EDEA3] shrink-0">
              <span className="material-symbols-outlined text-[22px]">layers</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-[#918FA1] uppercase tracking-wider">Synthesized Scenes</span>
              <span className="text-base font-bold font-display text-[#F0F0F3] truncate">{totalScenes} Cuts</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 bg-[#0C0E11] rounded-xl border border-white/[0.04]">
            <div className="w-10 h-10 rounded-xl bg-[#FFB95F]/15 flex items-center justify-center text-[#FFB95F] shrink-0">
              <span className="material-symbols-outlined text-[22px]">timelapse</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-[#918FA1] uppercase tracking-wider">Total Timeline</span>
              <span className="text-base font-bold font-mono text-[#F0F0F3] truncate">{formatTimeHours(totalDurationSec)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 bg-[#0C0E11] rounded-xl border border-white/[0.04]">
            <div className="w-10 h-10 rounded-xl bg-[#C4C0FF]/15 flex items-center justify-center text-[#C4C0FF] shrink-0">
              <span className="material-symbols-outlined text-[22px]">palette</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-[#918FA1] uppercase tracking-wider">Image Engine</span>
              <span className="text-xs font-mono font-semibold text-[#4EDEA3] truncate">Pixazo 5x Parallel</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121419] p-3 rounded-2xl border border-white/[0.06] shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#8781FF]/20 text-[#8781FF] font-semibold border border-[#8781FF]/30'
                : 'text-[#918FA1] hover:bg-white/[0.04] hover:text-[#E2E2E6]'
            }`}
          >
            All <span className="ml-1 font-mono text-[11px] opacity-80">{projects.length}</span>
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              filter === 'in-progress'
                ? 'bg-[#FFB95F]/20 text-[#FFB95F] font-semibold border border-[#FFB95F]/30'
                : 'text-[#918FA1] hover:bg-white/[0.04] hover:text-[#E2E2E6]'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              filter === 'completed'
                ? 'bg-[#4EDEA3]/20 text-[#4EDEA3] font-semibold border border-[#4EDEA3]/30'
                : 'text-[#918FA1] hover:bg-white/[0.04] hover:text-[#E2E2E6]'
            }`}
          >
            Completed
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined text-[#918FA1] text-[16px] absolute left-3 top-2.5">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search productions..."
              className="w-full h-8 pl-8 pr-3 bg-[#0C0E11] text-[#E2E2E6] text-xs rounded-xl border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#8781FF]"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 h-8 bg-[#0C0E11] rounded-xl border border-white/[0.08] text-xs text-[#918FA1]">
            <span className="material-symbols-outlined text-[15px]">sort</span>
            <select
              value={sort}
              onChange={(e: any) => setSort(e.target.value)}
              className="bg-transparent text-[#E2E2E6] text-xs focus:outline-none cursor-pointer"
            >
              <option value="modified" className="bg-[#121419]">Last Modified</option>
              <option value="duration" className="bg-[#121419]">Duration</option>
              <option value="scenes" className="bg-[#121419]">Scene Count</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-[#918FA1] gap-3">
          <span className="material-symbols-outlined text-[36px] animate-spin text-[#8781FF]">progress_activity</span>
          <span className="text-xs font-mono">Loading productions...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-16 rounded-2xl border border-dashed border-white/[0.1] bg-[#121419]/40 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#918FA1]">
            <span className="material-symbols-outlined text-[32px]">movie</span>
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <span className="text-base font-semibold text-[#F0F0F3]">No story productions found</span>
            <p className="text-xs text-[#918FA1]">
              {search ? 'Try adjusting your search query or filter.' : 'Create a story production to begin synthesizing automated anime videos.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/new')}
            className="mt-2 h-9 px-4 rounded-xl bg-[#8781FF] text-[#0C0E11] font-bold text-xs hover:bg-[#9D98FF] transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#8781FF]/20"
          >
            <span className="material-symbols-outlined text-[17px]">add</span>
            <span>Create First Production</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProjects.map((p) => {
            const isCompleted = p.status === ProjectStatus.COMPLETE;
            const isReview = p.status === ProjectStatus.REVIEW;

            return (
              <div
                key={p.id}
                className="group flex flex-col rounded-2xl bg-[#121419] border border-white/[0.06] hover:border-[#8781FF]/40 overflow-hidden transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-[#8781FF]/10"
              >
                {/* 16:9 Thumbnail Header */}
                <div
                  onClick={() => navigate(`/project/${p.id}/render`)}
                  onMouseEnter={(e) => { const v = e.currentTarget.querySelector('video'); if (v) v.play().catch(() => {}); }}
                  onMouseLeave={(e) => { const v = e.currentTarget.querySelector('video'); if (v) { v.pause(); v.currentTime = 0; } }}
                  className="w-full aspect-video bg-[#0C0E11] relative flex items-center justify-center overflow-hidden cursor-pointer border-b border-white/[0.06]"
                >
                  {p.thumbnailPath ? (
                    p.thumbnailPath.toLowerCase().match(/\.(mp4|webm|mov|mkv)$/) ? (
                      <video
                        src={getMediaUrl(p.thumbnailPath)}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />
                    ) : (
                      <img
                        src={getMediaUrl(p.thumbnailPath)}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0C0E11] via-transparent to-transparent opacity-80 z-10"></div>
                      <span className="material-symbols-outlined text-[#37393D] text-[48px] group-hover:scale-110 transition-transform">
                        movie_creation
                      </span>
                    </>
                  )}

                  {/* Top Status Badge */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                      p.platform === 'FACEBOOK'
                        ? 'bg-[#1877F2]/20 text-[#60A5FA] border-[#1877F2]/40'
                        : 'bg-[#FF0000]/15 text-[#F87171] border-[#FF0000]/30'
                    }`}>
                      {p.platform === 'FACEBOOK' ? 'Facebook 9:16' : 'YouTube 16:9'}
                    </span>
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
                      isCompleted
                        ? 'bg-[#4EDEA3]/20 text-[#4EDEA3] border-[#4EDEA3]/40'
                        : isReview
                        ? 'bg-[#FFB95F]/20 text-[#FFB95F] border-[#FFB95F]/40'
                        : 'bg-[#8781FF]/20 text-[#C4C0FF] border-[#8781FF]/40'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Bottom Stats Overlay */}
                  <div className="absolute bottom-2.5 left-3 right-3 z-20 flex items-center justify-between text-[11px] font-mono text-[#E2E2E6]">
                    <span className="flex items-center gap-1 bg-[#0C0E11]/85 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-white/[0.1]">
                      <span className="material-symbols-outlined text-[13px] text-[#8781FF]">schedule</span>
                      {formatTime(p.durationMs)}
                    </span>
                    <span className="flex items-center gap-1 bg-[#0C0E11]/85 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-white/[0.1]">
                      <span className="material-symbols-outlined text-[13px] text-[#4EDEA3]">view_carousel</span>
                      {p.sceneCount} Scenes
                    </span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 flex flex-col justify-between flex-1 gap-3.5">
                  <div className="flex flex-col gap-1">
                    <h3
                      onClick={() => navigate(`/project/${p.id}/render`)}
                      className="text-sm font-bold text-[#F0F0F3] hover:text-[#8781FF] cursor-pointer truncate transition-colors"
                      title={p.name}
                    >
                      {p.name}
                    </h3>
                    <span className="text-[11px] font-mono text-[#7D7A8B]">
                      Updated {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/project/${p.id}/render`)}
                        className="h-8 px-2.5 rounded-xl bg-[#8781FF]/15 hover:bg-[#8781FF]/25 text-[#C4C0FF] hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 border border-[#8781FF]/30 cursor-pointer"
                        title="Open in Timeline Editor"
                      >
                        <span className="material-symbols-outlined text-[16px]">timeline</span>
                        <span>Editor</span>
                      </button>

                      <button
                        onClick={() => navigate(`/project/${p.id}/review`)}
                        className="h-8 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#C7C4D8] hover:text-white text-xs font-medium transition-colors flex items-center gap-1 border border-white/[0.06] cursor-pointer"
                        title="Open in Review Workbench"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        <span>Review</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenFolder(e, p.projectPath)}
                        className="w-8 h-8 rounded-xl hover:bg-white/[0.06] text-[#918FA1] hover:text-[#F0F0F3] flex items-center justify-center transition-colors cursor-pointer"
                        title="Open folder in File Explorer"
                      >
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                      </button>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
                            await deleteProject(p.id);
                          }
                        }}
                        className="w-8 h-8 rounded-xl hover:bg-[#FF453A]/20 text-[#918FA1] hover:text-[#FF8577] flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete project"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
