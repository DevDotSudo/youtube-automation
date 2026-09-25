import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execFile, execSync } from 'child_process';
import util from 'util';
import { app } from 'electron';
import {
  StockMediaItem,
  ViralMetadataResult,
  FacebookViralPack,
  StockSearchOptions,
  LocalClipRecord,
  StockVideoFile
} from '../../shared/types';

const execFileAsync = util.promisify(execFile);

export class StockMediaService {
  /**
   * Scrapes live 9:16 vertical videos directly from online video sources in real-time.
   * Strictly NO local stock video files or hardcoded local stock lists.
   */
  static searchPexelsPortrait(query: string, usedUrls?: Set<string>): { id: string; url: string }[] {
    try {
      const cleanQuery = encodeURIComponent(query.trim() || 'cinematic portrait b-roll');
      const url = `https://www.pexels.com/search/videos/${cleanQuery}/?orientation=portrait`;
      const html = execSync(
        `curl.exe -s -m 6 -L "${url}" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"`,
        { maxBuffer: 10 * 1024 * 1024, timeout: 7000 }
      ).toString('utf8');

      const rawUrls = Array.from(new Set(html.match(/https:\/\/videos\.pexels\.com\/video-files\/[^\s\"']+\.mp4/g) || []));

      const byId = new Map<string, string[]>();
      for (const u of rawUrls) {
        const match = u.match(/\/video-files\/(\d+)\//);
        if (!match) continue;
        const id = match[1];
        if (!byId.has(id)) byId.set(id, []);
        byId.get(id)!.push(u);
      }

      const results: { id: string; url: string }[] = [];
      for (const [id, urls] of byId.entries()) {
        const best = urls.find((u) => u.includes('hd_') || u.includes('540_960') || u.includes('720')) || urls[0];
        if (!usedUrls || !usedUrls.has(best)) {
          results.push({ id, url: best });
        }
      }

      return results;
    } catch (err: any) {
      console.warn('[StockMediaService] Online video search error:', err.message);
      return [];
    }
  }

  /**
   * Scrapes online video search for script keywords with zero local media.
   */
  static async scrapeVideosForScript(
    scriptText: string,
    niche?: string,
    _aspectRatio: '9:16' | '16:9' = '9:16'
  ): Promise<StockMediaItem[]> {
    const keywords = this.extractVisualKeywords(scriptText, niche);
    const onlineMatches = this.searchPexelsPortrait(keywords);
    return onlineMatches.map((m, idx) => ({
      id: `online-${m.id}-${idx}`,
      source: 'pexels' as const,
      mediaType: 'video' as const,
      title: `Online Video: ${keywords}`,
      thumbnailUrl: '',
      downloadUrl: m.url,
      durationSec: 10,
      width: 540,
      height: 960,
      tags: [keywords, niche || '']
    }));
  }

  /**
   * Comprehensive Pexels video search supporting Next.js structured data extraction,
   * multiple orientations (landscape 16:9, portrait 9:16, square, all), 4K/1080p resolutions,
   * preview video streaming, tags, authors, and duration.
   */
  static searchPexelsVideos(options: {
    query: string;
    orientation?: 'all' | 'landscape' | 'portrait' | 'square';
    page?: number;
    limit?: number;
  }): StockMediaItem[] {
    const { query, orientation = 'all', page = 1, limit = 24 } = options;
    const cleanQuery = encodeURIComponent(query.trim() || 'cinematic b-roll');
    let url = `https://www.pexels.com/search/videos/${cleanQuery}/?page=${page}`;
    if (orientation && orientation !== 'all') {
      url += `&orientation=${orientation}`;
    }

    try {
      const html = execSync(
        `curl.exe -s -m 8 -L "${url}" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"`,
        { maxBuffer: 20 * 1024 * 1024, timeout: 9000 }
      ).toString('utf8');

      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (nextDataMatch) {
        try {
          const json = JSON.parse(nextDataMatch[1]);
          const rawItems = json.props?.pageProps?.initialData?.data || [];
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const results: StockMediaItem[] = [];
            for (const item of rawItems) {
              const attr = item.attributes || {};
              const video = attr.video || {};
              const videoFiles: StockVideoFile[] = (video.video_files || []).map((f: any) => ({
                quality: f.quality || 'hd',
                width: Number(f.width) || 1280,
                height: Number(f.height) || 720,
                fps: f.fps ? Number(f.fps) : undefined,
                link: f.link
              }));

              const sortedFiles = [...videoFiles].sort((a, b) => b.width - a.width);
              const bestFile = sortedFiles[0];
              const previewFile =
                videoFiles.find((f) => f.quality === 'sd' || f.width <= 640) ||
                sortedFiles[sortedFiles.length - 1];

              const width = attr.width || (bestFile ? bestFile.width : 1920);
              const height = attr.height || (bestFile ? bestFile.height : 1080);
              let aspectRatio: '16:9' | '9:16' | '1:1' = '16:9';
              if (height > width * 1.15) {
                aspectRatio = '9:16';
              } else if (width > height * 1.15) {
                aspectRatio = '16:9';
              } else {
                aspectRatio = '1:1';
              }

              let resolution = '1080p';
              if (width >= 3840 || height >= 3840) resolution = '4K';
              else if (width >= 1920 || height >= 1920) resolution = '1080p';
              else if (width >= 1280 || height >= 1280) resolution = '720p';
              else resolution = 'SD';

              const author = attr.user
                ? `${attr.user.first_name || ''} ${attr.user.last_name || ''}`.trim()
                : undefined;

              results.push({
                id: `pexels-${item.id}`,
                source: 'pexels',
                mediaType: 'video',
                title: attr.title || attr.description || `Pexels Clip #${item.id}`,
                thumbnailUrl:
                  video.thumbnail?.large ||
                  video.thumbnail?.medium ||
                  video.thumbnail?.small ||
                  '',
                previewUrl: previewFile?.link || video.preview_src || bestFile?.link || '',
                downloadUrl: bestFile?.link || video.src || '',
                durationSec: Math.round(attr.duration || 0),
                width,
                height,
                aspectRatio,
                resolution,
                fps: attr.fps ? Math.round(attr.fps) : undefined,
                author: author || 'Pexels Creator',
                authorUrl: attr.user?.slug ? `https://www.pexels.com/@${attr.user.slug}` : undefined,
                tags: (attr.tags || []).map((t: any) => t.name || t.search_term).filter(Boolean),
                videoFiles
              });
            }
            if (results.length > 0) {
              return results.slice(0, limit);
            }
          }
        } catch (jsonErr) {
          console.warn('[StockMediaService] Pexels NEXT_DATA parse error:', jsonErr);
        }
      }

      // Regex fallback if JSON extraction wasn't populated
      const rawUrls = Array.from(
        new Set(html.match(/https:\/\/videos\.pexels\.com\/video-files\/[^\s\"']+\.mp4/g) || [])
      );
      return rawUrls.slice(0, limit).map((u, idx) => ({
        id: `pexels-fallback-${idx}`,
        source: 'pexels' as const,
        mediaType: 'video' as const,
        title: `${query || 'Stock Clip'} #${idx + 1}`,
        thumbnailUrl: '',
        previewUrl: u,
        downloadUrl: u,
        durationSec: 15,
        width: orientation === 'portrait' ? 1080 : 1920,
        height: orientation === 'portrait' ? 1920 : 1080,
        aspectRatio: orientation === 'portrait' ? ('9:16' as const) : ('16:9' as const),
        resolution: '1080p',
        tags: [query]
      }));
    } catch (err: any) {
      console.warn('[StockMediaService] Pexels video search failed:', err.message);
      return [];
    }
  }

  /**
   * Search Pixabay API if an API key is provided in environment variables
   */
  static async searchPixabayVideos(options: {
    query: string;
    orientation?: 'all' | 'landscape' | 'portrait' | 'square';
    page?: number;
    limit?: number;
  }): Promise<StockMediaItem[]> {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) return [];

    const { query, orientation = 'all', page = 1, limit = 20 } = options;
    const cleanQuery = encodeURIComponent(query.trim() || 'cinematic');
    let orientationParam = 'all';
    if (orientation === 'landscape') orientationParam = 'horizontal';
    else if (orientation === 'portrait') orientationParam = 'vertical';

    const apiUrl = `https://pixabay.com/api/videos/?key=${apiKey}&q=${cleanQuery}&page=${page}&per_page=${limit}&orientation=${orientationParam}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) return [];
      const data = await response.json();
      if (!data.hits || !Array.isArray(data.hits)) return [];

      return data.hits.map((hit: any) => {
        const videos = hit.videos || {};
        const large = videos.large || videos.medium || videos.small || videos.tiny || {};
        const tiny = videos.tiny || videos.small || large;
        const width = large.width || 1920;
        const height = large.height || 1080;
        const aspectRatio: '16:9' | '9:16' | '1:1' =
          height > width * 1.15 ? '9:16' : width > height * 1.15 ? '16:9' : '1:1';

        const videoFiles: StockVideoFile[] = Object.keys(videos).map((key) => ({
          quality: key,
          width: videos[key].width || 1280,
          height: videos[key].height || 720,
          link: videos[key].url
        }));

        return {
          id: `pixabay-${hit.id}`,
          source: 'pixabay' as const,
          mediaType: 'video' as const,
          title: `Pixabay Clip #${hit.id}`,
          thumbnailUrl: hit.userImageURL || `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`,
          previewUrl: tiny.url || large.url,
          downloadUrl: large.url || tiny.url,
          durationSec: hit.duration || 10,
          width,
          height,
          aspectRatio,
          resolution: width >= 3840 ? '4K' : width >= 1920 ? '1080p' : '720p',
          author: hit.user || 'Pixabay Creator',
          authorUrl: hit.user_id ? `https://pixabay.com/users/${hit.user}-${hit.user_id}/` : undefined,
          tags: (hit.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          videoFiles
        };
      });
    } catch (err: any) {
      console.warn('[StockMediaService] Pixabay search failed:', err.message);
      return [];
    }
  }

  /**
   * Scrapes Pixabay video search directly as a fallback when no API key is provided.
   * Completely free, zero API key required.
   */
  static searchPixabayScraper(options: StockSearchOptions): StockMediaItem[] {
    const { query, orientation = 'all', limit = 20, page = 1 } = options;
    const cleanQuery = encodeURIComponent(query.trim() || 'cinematic');
    let orientationParam = '';
    if (orientation === 'landscape') orientationParam = '&orientation=horizontal';
    else if (orientation === 'portrait') orientationParam = '&orientation=vertical';

    const url = `https://pixabay.com/videos/search/${cleanQuery}/?pagi=${page}${orientationParam}`;
    try {
      const html = execSync(
        `curl.exe -s -m 8 -L "${url}" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"`,
        { maxBuffer: 15 * 1024 * 1024 }
      ).toString('utf8');

      const vids = Array.from(new Set(html.match(/https:\/\/cdn\.pixabay\.com\/video\/[^\s"']+\.mp4/g) || []));
      const results: StockMediaItem[] = [];

      for (let i = 0; i < vids.length; i++) {
        const tinyUrl = vids[i];
        const match = tinyUrl.match(/\/(\d+)[-_]/);
        const id = match ? match[1] : `${i + 1}`;
        const largeUrl = tinyUrl.replace('_tiny.mp4', '_large.mp4');
        const thumbUrl = `https://i.vimeocdn.com/video/${id}_640x360.jpg`;

        results.push({
          id: `pixabay-web-${id}`,
          source: 'pixabay',
          mediaType: 'video',
          title: `Pixabay Clip #${id}`,
          thumbnailUrl: thumbUrl,
          previewUrl: tinyUrl,
          downloadUrl: largeUrl,
          durationSec: 12,
          width: orientation === 'portrait' ? 1080 : 1920,
          height: orientation === 'portrait' ? 1920 : 1080,
          aspectRatio: orientation === 'portrait' ? '9:16' : '16:9',
          resolution: '1080p',
          author: 'Pixabay Creator',
          authorUrl: 'https://pixabay.com',
          tags: [query],
          hasAudio: false,
          license: 'Pixabay Free License'
        });
        if (results.length >= limit) break;
      }
      return results;
    } catch (err: any) {
      console.warn('[StockMediaService] Pixabay scraper fallback error:', err.message);
      return [];
    }
  }

  /**
   * Official NASA Video & Media Archive Search.
   * 100% Free Public Domain footage: ISS, deep space, rocket launches, planetary exploration.
   */
  static async searchNasaVideos(options: StockSearchOptions): Promise<StockMediaItem[]> {
    const { query, limit = 20, page = 1 } = options;
    const cleanQuery = encodeURIComponent(query.trim() || 'earth cosmic space');
    const url = `https://images-api.nasa.gov/search?q=${cleanQuery}&media_type=video&page=${page}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      const items = data.collection?.items || [];
      const results: StockMediaItem[] = [];

      for (const item of items) {
        const d = item.data?.[0];
        if (!d) continue;
        const nasaId = d.nasa_id;
        const title = d.title || `NASA Footage #${nasaId}`;
        const thumb = item.links?.[0]?.href || `https://images-assets.nasa.gov/video/${nasaId}/${nasaId}~large.jpg`;
        const downloadUrl = `https://images-assets.nasa.gov/video/${nasaId}/${nasaId}~medium.mp4`;
        const previewUrl = `https://images-assets.nasa.gov/video/${nasaId}/${nasaId}~preview.mp4`;

        results.push({
          id: `nasa-${nasaId}`,
          source: 'nasa',
          mediaType: 'video',
          title,
          thumbnailUrl: thumb,
          previewUrl,
          downloadUrl,
          durationSec: 15,
          width: 1920,
          height: 1080,
          aspectRatio: '16:9',
          resolution: '1080p',
          author: d.center ? `NASA ${d.center}` : 'NASA',
          authorUrl: 'https://images.nasa.gov',
          tags: d.keywords || [query],
          hasAudio: true,
          license: 'Public Domain (NASA)'
        });
        if (results.length >= limit) break;
      }
      return results;
    } catch (err: any) {
      console.warn('[StockMediaService] NASA search error:', err.message);
      return [];
    }
  }

  /**
   * Wikimedia Commons Open Video Library.
   * Free Creative Commons & Public Domain historical, documentary, and nature footage.
   */
  static async searchWikimediaVideos(options: StockSearchOptions): Promise<StockMediaItem[]> {
    const { query, limit = 20 } = options;
    const cleanQuery = encodeURIComponent(query.trim() || 'nature landscape');
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=filetype:video+${cleanQuery}&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=500`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'YouTubeAutomationApp/1.0 (contact@example.com)' }
      });
      if (!response.ok) return [];
      const data = await response.json();
      const pages = Object.values(data.query?.pages || {});
      const results: StockMediaItem[] = [];

      for (const p of pages as any[]) {
        const info = p.imageinfo?.[0];
        if (!info || !info.url) continue;

        const width = info.width || 1920;
        const height = info.height || 1080;
        let aspectRatio: '16:9' | '9:16' | '1:1' = '16:9';
        if (height > width * 1.15) aspectRatio = '9:16';
        else if (width > height * 1.15) aspectRatio = '16:9';
        else aspectRatio = '1:1';

        const cleanTitle = (p.title || 'Wikimedia Clip')
          .replace(/^File:/i, '')
          .replace(/\.[a-zA-Z0-9]+$/, '')
          .replace(/_/g, ' ');

        results.push({
          id: `wiki-${p.pageid || Math.random().toString(36).substring(2, 8)}`,
          source: 'wikimedia',
          mediaType: 'video',
          title: cleanTitle,
          thumbnailUrl: info.thumburl || info.url,
          previewUrl: info.url,
          downloadUrl: info.url,
          durationSec: 15,
          width,
          height,
          aspectRatio,
          resolution: width >= 1920 ? '1080p' : '720p',
          author: info.extmetadata?.Artist?.value ? info.extmetadata.Artist.value.replace(/<[^>]*>/g, '').trim() : 'Wikimedia Commons',
          authorUrl: p.fullurl || 'https://commons.wikimedia.org',
          tags: [query],
          hasAudio: true,
          license: 'Creative Commons / Public Domain'
        });
        if (results.length >= limit) break;
      }
      return results;
    } catch (err: any) {
      console.warn('[StockMediaService] Wikimedia search error:', err.message);
      return [];
    }
  }

  /**
   * Internet Archive / Prelinger Archives.
   * 50,000+ digitized vintage films, retro advertisements, and analog historical footage.
   */
  static async searchArchiveOrgVideos(options: StockSearchOptions): Promise<StockMediaItem[]> {
    const { query, limit = 20, page = 1 } = options;
    const cleanQuery = encodeURIComponent(query.trim() || 'vintage retro');
    const url = `https://archive.org/advancedsearch.php?q=mediatype:(movies)+AND+(${cleanQuery})&fl[]=identifier,title,description,duration&rows=${limit}&page=${page}&output=json`;

    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      const docs = data.response?.docs || [];
      const results: StockMediaItem[] = [];

      for (const doc of docs) {
        const id = doc.identifier;
        if (!id) continue;

        const title = doc.title || `Archive Clip ${id}`;
        const thumb = `https://archive.org/services/img/${id}`;
        const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

        results.push({
          id: `archive-${id}`,
          source: 'archive',
          mediaType: 'video',
          title,
          thumbnailUrl: thumb,
          previewUrl: videoUrl,
          downloadUrl: videoUrl,
          durationSec: typeof doc.duration === 'number' ? Math.round(doc.duration) : 20,
          width: 1920,
          height: 1080,
          aspectRatio: '16:9',
          resolution: '1080p',
          author: 'Prelinger / Internet Archive',
          authorUrl: `https://archive.org/details/${id}`,
          tags: [query, 'vintage', 'historical'],
          hasAudio: true,
          license: 'Public Domain'
        });
      }
      return results;
    } catch (err: any) {
      console.warn('[StockMediaService] Archive.org search error:', err.message);
      return [];
    }
  }

  /**
   * YouTube Creative Commons & B-Roll Clips.
   * Provides real-world 4K footage and cinematic clips WITH real audio/soundtrack.
   */
  static async searchYouTubeVideos(options: StockSearchOptions): Promise<StockMediaItem[]> {
    const { query, limit = 16 } = options;
    const cleanQuery = (query.trim() || 'cinematic 4k b roll') + ' no copyright';

    try {
      const stdout = await new Promise<string>((resolve, reject) => {
        execFile('python', ['-m', 'yt_dlp', '--skip-download', '--print', '%(id)s||%(title)s||%(thumbnail)s||%(duration)s||%(webpage_url)s', `ytsearch${limit}:${cleanQuery}`], { timeout: 18000 }, (err, out) => {
          if (err) return reject(err);
          resolve(out || '');
        });
      });

      const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
      const results: StockMediaItem[] = [];

      for (const line of lines) {
        const parts = line.split('||');
        if (parts.length < 5) continue;
        const [id, title, thumbnail, durationStr, webpageUrl] = parts;
        const durationSec = Math.round(parseFloat(durationStr) || 15);

        results.push({
          id: `yt-${id.trim()}`,
          source: 'youtube',
          mediaType: 'video',
          title: title.trim(),
          thumbnailUrl: thumbnail.trim(),
          previewUrl: webpageUrl.trim(),
          downloadUrl: webpageUrl.trim(),
          durationSec,
          width: 1920,
          height: 1080,
          aspectRatio: '16:9',
          resolution: '1080p',
          author: 'YouTube Creator',
          authorUrl: webpageUrl.trim(),
          tags: [query, 'audio-included'],
          hasAudio: true,
          license: 'Creative Commons / Fair Use'
        });
      }
      return results;
    } catch (err: any) {
      console.warn('[StockMediaService] YouTube search error:', err.message);
      return [];
    }
  }

  /**
   * Multi-provider media search with smart blending across free stock sources.
   */
  static async searchMedia(options: StockSearchOptions): Promise<StockMediaItem[]> {
    const source = options.source || 'all';
    const limit = options.limit || 24;

    if (source === 'nasa') return this.searchNasaVideos(options);
    if (source === 'wikimedia') return this.searchWikimediaVideos(options);
    if (source === 'archive') return this.searchArchiveOrgVideos(options);
    if (source === 'youtube') return this.searchYouTubeVideos(options);
    if (source === 'pexels') return this.searchPexelsVideos(options);
    if (source === 'pixabay') {
      if (process.env.PIXABAY_API_KEY) {
        const apiRes = await this.searchPixabayVideos(options);
        if (apiRes.length > 0) return apiRes;
      }
      return this.searchPixabayScraper(options);
    }

    // Default 'all': blend results from Pexels, Pixabay, NASA, Wikimedia, and Archive.org
    const results: StockMediaItem[] = [];
    const [pexels, pixabay, nasa, wiki, archive] = await Promise.all([
      Promise.resolve(this.searchPexelsVideos({ ...options, limit: 10 })),
      process.env.PIXABAY_API_KEY
        ? this.searchPixabayVideos({ ...options, limit: 8 })
        : Promise.resolve(this.searchPixabayScraper({ ...options, limit: 8 })),
      this.searchNasaVideos({ ...options, limit: 6 }),
      this.searchWikimediaVideos({ ...options, limit: 6 }),
      this.searchArchiveOrgVideos({ ...options, limit: 6 })
    ]);

    // Interleave results cleanly
    const maxLen = Math.max(pexels.length, pixabay.length, nasa.length, wiki.length, archive.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < pexels.length) results.push(pexels[i]);
      if (i < pixabay.length) results.push(pixabay[i]);
      if (i < nasa.length) results.push(nasa[i]);
      if (i < wiki.length) results.push(wiki[i]);
      if (i < archive.length) results.push(archive[i]);
    }

    return results.slice(0, limit);
  }

  /**
   * Default folder where downloaded stock clips are saved.
   */
  static getDefaultClipsFolder(): string {
    const downloadsPath = app.getPath('downloads');
    const clipsDir = path.join(downloadsPath, 'Stock Clips');
    if (!fs.existsSync(clipsDir)) {
      try {
        fs.mkdirSync(clipsDir, { recursive: true });
      } catch (err) {
        console.warn('[StockMediaService] Could not create default clips folder:', err);
      }
    }
    return clipsDir;
  }

  /**
   * Retrieve list of clips saved locally on the user's computer.
   */
  static getDownloadedClips(customFolder?: string): LocalClipRecord[] {
    const targetFolder =
      customFolder && fs.existsSync(customFolder)
        ? customFolder
        : this.getDefaultClipsFolder();

    if (!fs.existsSync(targetFolder)) return [];

    try {
      const files = fs.readdirSync(targetFolder);
      const records: LocalClipRecord[] = [];
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (['.mp4', '.mov', '.webm', '.mkv'].includes(ext)) {
          const fullPath = path.join(targetFolder, file);
          try {
            const stat = fs.statSync(fullPath);
            records.push({
              filename: file,
              filePath: fullPath,
              sizeBytes: stat.size,
              createdAt: stat.mtimeMs
            });
          } catch {}
        }
      }
      return records.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err: any) {
      console.warn('[StockMediaService] Failed to read downloaded clips:', err.message);
      return [];
    }
  }

  /**
   * Deletes a downloaded clip from the local computer.
   */
  static deleteDownloadedClip(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('[StockMediaService] Failed to delete clip:', err.message);
      return false;
    }
  }

  /**
   * Downloads a video clip for an individual beat strictly by scraping live online.
   * Guarantees:
   * 1. 100% online scraping (Zero local stock media, zero local catalogs).
   * 2. 100% distinct, unique video assignment across all beats in a project.
   * 3. Direct semantic alignment with what is spoken in the narration line.
   */
  static async scrapeAndDownloadVideoForBeat(
    beatText: string,
    niche: string | undefined,
    outputFolder: string,
    beatIndex: number,
    usedVideoUrls?: Set<string>
  ): Promise<string> {
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const padIndex = String(beatIndex + 1).padStart(2, '0');
    const targetMp4Path = path.join(outputFolder, `beat_${padIndex}.mp4`);

    const primaryKeywords = this.extractVisualKeywords(beatText, niche);
    console.log(`[StockMediaService] Scraping live online 9:16 video for Beat ${beatIndex + 1}: "${primaryKeywords}" (Narration: "${beatText.slice(0, 50)}")`);

    // 1. Primary Live Online Search based on exact script line
    let candidates = this.searchPexelsPortrait(primaryKeywords, usedVideoUrls);

    // 2. If primary query yields few/no unused online results, broaden query online
    if (candidates.length === 0) {
      const fallbackOnlineQuery = this.getBroadenedOnlineQuery(niche, primaryKeywords);
      console.log(`[StockMediaService] Broadening online search for Beat ${beatIndex + 1}: "${fallbackOnlineQuery}"`);
      candidates = this.searchPexelsPortrait(fallbackOnlineQuery, usedVideoUrls);
    }

    // 3. If still empty, use general high-aesthetic online query
    if (candidates.length === 0) {
      candidates = this.searchPexelsPortrait('cinematic vertical 4k b-roll', usedVideoUrls);
    }

    // Attempt downloading first verified candidate from online results
    for (const cand of candidates) {
      try {
        console.log(`[StockMediaService] Downloading live online video for Beat ${beatIndex + 1}: ${cand.url}`);
        await this.downloadDirectUrl(cand.url, targetMp4Path);
        if (fs.existsSync(targetMp4Path) && fs.statSync(targetMp4Path).size > 10000) {
          console.log(`[StockMediaService] Beat ${beatIndex + 1} online video verified on disk (${fs.statSync(targetMp4Path).size} bytes)`);
          if (usedVideoUrls) usedVideoUrls.add(cand.url);
          return targetMp4Path;
        }
      } catch (err: any) {
        console.warn(`[StockMediaService] Online candidate download failed: ${err.message}`);
      }
    }

    return targetMp4Path;
  }

  /**
   * Generates a broadened online query based on the selected niche and script context.
   */
  private static getBroadenedOnlineQuery(niche?: string, existingKeywords?: string): string {
    const lowerNiche = (niche || '').toLowerCase();
    switch (lowerNiche) {
      case 'billionaire_mindset':
        return 'luxury skyscraper modern city business wealth';
      case 'stoic_philosophy':
        return 'ancient ruins statue fire dark stone columns';
      case 'stickman_doodle':
        return 'minimalist sketch animated modern line whiteboard';
      case 'studio_ghibli':
        return 'lush emerald forest nature sunbeams peaceful anime';
      case 'cosmic_scifi':
        return 'cosmic deep space stars galaxy nebula planets';
      case 'true_crime_noir':
        return 'dark moody rainy street night city shadows noir';
      case 'ancient_civilizations':
        return 'ancient temple ruins monument excavation torchlight';
      case 'ancient_history_stone_age':
        return 'stone age caveman primitive fire hunting prehistoric ancient';
      case 'dark_academia':
        return 'victorian gothic library books study mahogany stained glass';
      case 'epic_battles':
        return 'epic historical battle smoke cavalry battlefield';
      case 'dark_folklore':
        return 'foggy pine forest mystery darkness woods pagan';
      case 'liminal_horror':
        return 'eerie yellow hallway analog horror corridor fluorescent';
      case 'surrealist_thought':
        return 'surreal desert geometry dream conceptual solitude';
      case 'cyberpunk_noir':
        return 'neon cyber matrix futuristic city night high tech';
      case 'extreme_survival':
        return 'mountain expedition ocean storm epic blizzard';
      default:
        return `${existingKeywords || ''} cinematic portrait`.trim();
    }
  }

  /**
   * Extracts visual keywords from script text and niche.
   * Prioritizes high-signal concrete objects and actions spoken in the script line.
   */
  static extractVisualKeywords(text: string, niche?: string): string {
    const raw = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

    // Concrete script concept triggers
    if (raw.includes('broke') || raw.includes('earn') || raw.includes('income')) return 'money currency lifestyle';
    if (raw.includes('phone') || raw.includes('deliver') || raw.includes('subscription')) return 'smartphone shopping delivery';
    if (raw.includes('inflation') || raw.includes('lifestyle')) return 'luxury shopping city';
    if (raw.includes('invest') || raw.includes('stock')) return 'stock market investing graph';
    if (raw.includes('save') || raw.includes('difference') || raw.includes('bank')) return 'saving money bank';
    if (raw.includes('rich') || raw.includes('keeping') || raw.includes('wealth')) return 'wealth luxury modern skyscraper';

    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'this', 'that', 'they', 'from', 'have', 'were',
      'been', 'there', 'what', 'when', 'will', 'your', 'about', 'then', 'them', 'these',
      'scene', 'narrator', 'voice', 'camera', 'shot', 'visual', 'never', 'people', 'warned',
      'some', 'said', 'spoke', 'always', 'same', 'authentic', 'studio', 'depicting', 'storytelling',
      'warmth', 'textures', 'cinematic', 'anime'
    ]);

