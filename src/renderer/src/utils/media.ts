/**
 * Converts local filesystem path or returns direct HTTP/HTTPS URL into a safe, CORS-compliant media URL for Electron
 */
export function getMediaUrl(filePath?: string | null, cacheBust?: boolean | number | string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
    return filePath;
  }
  const cleanPath = filePath.replace(/\\/g, '/');
  const t = cacheBust === true ? Date.now() : cacheBust || '';
  const query = t ? `&t=${t}` : '';
  return `media://file?path=${encodeURIComponent(cleanPath)}${query}`;
}