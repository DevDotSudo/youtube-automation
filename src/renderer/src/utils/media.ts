/**
 * Converts local filesystem path or returns direct HTTP/HTTPS URL into a safe, CORS-compliant media URL for Electron
 */
export function getMediaUrl(filePath?: string | null, cacheBust?: boolean | number | string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
    return filePath;
  }
  const cleanPath = filePath.replace(/\\/g, '/');
  // Only append cache-busting parameter if an explicit version number or timestamp string was provided.
  // Never use Date.now() when cacheBust is a boolean true, because that forces a new URL on every React re-render,
  // causing Chromium to abort and flash/unload images and videos.
  let query = '';
  if (typeof cacheBust === 'number') {
    query = `&v=${cacheBust}`;
  } else if (typeof cacheBust === 'string' && cacheBust.length > 0) {
    query = `&v=${encodeURIComponent(cacheBust)}`;
  }
  return `media://file?path=${encodeURIComponent(cleanPath)}${query}`;
}
