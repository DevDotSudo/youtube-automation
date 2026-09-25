import React, { useState, useEffect, useRef, useCallback, JSX } from 'react'
import { StockMediaItem, LocalClipRecord, StockSearchOptions } from '../../../shared/types'
import { getMediaUrl } from '../utils/media'

const PRESET_TAGS = [
  'Cinematic Nature',
  'Space & Galaxy',
  'Drone Aerial',
  'Vintage History',
  'Cyberpunk City',
  'Wildlife Animals',
  'Dark Moody',
  'Luxury Lifestyle',
  'Technology & AI',
  'Ocean Waves'
]

const SOURCE_BADGES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  pexels: { label: 'Pexels', bg: 'bg-[#00e5ff]/15', text: 'text-[#00e5ff]', border: 'border-[#00e5ff]/30' },
  pixabay: { label: 'Pixabay', bg: 'bg-[#34d399]/15', text: 'text-[#34d399]', border: 'border-[#34d399]/30' },
  nasa: { label: 'NASA Space', bg: 'bg-[#8781FF]/20', text: 'text-[#C4C0FF]', border: 'border-[#8781FF]/40' },
  wikimedia: { label: 'Wikimedia', bg: 'bg-[#F59E0B]/20', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/40' },
  archive: { label: 'Archive.org', bg: 'bg-[#F43F5E]/20', text: 'text-[#F43F5E]', border: 'border-[#F43F5E]/40' },
  youtube: { label: 'YouTube (Audio)', bg: 'bg-[#EF4444]/20', text: 'text-[#EF4444]', border: 'border-[#EF4444]/40' },
  pinterest: { label: 'Pinterest', bg: 'bg-[#E60023]/20', text: 'text-[#E60023]', border: 'border-[#E60023]/40' }
}

const PLATFORM_TABS: { id: StockSearchOptions['source']; label: string; icon: string; audio?: boolean }[] = [
  { id: 'all', label: 'All Sources', icon: 'hub' },
  { id: 'pexels', label: 'Pexels (4K)', icon: 'photo_camera' },
  { id: 'pixabay', label: 'Pixabay', icon: 'image' },
  { id: 'nasa', label: 'NASA Space', icon: 'rocket_launch', audio: true },
  { id: 'wikimedia', label: 'Wikimedia', icon: 'public', audio: true },
  { id: 'archive', label: 'Archive (Vintage)', icon: 'history_edu', audio: true },
  { id: 'youtube', label: 'YouTube B-Roll', icon: 'smart_display', audio: true }
]

