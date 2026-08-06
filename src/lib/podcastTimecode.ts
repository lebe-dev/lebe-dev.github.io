/**
 * Timecode helpers, kept apart from `podcasts.ts` so the Svelte transcript
 * component can import them without pulling every transcript JSON
 * (loaded there via import.meta.glob) into the client bundle.
 */

const HHMMSS = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/;

/** "00:01:52" → seconds, or null when the input isn't HH:MM:SS. */
export const timecodeToSeconds = (timecode: string): number | null => {
  const match = HHMMSS.exec(timecode.trim());
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
};

/** "00:01:52" → "1:52", "01:02:03" → "1:02:03". Leading zeroes are noise. */
export const formatTimecode = (timecode: string): string => {
  const total = timecodeToSeconds(timecode);
  if (total === null) return timecode;

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
};

/** Anchor id for a segment, so a timecode can be linked to. */
export const segmentId = (timecode: string): string => `t-${timecode.replace(/:/g, '-')}`;
