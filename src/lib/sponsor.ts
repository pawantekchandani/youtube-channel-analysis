import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptSponsorResult {
  sponsored: 'yes' | 'no' | 'unknown';
  sponsorName: string | null;
  sponsorSource: 'transcript' | null;
  matchedSnippet: string | null;
}

export interface PhraseMatchResult {
  hasMatch: boolean;
  sponsorName: string | null;
  matchedSnippet: string | null;
}

/**
 * Normalized stop-words per specification:
 * and, the, this, video, today, who, which, that, is, are, for, to, with, use, code, link, check, out, ka, ki, ke, ne, hai
 * plus functional articles (a, an, our, by).
 */
export const STOP_WORDS = new Set([
  'and',
  'the',
  'this',
  'video',
  'today',
  'who',
  'which',
  'that',
  'is',
  'are',
  'for',
  'to',
  'with',
  'use',
  'code',
  'link',
  'check',
  'out',
  'ka',
  'ki',
  'ke',
  'ne',
  'hai',
  'a',
  'an',
  'our',
  'by',
  'they',
  'we',
  'i',
  'he',
  'she',
  'it',
  'you',
  'thanks',
  'thank',
  'again',
  'also',
  // Devanagari filler words
  'की',
  'का',
  'के',
  'को',
  'में',
  'से',
  'है',
  'हैं',
  'था',
  'भी',
  'जो',
  'वो',
  'ये',
  'यह',
  'वह',
  'इस',
  'उस',
  'और',
  'तो',
  'ही',
  'एक',
  'बिटवीन',
  'वीडियो',
  'आज',
  'हम',
  'आप',
  'मैं',
  'ने',
  'पर',
  'लिए',
]);

/**
 * Normalizes transcript text:
 * - lowercase
 * - collapse whitespace
 * - strip [Music]-style tags (e.g. [Applause], (Laughter), [Music])
 */
export function normalizeTranscript(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/\[.*?\]|\(.*?\)/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Title-cases an extracted token sequence for clean display (e.g. "xreal" -> "Xreal").
 */
export function toTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extracts 1-3 words following a sponsor trigger phrase, stopping at stop-words.
 */
export function cleanAfterTokens(rawTokens: string | undefined | null): string | null {
  if (!rawTokens) return null;
  const words = rawTokens.trim().split(/\s+/).filter(Boolean);
  const picked: string[] = [];

  for (const w of words) {
    const cleanWord = w.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '');
    if (!cleanWord || STOP_WORDS.has(cleanWord.toLowerCase())) {
      break;
    }
    picked.push(cleanWord);
    if (picked.length === 3) break;
  }

  if (picked.length === 0) return null;
  return toTitleCase(picked.join(' '));
}

/**
 * Extracts 1-3 words preceding a sponsor trigger phrase (e.g. "X for sponsoring"),
 * scanning backwards and stopping at stop-words.
 */
export function cleanBeforeTokens(rawTokens: string | undefined | null): string | null {
  if (!rawTokens) return null;
  const words = rawTokens.trim().split(/\s+/).filter(Boolean);
  const picked: string[] = [];

  for (let i = words.length - 1; i >= 0; i--) {
    const cleanWord = words[i].replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '');
    if (!cleanWord || STOP_WORDS.has(cleanWord.toLowerCase())) {
      break;
    }
    picked.unshift(cleanWord);
    if (picked.length === 3) break;
  }

  if (picked.length === 0) return null;
  return toTitleCase(picked.join(' '));
}

/**
 * Match strong sponsor phrases in normalized transcript text.
 * Only strong sponsor phrases produce 'yes'.
 * Weak phrases ("use code", "promo code", "link in description", "#ad") do NOT trigger 'yes'.
 */