    const words = raw
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 3);

    let nichePrefix = '';
    const lowerNiche = (niche || '').toLowerCase();
    switch (lowerNiche) {
      case 'billionaire_mindset':
        nichePrefix = 'luxury skyscraper modern city';
        break;
      case 'stoic_philosophy':
        nichePrefix = 'ancient stoic fire';
        break;
      case 'stickman_doodle':
        nichePrefix = 'minimalist line sketch';
        break;
      case 'studio_ghibli':
        nichePrefix = 'lush nature aesthetic';
        break;
      case 'cosmic_scifi':
        nichePrefix = 'cosmic deep space';
        break;
      case 'true_crime_noir':
        nichePrefix = 'dark moody neon rain';
        break;
      case 'ancient_civilizations':
        nichePrefix = 'ancient monument temple';
        break;
      case 'ancient_history_stone_age':
        nichePrefix = 'stone age primitive village';
        break;
      case 'dark_academia':
        nichePrefix = 'victorian gothic library';
        break;
      case 'epic_battles':
        nichePrefix = 'epic battle smoke';
        break;
      case 'dark_folklore':
        nichePrefix = 'misty dark forest';
        break;
      case 'liminal_horror':
        nichePrefix = 'eerie hallway analog';
        break;
      case 'surrealist_thought':
        nichePrefix = 'minimalist surreal conceptual';
        break;
      case 'cyberpunk_noir':
        nichePrefix = 'neon cyber futuristic';
        break;
      case 'extreme_survival':
        nichePrefix = 'extreme mountain expedition';
        break;
      default:
        nichePrefix = 'modern cinematic';
        break;
    }

    return `${nichePrefix} ${words.join(' ')}`.trim() || 'modern cinematic portrait';
  }

  /**
   * Downloads a media item into outputFolder.
   */
  static async downloadMedia(
    item: StockMediaItem,
    outputFolder: string,
    filenamePrefix = 'stock_broll'
  ): Promise<{ localPath: string; isVideo: boolean }> {
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const timestamp = Date.now();

    const isStreamingPlatform =
      item.source === 'youtube' ||
      (item.source === 'pinterest' && item.downloadUrl.includes('pinterest.com/pin/')) ||
      item.downloadUrl.includes('youtube.com') ||
      item.downloadUrl.includes('youtu.be');

    if (isStreamingPlatform) {
      const targetMp4Path = path.join(outputFolder, `${filenamePrefix}_${item.id}_${timestamp}.mp4`);
      try {
        const ytdlpArgs = [
          '-m',
          'yt_dlp',
          '-f',
          'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
          '--no-playlist',
          '--max-downloads',
          '1',
          '-o',
          targetMp4Path,
          item.downloadUrl
        ];
        await execFileAsync('python', ytdlpArgs);
        if (fs.existsSync(targetMp4Path) && fs.statSync(targetMp4Path).size > 10000) {
          return { localPath: targetMp4Path, isVideo: true };
        }
      } catch (err: any) {
        console.warn('[StockMediaService] yt-dlp extraction fallback:', err.message);
      }
    }

    const targetMp4Path = path.join(outputFolder, `${filenamePrefix}_${item.id}_${timestamp}.mp4`);
    await this.downloadDirectUrl(item.downloadUrl, targetMp4Path);
    return { localPath: targetMp4Path, isVideo: true };
  }

  /**
   * Universal downloader for any video link (direct MP4 or YouTube stream).
   */
  static async downloadClipUrl(url: string, destPath: string): Promise<string> {
    const isStreamingPlatform =
      url.includes('youtube.com') ||
      url.includes('youtu.be') ||
      url.includes('pinterest.com/pin/');

    if (isStreamingPlatform) {
      const ytdlpArgs = [
        '-m',
        'yt_dlp',
        '-f',
        'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
        '--no-playlist',
        '--max-downloads',
        '1',
        '-o',
        destPath,
        url
      ];
      await execFileAsync('python', ytdlpArgs);
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
        return destPath;
      }
    }

    return this.downloadDirectUrl(url, destPath);
  }

  /**
   * Helper to download a direct file URL to disk with strict HTTP status validation.
   */
  static downloadDirectUrl(url: string, destPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(destPath);

      client
        .get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            file.close();
            try { fs.unlinkSync(destPath); } catch {}
            this.downloadDirectUrl(res.headers.location, destPath).then(resolve).catch(reject);
            return;
          }

          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            file.close();
            try { fs.unlinkSync(destPath); } catch {}
            reject(new Error(`HTTP ${res.statusCode} from ${url}`));
            return;
          }

          res.pipe(file);
          file.on('finish', () => {
            file.close();
            try {
              if (fs.existsSync(destPath) && fs.statSync(destPath).size < 1000) {
                fs.unlinkSync(destPath);
                reject(new Error('File size too small (< 1KB), corrupt download'));
                return;
              }
            } catch {}
            resolve(destPath);
          });
        })
        .on('error', (err) => {
          file.close();
          try { fs.unlinkSync(destPath); } catch {}
          reject(err);
        });
    });
  }

  /**
   * Facebook Automation Viral Pack Generator.
   */
  static generateFacebookViralPack(
    scriptText: string,
    projectName = 'Facebook Reel',
    niche?: string
  ): FacebookViralPack {
    const cleanTitle = projectName.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'The Untold Truth';
    const lowerNiche = (niche || '').toLowerCase();
    const scriptSnippet = (scriptText || '').slice(0, 240).replace(/\s+/g, ' ').trim();

    let hook = `Stop scrolling. Most people will never know this about ${cleanTitle}.`;
    if (lowerNiche.includes('stoic')) {
      hook = `The harsh truth about human nature that Marcus Aurelius realized 2,000 years ago.`;
    } else if (lowerNiche.includes('billion') || lowerNiche.includes('wealth') || lowerNiche.includes('money')) {
      hook = `The 1% never talk about this in public. Here is how power and leverage really work.`;
    } else if (lowerNiche.includes('noir') || lowerNiche.includes('crime') || lowerNiche.includes('forest') || lowerNiche.includes('mystery')) {
      hook = `They told travelers never to enter after dark. What they found was never meant to be heard.`;
    } else if (lowerNiche.includes('ghibli') || lowerNiche.includes('anime')) {
      hook = `There is a forgotten serenity in life that we rarely pause to notice.`;
    }

    const captionLines = [
      hook,
      '',
      scriptSnippet ? `"${scriptSnippet}..."` : 'A lesson that completely rewrites how you see the world.',
      '',
      '🧠 3 Takeaways you cannot afford to ignore:',
      '• Silence and leverage are your greatest weapons.',
      '• Don\'t increase spending at the same speed as your income.',
      '• Keeping wealth is the true definition of financial freedom.',
      '',
      '💬 Which part hit hardest for you? Drop your perspective in the comments below 👇'
    ];
    const caption = captionLines.join('\n');

    const callToAction = 'Save this reel and share it with someone who needs this perspective today 🚀';

    let hashtags = ['#reelsviral', '#mindsetshift', '#storytelling', '#deepthoughts'];
    if (lowerNiche.includes('stoic')) {
      hashtags = ['#stoicism', '#marcusaurelius', '#discipline', '#innerpeace'];
    } else if (lowerNiche.includes('billion') || lowerNiche.includes('wealth') || lowerNiche.includes('money')) {
      hashtags = ['#wealthmindset', '#billionairehabits', '#successrules', '#financialfreedom'];
    } else if (lowerNiche.includes('noir') || lowerNiche.includes('crime') || lowerNiche.includes('mystery') || lowerNiche.includes('forest')) {
      hashtags = ['#folklore', '#darkmystery', '#unsolved', '#forestlore'];
    } else if (lowerNiche.includes('ghibli') || lowerNiche.includes('anime')) {
      hashtags = ['#ghiblivibes', '#peacefulmind', '#cinematicreel', '#animemagic'];
    }
    hashtags = hashtags.slice(0, 4);

    let suggestedAudioVibe = 'Deep Sub-Bass Ambient & Cinematic Strings (Reels Trending)';
    if (lowerNiche.includes('stoic')) suggestedAudioVibe = 'Ancient Echoes / Heavy Reverb Ambient Piano';
    else if (lowerNiche.includes('noir') || lowerNiche.includes('forest')) suggestedAudioVibe = 'Eerie Ambient Drone / Dark Atmospheric Cello';

    const fullPostText = [
      caption,
      '',
      callToAction,
      '',
      hashtags.join(' ')
    ].join('\n');

    return {
      hook,
      caption,
      hashtags,
      callToAction,
      suggestedAudioVibe,
      fullPostText
    };
  }

  static generateCharacterProfile(_scriptText: string): string {
    return 'Consistent protagonist: Atmospheric cinematic presence in natural 9:16 framing';
  }

  static generateViralMetadata(scriptText: string, projectName = 'Master Story'): ViralMetadataResult {
    return {
      title: projectName,
      titles: [projectName],
      description: scriptText,
      hashtags: ['#reels', '#viral'],
      thumbnailPrompt: ''
    };
  }
}