export const ClipsFinderPage: React.FC = () => {
  // Navigation & View tabs
  const [activeTab, setActiveTab] = useState<'discover' | 'saved'>('discover')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('cinematic 4k')
  const [activePlatform, setActivePlatform] = useState<StockSearchOptions['source']>('all')
  const [activeOrientation, setActiveOrientation] = useState<
    'all' | 'landscape' | 'portrait' | 'square'
  >('all')
  const [page, setPage] = useState(1)

  // Clips data
  const [clips, setClips] = useState<StockMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Saved local clips & folder
  const [clipsFolder, setClipsFolder] = useState<string>('')
  const [savedClips, setSavedClips] = useState<LocalClipRecord[]>([])
  const [isLoadingSaved, setIsLoadingSaved] = useState(false)

  // Download states (in-progress IDs and success IDs)
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [downloadedSuccessIds, setDownloadedSuccessIds] = useState<Set<string>>(new Set())

  // Interactive Video Preview Modal
  const [previewClip, setPreviewClip] = useState<StockMediaItem | null>(null)
  const [selectedQualityFile, setSelectedQualityFile] = useState<string>('')

  // Local video playback modal (for saved clips)
  const [localPreviewClip, setLocalPreviewClip] = useState<LocalClipRecord | null>(null)

  // Hover preview state
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null)

  // Toast notifications
  const [toast, setToast] = useState<{
    title: string
    message: string
    filePath?: string
  } | null>(null)

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  const showToast = useCallback((title: string, message: string, filePath?: string): void => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ title, message, filePath })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
    }, 6000)
  }, [])

  const loadSavedClips = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingSaved(true)
      if (window.docuforge?.stockMedia?.getDownloadedClips) {
        const items = await window.docuforge.stockMedia.getDownloadedClips()
        setSavedClips(items || [])
      }
    } catch (err) {
      console.error('[ClipsFinder] Failed to load saved clips:', err)
    } finally {
      setIsLoadingSaved(false)
    }
  }, [])

  // Perform video search
  const performSearch = useCallback(
    async (
      query: string,
      platform: StockSearchOptions['source'],
      orientation: 'all' | 'landscape' | 'portrait' | 'square',
      pageNumber = 1,
      append = false
    ): Promise<void> => {
      if (!query.trim()) return

      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
        setErrorMessage(null)
      }

      try {
        if (window.docuforge?.stockMedia?.search) {
          const results = await window.docuforge.stockMedia.search({
            query: query.trim(),
            source: platform,
            orientation,
            page: pageNumber,
            limit: 24
          })

          if (append) {
            setClips((prev) => {
              const existingIds = new Set(prev.map((c) => c.id))
              const newItems = results.filter((c) => !existingIds.has(c.id))
              return [...prev, ...newItems]
            })
          } else {
            setClips(results || [])
          }
        }
      } catch (err: unknown) {
        console.error('[ClipsFinder] Search error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        setErrorMessage(msg || 'Failed to search stock videos. Please try again.')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    []
  )

  // Fetch local clips folder and library on mount
  useEffect(() => {
    let isMounted = true
    const initData = async (): Promise<void> => {
      try {
        if (window.docuforge?.stockMedia?.getClipsFolder) {
          const folder = await window.docuforge.stockMedia.getClipsFolder()
          if (isMounted) setClipsFolder(folder)
        }
        if (window.docuforge?.stockMedia?.getDownloadedClips) {
          const items = await window.docuforge.stockMedia.getDownloadedClips()
          if (isMounted) setSavedClips(items || [])
        }
        if (window.docuforge?.stockMedia?.search) {
          if (isMounted) setIsLoading(true)
          const results = await window.docuforge.stockMedia.search({
            query: 'cinematic 4k',
            source: 'all',
            orientation: 'all',
            page: 1,
            limit: 24
          })
          if (isMounted) setClips(results || [])
        }
      } catch (err: unknown) {
        console.error('[ClipsFinder] Initial load error:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void initData()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSearchSubmit = (e?: React.FormEvent): void => {
    if (e) e.preventDefault()
    setPage(1)
    performSearch(searchQuery, activePlatform, activeOrientation, 1, false)
  }

  const handlePresetTagClick = (tag: string): void => {
    setSearchQuery(tag)
    setPage(1)
    performSearch(tag, activePlatform, activeOrientation, 1, false)
  }

  const handlePlatformChange = (p: StockSearchOptions['source']): void => {
    setActivePlatform(p)
    setPage(1)
    performSearch(searchQuery, p, activeOrientation, 1, false)
  }

  const handleOrientationChange = (o: 'all' | 'landscape' | 'portrait' | 'square'): void => {
    setActiveOrientation(o)
    setPage(1)
    performSearch(searchQuery, activePlatform, o, 1, false)
  }

  const handleLoadMore = (): void => {
    const nextPage = page + 1
    setPage(nextPage)
    performSearch(searchQuery, activePlatform, activeOrientation, nextPage, true)
  }

  // Local folder selection
  const handleChangeFolder = async (): Promise<void> => {
    try {
      if (window.docuforge?.stockMedia?.selectClipsFolder) {
        const res = await window.docuforge.stockMedia.selectClipsFolder()
        if (!res.canceled && res.folderPath) {
          setClipsFolder(res.folderPath)
          showToast('Folder Updated', `Clips will now be saved to: ${res.folderPath}`)
          loadSavedClips()
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast('Error', msg || 'Could not change clips folder')
    }
  }

  const handleOpenFolder = (): void => {
    if (clipsFolder && window.docuforge?.shell?.openPath) {
      window.docuforge.shell.openPath(clipsFolder)
    }
  }

  // Quick Save or Save As
  const handleDownloadClip = async (
    clip: StockMediaItem,
    chooseLocation = false,
    customUrl?: string
  ): Promise<void> => {
    const targetUrl = customUrl || clip.downloadUrl
    if (!targetUrl) {
      showToast('Download Error', 'No valid download link found for this clip.')
      return
    }

    setDownloadingIds((prev) => new Set(prev).add(clip.id))

    try {
      if (window.docuforge?.stockMedia?.saveClipLocally) {
        const res = await window.docuforge.stockMedia.saveClipLocally({
          url: targetUrl,
          title: clip.title,
          targetDirectory: clipsFolder,
          chooseLocation
        })

        if (res.success && res.filePath) {
          setDownloadedSuccessIds((prev) => new Set(prev).add(clip.id))
          const sizeMb = res.fileSize ? (res.fileSize / (1024 * 1024)).toFixed(1) : '?'
          showToast(
            'Clip Saved Locally!',
            `Downloaded ${clip.title.slice(0, 30)}... (${sizeMb} MB)`,
            res.filePath
          )
          loadSavedClips()
        } else if (res.error && res.error !== 'Save canceled') {
          showToast('Download Failed', res.error)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast('Download Error', msg || 'Failed to download clip')
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev)
        next.delete(clip.id)
        return next
      })
    }
  }

  const handleDeleteSavedClip = async (filePath: string): Promise<void> => {
    if (!confirm('Are you sure you want to remove this downloaded clip from your disk?')) return
    try {
      if (window.docuforge?.stockMedia?.deleteDownloadedClip) {
        const success = await window.docuforge.stockMedia.deleteDownloadedClip(filePath)
        if (success) {
          showToast('Clip Removed', 'File deleted from local storage.')
          loadSavedClips()
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast('Delete Error', msg || 'Could not delete file')
    }
  }

  const handleRevealInExplorer = (filePath: string): void => {
    if (window.docuforge?.shell?.showItemInFolder) {
      window.docuforge.shell.showItemInFolder(filePath)
    }
  }

  const formatDuration = (sec?: number): string => {
    if (!sec) return '0:10'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return '0 MB'
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0D10] text-[#F0F0F3] overflow-y-auto select-none">
      {/* Top Header HUD */}
      <header className="sticky top-0 z-30 bg-[#0B0D10]/95 backdrop-blur-md border-b border-white/[0.06] px-8 py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00e5ff] via-[#3a86ff] to-[#8781FF] flex items-center justify-center text-white shadow-lg shadow-[#00e5ff]/20 shrink-0">
            <span className="material-symbols-outlined text-[24px]">video_search</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-display">
                Clips Finder
              </h1>
              <span className="text-[10px] font-mono font-bold text-[#00e5ff] bg-[#00e5ff]/15 px-2 py-0.5 rounded-full border border-[#00e5ff]/30 uppercase">
                Free 4K / HD
              </span>
            </div>
            <p className="text-xs text-[#918FA1] mt-0.5">
              Browse, preview & download high-res royalty-free stock clips directly to your computer
            </p>
          </div>
        </div>

        {/* Right Section: Folder HUD & Tab Switcher */}
        <div className="flex items-center gap-3">
          {/* Destination Folder Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
            <span className="material-symbols-outlined text-[16px] text-[#00e5ff]">folder</span>
            <div className="flex flex-col max-w-[200px]">
              <span className="text-[9px] font-mono uppercase text-[#7D7A8B] tracking-wider">
                Save Folder
              </span>
              <span className="text-[11px] font-mono text-[#C7C4D8] truncate" title={clipsFolder}>
                {clipsFolder
                  ? clipsFolder.split(/[\\/]/).pop() || clipsFolder
                  : 'Downloads/Stock Clips'}
              </span>
            </div>
            <div className="flex items-center gap-1 ml-1 pl-2 border-l border-white/[0.08]">
              <button
                onClick={handleChangeFolder}
                title="Change destination folder"
                className="p-1 hover:bg-white/[0.08] rounded text-[#918FA1] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
              </button>
              <button
                onClick={handleOpenFolder}
                title="Open folder in File Explorer"
                className="p-1 hover:bg-white/[0.08] rounded text-[#918FA1] hover:text-[#00e5ff] transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              </button>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <button
              onClick={(): void => setActiveTab('discover')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'discover'
                  ? 'bg-gradient-to-r from-[#00e5ff]/20 to-[#8781FF]/20 text-white shadow-sm border border-[#00e5ff]/30'
                  : 'text-[#918FA1] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">travel_explore</span>
              <span>Discover Clips</span>
              {clips.length > 0 && (
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.1] text-white">
                  {clips.length}
                </span>
              )}
            </button>

            <button
              onClick={(): void => {
                setActiveTab('saved')
                loadSavedClips()
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'saved'
                  ? 'bg-gradient-to-r from-[#34d399]/20 to-[#4EDEA3]/20 text-white shadow-sm border border-[#34d399]/30'
                  : 'text-[#918FA1] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">download_done</span>
              <span>Saved Locally</span>
              {savedClips.length > 0 && (
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#34d399]/20 text-[#34d399] font-bold">
                  {savedClips.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
        {activeTab === 'discover' ? (
          <>
            {/* Search Box & Controls Card */}
            <div className="p-5 rounded-2xl bg-[#101216]/90 border border-white/[0.07] backdrop-blur-xl shadow-xl flex flex-col gap-4">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
                <div className="relative flex-1 flex items-center">
                  <span className="absolute left-4 material-symbols-outlined text-[20px] text-[#918FA1] pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e): void => setSearchQuery(e.target.value)}
                    placeholder="Search high-res stock videos (e.g. drone mountain landscape, cyberpunk street, luxury car)..."
                    className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] focus:border-[#00e5ff]/50 rounded-xl pl-11 pr-10 py-3 text-sm text-[#F0F0F3] placeholder-[#7D7A8B] outline-none transition-all focus:ring-2 focus:ring-[#00e5ff]/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(): void => setSearchQuery('')}
                      className="absolute right-3 p-1 rounded-full text-[#7D7A8B] hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#4F44E2] hover:opacity-95 active:scale-[0.98] text-white font-semibold text-sm shadow-lg shadow-[#00e5ff]/20 flex items-center gap-2 transition-all shrink-0 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">search</span>
                  )}
                  <span>Search Clips</span>
                </button>
              </form>

              {/* Preset Tags */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-mono text-[#7D7A8B] uppercase shrink-0">
                  Popular:
                </span>
                {PRESET_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={(): void => handlePresetTagClick(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all border ${
                      searchQuery.toLowerCase() === tag.toLowerCase()
                        ? 'bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/30 shadow-sm'
                        : 'bg-white/[0.03] text-[#918FA1] border-white/[0.05] hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Filters Bar: Platform & Orientation */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/[0.05]">
                {/* Platform Source Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <span className="text-xs font-mono text-[#918FA1] mr-1 shrink-0">Platform:</span>
                  {PLATFORM_TABS.map((p) => {
                    const isActive = activePlatform === p.id
                    return (
                      <button
                        key={p.id}
                        onClick={(): void => handlePlatformChange(p.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border shrink-0 ${
                          isActive
                            ? 'bg-white/[0.12] text-white border-white/[0.25] shadow-sm font-semibold'
                            : 'bg-transparent text-[#918FA1] border-transparent hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">{p.icon}</span>
                        <span>{p.label}</span>
                        {p.audio && (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                            🔊
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Aspect Ratio / Orientation Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-[#918FA1] mr-1">Format:</span>
                  {(
                    [
                      { id: 'all', label: 'All Formats', icon: 'aspect_ratio' },
                      { id: 'landscape', label: '16:9 Landscape', icon: 'crop_16_9' },
                      { id: 'portrait', label: '9:16 Vertical Reel', icon: 'crop_portrait' },
                      { id: 'square', label: '1:1 Square', icon: 'crop_square' }
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.id}
                      onClick={(): void => handleOrientationChange(o.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        activeOrientation === o.id
                          ? 'bg-[#8781FF]/20 text-[#C4C0FF] border-[#8781FF]/40 shadow-sm font-semibold'
                          : 'bg-transparent text-[#918FA1] border-transparent hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{o.icon}</span>
                      <span>{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-[#FF4E4E]/10 border border-[#FF4E4E]/30 text-[#FF4E4E] text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={(): void => handleSearchSubmit()}
                  className="px-2.5 py-1 rounded bg-[#FF4E4E]/20 hover:bg-[#FF4E4E]/30 text-white font-medium"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Results Grid */}
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-4 text-[#918FA1]">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full border-2 border-[#00e5ff]/20 border-t-[#00e5ff] animate-spin"></div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">
                    Searching free stock video platforms...
                  </p>
                  <p className="text-xs text-[#7D7A8B] mt-1">
                    Retrieving 4K & HD video streams and metadata
                  </p>
                </div>
              </div>
            ) : clips.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#918FA1] rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <span className="material-symbols-outlined text-[44px] text-[#7D7A8B]">movie</span>
                <p className="text-base font-semibold text-white">No video clips found</p>
                <p className="text-xs text-[#7D7A8B] max-w-sm text-center">
                  Try searching with broader terms like &quot;nature&quot;, &quot;city&quot;,
                  &quot;ocean&quot;, or select &quot;All Formats&quot;.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between text-xs text-[#918FA1]">
                  <span>
                    Showing <span className="text-white font-semibold">{clips.length}</span> clips
                    for{' '}
                    <span className="text-[#00e5ff] font-semibold">&quot;{searchQuery}&quot;</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#7D7A8B]">
                    Hover card for live video preview
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {clips.map((clip) => {
                    const isDownloading = downloadingIds.has(clip.id)
                    const isSaved = downloadedSuccessIds.has(clip.id)
                    const isHovered = hoveredClipId === clip.id

                    return (
                      <div
                        key={clip.id}
                        onMouseEnter={(): void => setHoveredClipId(clip.id)}
                        onMouseLeave={(): void => setHoveredClipId(null)}
                        className="group relative rounded-xl overflow-hidden bg-[#14171C] border border-white/[0.07] hover:border-[#00e5ff]/40 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#00e5ff]/10 flex flex-col"
                      >
                        {/* Video / Thumbnail Container */}
                        <div
                          className="relative w-full aspect-video bg-black/60 overflow-hidden cursor-pointer"
                          onClick={(): void => {
                            setPreviewClip(clip)
                            setSelectedQualityFile(clip.downloadUrl)
                          }}
                        >
                          {/* Poster Image */}
                          {clip.thumbnailUrl ? (
                            <img
                              src={clip.thumbnailUrl}
                              alt={clip.title}
                              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                                isHovered && clip.previewUrl ? 'opacity-0' : 'opacity-100'
                              }`}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black/50 text-[#7D7A8B]">
                              <span className="material-symbols-outlined text-[32px]">
                                videocam
                              </span>
                            </div>
                          )}

                          {/* Hover Auto-Preview Video */}
                          {isHovered && clip.previewUrl && clip.source !== 'youtube' && (
                            <video
                              src={clip.previewUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="absolute inset-0 w-full h-full object-cover z-10"
                            />
                          )}

                          {/* Top Badges Overlay */}
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-none">
                            <span
                              className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md border ${
                                SOURCE_BADGES[clip.source]?.bg || 'bg-black/70'
                              } ${
                                SOURCE_BADGES[clip.source]?.text || 'text-[#00e5ff]'
                              } ${
                                SOURCE_BADGES[clip.source]?.border || 'border-white/[0.1]'
                              }`}
                            >
                              {SOURCE_BADGES[clip.source]?.label || clip.source}
                            </span>
                            <div className="flex items-center gap-1">
                              {/* Audio Indicator Badge */}
                              {clip.hasAudio ? (
                                <span
                                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/25 backdrop-blur-md border border-emerald-500/40 text-emerald-300 flex items-center gap-0.5"
                                  title="Original clip includes audio"
                                >
                                  <span className="material-symbols-outlined text-[10px]">
                                    volume_up
                                  </span>
                                  Audio
                                </span>
                              ) : (
                                <span
                                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/[0.08] text-[#918FA1] flex items-center gap-0.5"
                                  title="Silent B-Roll clip (Visual only)"
                                >
                                  <span className="material-symbols-outlined text-[10px]">
                                    volume_off
                                  </span>
                                  Silent
                                </span>
                              )}
                              {clip.resolution && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/[0.1] text-[#34d399]">
                                  {clip.resolution}
                                </span>
                              )}
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/[0.1] text-[#C7C4D8]">
                                {clip.aspectRatio || '16:9'}
                              </span>
                            </div>
                          </div>

                          {/* Bottom Badges: Duration & Quick Play Icon */}
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-none">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white font-medium border border-white/[0.1]">
                              {formatDuration(clip.durationSec)}
                            </span>
                            <div className="w-7 h-7 rounded-full bg-black/70 backdrop-blur-md border border-white/[0.2] flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="material-symbols-outlined text-[16px]">
                                play_arrow
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Content & Action Bar */}
                        <div className="p-3 flex flex-col justify-between flex-1 gap-2 bg-[#121418]">
                          <div>
                            <h3
                              className="text-xs font-semibold text-[#F0F0F3] truncate group-hover:text-[#00e5ff] transition-colors"
                              title={clip.title}
                            >
                              {clip.title}
                            </h3>
                            <div className="flex items-center justify-between text-[11px] text-[#918FA1] mt-1">
                              <span className="truncate">By {clip.author || 'Stock Creator'}</span>
                              {clip.width && clip.height && (
                                <span className="text-[10px] font-mono text-[#7D7A8B]">
                                  {clip.width}x{clip.height}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Buttons: Quick Save, Save As, and Preview */}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.04]">
                            <button
                              onClick={(): Promise<void> => handleDownloadClip(clip, false)}
                              disabled={isDownloading}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                                isSaved
                                  ? 'bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30'
                                  : 'bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 text-[#00e5ff] border border-[#00e5ff]/30 active:scale-95'
                              }`}
                            >
                              {isDownloading ? (
                                <>
                                  <span className="material-symbols-outlined text-[14px] animate-spin">
                                    progress_activity
                                  </span>
                                  <span>Saving...</span>
                                </>
                              ) : isSaved ? (
                                <>
                                  <span className="material-symbols-outlined text-[14px]">
                                    check
                                  </span>
                                  <span>Saved</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[14px]">
                                    download
                                  </span>
                                  <span>Quick Save</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={(): Promise<void> => handleDownloadClip(clip, true)}
                              title="Save As (Choose custom folder/filename)..."
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#918FA1] hover:text-white border border-white/[0.06] transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">save_as</span>
                            </button>

                            <button
                              onClick={(): void => {
                                setPreviewClip(clip)
                                setSelectedQualityFile(clip.downloadUrl)
                              }}
                              title="Full Video Preview"
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#918FA1] hover:text-white border border-white/[0.06] transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                fullscreen
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Load More Button */}
                <div className="py-6 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-8 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm font-semibold text-white flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">
                          progress_activity
                        </span>
                        <span>Loading More Clips...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">expand_more</span>
                        <span>Load More Clips</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* "Saved Locally" Tab View */
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[24px] text-[#34d399]">
                  folder_zip
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white">Local Clips Directory</h2>
                  <p className="text-xs text-[#918FA1] font-mono truncate max-w-lg">
                    {clipsFolder}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadSavedClips}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-white flex items-center gap-1.5 border border-white/[0.06] transition-all"
                >
                  <span className="material-symbols-outlined text-[15px]">refresh</span>
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleOpenFolder}
                  className="px-3 py-1.5 rounded-lg bg-[#34d399]/15 hover:bg-[#34d399]/25 text-xs font-semibold text-[#34d399] flex items-center gap-1.5 border border-[#34d399]/30 transition-all"
                >
                  <span className="material-symbols-outlined text-[15px]">folder_open</span>
                  <span>Open in Explorer</span>
                </button>
              </div>
            </div>

            {isLoadingSaved ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#918FA1]">
                <span className="material-symbols-outlined text-[24px] animate-spin text-[#34d399]">
                  progress_activity
                </span>
                <span className="text-xs">Scanning local clips...</span>
              </div>
            ) : savedClips.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#918FA1] rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <span className="material-symbols-outlined text-[44px] text-[#7D7A8B]">
                  cloud_download
                </span>
                <p className="text-base font-semibold text-white">No saved clips yet</p>
                <p className="text-xs text-[#7D7A8B] max-w-sm text-center">
                  Search clips in the &quot;Discover Clips&quot; tab and click &quot;Quick
                  Save&quot; to download clips locally to this folder.
                </p>
                <button
                  onClick={(): void => setActiveTab('discover')}
                  className="mt-2 px-5 py-2 rounded-xl bg-[#00e5ff]/20 hover:bg-[#00e5ff]/30 text-xs font-semibold text-[#00e5ff] border border-[#00e5ff]/30"
                >
                  Go to Discover Clips
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {savedClips.map((clip) => (
                  <div
                    key={clip.filePath}
                    className="group rounded-xl overflow-hidden bg-[#14171C] border border-white/[0.07] hover:border-[#34d399]/40 transition-all duration-300 shadow-md flex flex-col"
                  >
                    <div
                      className="relative w-full aspect-video bg-black/70 overflow-hidden cursor-pointer flex items-center justify-center"
                      onClick={(): void => setLocalPreviewClip(clip)}
                    >
                      <video
                        src={getMediaUrl(clip.filePath)}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.2] flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-[22px]">play_arrow</span>
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-white">
                        {formatBytes(clip.sizeBytes)}
                      </div>
                    </div>

                    <div className="p-3 flex flex-col justify-between flex-1 gap-2 bg-[#121418]">
                      <div>
                        <h3
                          className="text-xs font-semibold text-[#F0F0F3] truncate"
                          title={clip.filename}
                        >
                          {clip.filename}
                        </h3>
                        <p className="text-[10px] font-mono text-[#7D7A8B] mt-0.5">
                          {new Date(clip.createdAt).toLocaleDateString()} at{' '}
                          {new Date(clip.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.04]">
                        <button
                          onClick={(): void => setLocalPreviewClip(clip)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-white flex items-center justify-center gap-1 border border-white/[0.06] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          <span>Play</span>
                        </button>
                        <button
                          onClick={(): void => handleRevealInExplorer(clip.filePath)}
                          title="Show file in Windows Explorer"
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#918FA1] hover:text-[#00e5ff] border border-white/[0.06] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">folder</span>
                        </button>
                        <button
                          onClick={(): Promise<void> => handleDeleteSavedClip(clip.filePath)}
                          title="Delete clip from disk"
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-[#FF4E4E]/20 text-[#918FA1] hover:text-[#FF4E4E] border border-white/[0.06] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Interactive Full Video Preview Modal (For Stock Clips) */}
      {previewClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#121418] border border-white/[0.1] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4 bg-[#14171C]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                    SOURCE_BADGES[previewClip.source]?.bg || 'bg-[#00e5ff]/15'
                  } ${
                    SOURCE_BADGES[previewClip.source]?.text || 'text-[#00e5ff]'
                  } ${
                    SOURCE_BADGES[previewClip.source]?.border || 'border-[#00e5ff]/30'
                  }`}
                >
                  {SOURCE_BADGES[previewClip.source]?.label || previewClip.source}
                </span>
                <h2 className="text-sm font-bold text-white truncate font-display">
                  {previewClip.title}
                </h2>
              </div>
              <button
                onClick={(): void => setPreviewClip(null)}
                className="p-1.5 rounded-full text-[#918FA1] hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Video Player */}
            <div className="relative w-full bg-black flex items-center justify-center max-h-[55vh] overflow-hidden">
              {previewClip.source === 'youtube' ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${previewClip.id.replace(/^yt-/, '')}?autoplay=1&rel=0`}
                  title={previewClip.title}
                  className="w-full h-[55vh] border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={selectedQualityFile || previewClip.downloadUrl || previewClip.previewUrl}
                  controls
                  autoPlay
                  loop
                  className="max-h-[55vh] w-auto max-w-full object-contain"
                />
              )}
            </div>

            {/* Modal Footer & Details */}
            <div className="p-6 flex flex-col gap-4 bg-[#121418] overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Resolution & Details Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {previewClip.hasAudio ? (
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">volume_up</span>
                      Original Audio Included
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#918FA1] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">volume_off</span>
                      Silent Stock B-Roll
                    </span>
                  )}
                  {previewClip.license && (
                    <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      {previewClip.license}
                    </span>
                  )}
                  {previewClip.width && previewClip.height && (
                    <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white">
                      {previewClip.width} x {previewClip.height}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#00e5ff]">
                    {previewClip.aspectRatio || '16:9'}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#34d399]">
                    {formatDuration(previewClip.durationSec)}
                  </span>
                  {previewClip.fps && (
                    <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#C4C0FF]">
                      {previewClip.fps} FPS
                    </span>
                  )}
                  {previewClip.author && (
                    <span className="text-xs text-[#918FA1]">
                      Creator: <span className="text-white font-medium">{previewClip.author}</span>
                    </span>
                  )}
                </div>

                {/* Available Quality Picker */}
                {previewClip.videoFiles && previewClip.videoFiles.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-[#7D7A8B]">Quality:</span>
                    <select
                      value={selectedQualityFile}
                      onChange={(e): void => setSelectedQualityFile(e.target.value)}
                      className="bg-white/[0.05] border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#00e5ff]"
                    >
                      {previewClip.videoFiles.map((f, i): JSX.Element => (
                        <option key={i} value={f.link} className="bg-[#121418] text-white">
                          {f.quality?.toUpperCase() || `${f.width}p`} ({f.width}x{f.height})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={(): Promise<void> =>
                    handleDownloadClip(previewClip, true, selectedQualityFile)
                  }
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">save_as</span>
                  <span>Save As...</span>
                </button>

                <button
                  onClick={(): Promise<void> =>
                    handleDownloadClip(previewClip, false, selectedQualityFile)
                  }
                  disabled={downloadingIds.has(previewClip.id)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#4F44E2] hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-[#00e5ff]/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {downloadingIds.has(previewClip.id) ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                      <span>Saving to Disk...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Save to Local Clips</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local Video Playback Modal (For Saved Clips) */}
      {localPreviewClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#121418] border border-white/[0.1] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4 bg-[#14171C]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#34d399] text-[20px]">movie</span>
                <h2 className="text-sm font-bold text-white truncate font-display">
                  {localPreviewClip.filename}
                </h2>
              </div>
              <button
                onClick={(): void => setLocalPreviewClip(null)}
                className="p-1.5 rounded-full text-[#918FA1] hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="relative w-full bg-black flex items-center justify-center max-h-[60vh] overflow-hidden">
              <video
                src={getMediaUrl(localPreviewClip.filePath)}
                controls
                autoPlay
                className="max-h-[60vh] w-auto max-w-full object-contain"
              />
            </div>

            <div className="p-4 px-6 flex items-center justify-between gap-4 bg-[#121418] border-t border-white/[0.06]">
              <span className="text-xs font-mono text-[#918FA1]">
                {formatBytes(localPreviewClip.sizeBytes)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(): void => handleRevealInExplorer(localPreviewClip.filePath)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">folder</span>
                  <span>Show in Explorer</span>
                </button>
                <button
                  onClick={(): void => setLocalPreviewClip(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl bg-[#14171C]/95 border border-[#00e5ff]/40 shadow-2xl backdrop-blur-xl flex items-start gap-3 animate-slide-up">
          <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/20 text-[#00e5ff] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white">{toast.title}</h4>
            <p className="text-xs text-[#918FA1] mt-0.5">{toast.message}</p>
            {toast.filePath && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                <button
                  onClick={(): void => handleRevealInExplorer(toast.filePath!)}
                  className="text-[11px] font-semibold text-[#00e5ff] hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">folder_open</span>
                  <span>Show in Folder</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={(): void => setToast(null)}
            className="p-1 rounded text-[#7D7A8B] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}
    </div>
  )
}