export function matchSponsorInTranscript(rawText: string | undefined | null): PhraseMatchResult {
  const norm = normalizeTranscript(rawText);
  if (!norm) {
    return { hasMatch: false, sponsorName: null, matchedSnippet: null };
  }

  const extractionPatterns: Array<{
    regex: RegExp;
    extract: (match: RegExpMatchArray) => string | null;
  }> = [
    // English
    {
      regex: /(?:this video is\s+)?sponsored by\s+([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    {
      regex: /today(?:'|s)?\s+sponsor(?:\s+is)?\s+([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    {
      regex: /brought to you by\s+([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    {
      regex: /thanks to\s+([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,4}?)\s+for sponsoring/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    // a. "(segue|segway) to our sponsor X"
    {
      regex: /(?:segue|segway)\s+to\s+our\s+sponsor(?!s)(?:[,:\-\s]+(?:which is|of course|for today(?:'s|'|s)?\s+video|today|is))*[,:\-\s]*([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    // b. "from our sponsor X"
    {
      regex: /from\s+our\s+sponsor(?!s)(?:[,:\-\s]+(?:which is|of course|for today(?:'s|'|s)?\s+video|today|is))*[,:\-\s]*([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    // d. "about our sponsor, which is of course X"
    {
      regex: /about\s+our\s+sponsor(?!s)(?:[,:\-\s]+(?:which is|of course|for today(?:'s|'|s)?\s+video|today|is))*[,:\-\s]*([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    // c. "our sponsor X"
    {
      regex: /\bour\s+sponsor(?!s)(?:[,:\-\s]+(?:which is|of course|for today(?:'s|'|s)?\s+video|today|is))*[,:\-\s]*([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    // e. "X for sponsoring (today's|this) video"
    {
      regex: /((?:[a-zA-Z0-9\u0900-\u097F]+\s+){1,4})for sponsoring\s+(?:today(?:'s|'|s)?|this)\s+video/i,
      extract: (m) => cleanBeforeTokens(m[1]),
    },
    {
      regex: /((?:[a-zA-Z0-9\u0900-\u097F]+\s+){1,4})sponsored this video/i,
      extract: (m) => cleanBeforeTokens(m[1]),
    },
    {
      regex: /in partnership with\s+([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    {
      regex: /paid partnership with\s+([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    // Hinglish (romanized)
    {
      regex: /is video ko\s+([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,3}?)\s+ne sponsor kiya/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    {
      regex: /aaj ka sponsor(?:\s+hai)?\s+([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    {
      regex: /is video ka sponsor(?:\s+hai)?\s+([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,5})/i,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    // f. Devanagari (स्पॉन्सर, प्रायोजक, पार्टनरशिप without \b)
    {
      regex: /(?:प्रायोजक|स्पॉन्सर|पार्टनरशिप)(?:\s+है|\s*:)?\s+([a-zA-Z0-9\u0900-\u097F]+(?:\s+[a-zA-Z0-9\u0900-\u097F]+){0,3})/u,
      extract: (m) => cleanAfterTokens(m[1]),
    },
    // g. Fallback detection for strong phrases when brand name isn't cleanly parsed
    {
      regex: /(?:प्रायोजक|स्पॉन्सर|पार्टनरशिप|\b(?:sponsored by|this video is sponsored|todays? sponsor|brought to you by|for sponsoring\s+(?:today(?:'s|'|s)?|this)\s+video|sponsored this video|in partnership with|paid partnership with|ne sponsor kiya|aaj ka sponsor|is video ka sponsor|(?:segue|segway)\s+to\s+our\s+sponsor|from\s+our\s+sponsor|about\s+our\s+sponsor|our\s+sponsor)\b)/iu,
      extract: () => null,
    },
  ];

  for (const item of extractionPatterns) {
    const match = norm.match(item.regex);
    if (match) {
      let sponsorName = item.extract(match);
      if (sponsorName) {
        const trimmed = sponsorName.trim();
        const firstToken = trimmed.split(/\s+/)[0];
        if (!trimmed || trimmed.length <= 1 || (firstToken && STOP_WORDS.has(firstToken.toLowerCase()))) {
          sponsorName = null;
        }
      }
      const matchIdx = match.index || 0;
      const start = Math.max(0, matchIdx - 30);
      const end = Math.min(norm.length, matchIdx + match[0].length + 40);
      const words = norm.slice(start, end).split(' ').filter(Boolean);
      const matchedSnippet = words.slice(0, 20).join(' ');

      return {
        hasMatch: true,
        sponsorName,
        matchedSnippet,
      };
    }
  }

  return { hasMatch: false, sponsorName: null, matchedSnippet: null };
}

/**
 * Status rules:
 * - 'yes' = a strong sponsor phrase matched in the transcript.
 * - 'no' = transcript fetched and no strong phrase matched.
 * - 'unknown' = transcript not available.
 */
export function evaluateTranscriptSponsorship(transcriptText: string | null): TranscriptSponsorResult {
  if (transcriptText === null) {
    return {
      sponsored: 'unknown',
      sponsorName: null,
      sponsorSource: null,
      matchedSnippet: null,
    };
  }

  const matchResult = matchSponsorInTranscript(transcriptText);
  if (matchResult.hasMatch) {
    return {
      sponsored: 'yes',
      sponsorName: matchResult.sponsorName,
      sponsorSource: 'transcript',
      matchedSnippet: matchResult.matchedSnippet,
    };
  }

  return {
    sponsored: 'no',
    sponsorName: null,
    sponsorSource: null,
    matchedSnippet: null,
  };
}

/**
 * Fetch video transcript using youtube-transcript with a timeout.
 * Takes the default caption track in whatever language it is (does not force English).
 * Returns transcript text string if available, or null on error / unavailable / timeout.
 */
export async function fetchVideoTranscript(
  videoId: string,
  options?: { lang?: string } | number,
  timeoutMs = 5000
): Promise<string | null> {
  let config: { lang?: string } | undefined = undefined;
  let timeout = timeoutMs;

  if (typeof options === 'number') {
    timeout = options;
  } else if (options && typeof options === 'object') {
    config = options;
  }

  try {
    const fetchPromise = YoutubeTranscript.fetchTranscript(videoId, config);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Transcript fetch timeout')), timeout)
    );

    const transcriptItems = await Promise.race([fetchPromise, timeoutPromise]);
    if (!Array.isArray(transcriptItems) || transcriptItems.length === 0) {
      return null;
    }

    return transcriptItems.map((item) => item.text).join(' ');
  } catch {
    // Any transcript failure must not fail the analysis
    return null;
  }
}

/**
 * Concurrency runner for executing async tasks with a limit (3 concurrent requests).
 */
export async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}
