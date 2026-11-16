import { YoutubeTranscript } from 'youtube-transcript';

export interface SponsorDetectionResult {
  sponsored: 'yes' | 'no' | 'unknown';
  sponsorName: string | null;
  sponsorSource: 'flag' | 'description' | 'transcript' | null;
}

export interface TextMatchResult {
  hasMatch: boolean;
  sponsorName: string | null;
}

/**
 * Common phrases indicating sponsorship or commercial partnership.
 */
export const SPONSOR_PHRASES = [
  'sponsored by',
  'this video is sponsored',
  'brought to you by',
  'thanks to', // used in context of "thanks to X for sponsoring"
  'in partnership with',
  'partnered with',
  'paid partnership',
  '#ad',
  '#sponsored',
  'use code',
  'promo code',
];

const STOP_WORDS = new Set([
  'our',
  'the',
  'a',
  'an',
  'this',
  'my',
  'you',
  'viewers',
  'patrons',
  'supporters',
  'everyone',
  'sponsor',
  'sponsors',
  'channel',
  'watching',
]);

/**
 * Cleans and validates an extracted sponsor name candidate.
 * Keeps short, brand-like token sequences (1-4 words, <= 40 chars)
 * stripped of URLs, trailing punctuation, promo clauses, and stop words.
 */
export function cleanSponsorName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let name = raw.trim();

  // Strip URLs if any
  name = name.replace(/https?:\/\/\S+/gi, '').replace(/www\.\S+/gi, '');

  // Split on hyphens / dashes / colons separating clauses e.g. "Squarespace - Build your website"
  name = name.split(/\s+[-–—|:]\s+/)[0];

  // Strip trailing promo or action clauses e.g. "and use code...", "go to...", "visit...", "for 20% off"
  name = name.replace(
    /\s+(?:and\s+(?:get|use|head|visit|check|see)|go\s+to|visit|check\s+out|use\s+code|to\s+[a-z]+|head\s+to|link\s+in|for\s+\d+|for\s+making|for\s+providing|for\s+supporting|for\s+sponsoring|at\s+https?).*$/i,
    ''
  );

  // Strip punctuation at start/end
  name = name
    .replace(/[.,!?:;|~()[\]{}"`\\/]+$/g, '')
    .replace(/^[.,!?:;|~()[\]{}"`\\/]+/g, '')
    .trim();

  // Strip "our sponsor" prefix if present
  name = name.replace(/^our\s+sponsor(?::\s*|\s+|,?\s+)/i, '').trim();

  // Strip leading @ handle symbol e.g. "@dbrand" -> "dbrand"
  if (name.startsWith('@')) {
    name = name.slice(1).trim();
  }

  if (!name || STOP_WORDS.has(name.toLowerCase())) {
    return null;
  }

  // Token count: brand names should be 1 to 4 words and <= 40 chars
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 4 || name.length > 40) {
    return null;
  }

  return name;
}

/**
 * Rule-based, case-insensitive keyword matcher and sponsor extractor.
 * Evaluates text (description or transcript) for sponsorship markers.
 */
export function detectSponsorInText(text: string | undefined | null): TextMatchResult {
  if (!text || !text.trim()) {
    return { hasMatch: false, sponsorName: null };
  }

  const cleanText = text;

  // Keyword match regexes
  const phraseRegexes = [
    /sponsored by/i,
    /this video is sponsored/i,
    /brought to you by/i,
    /(?:special\s+|huge\s+)?thanks to\s+[^.,\n\r!?|]+?\s+for sponsoring/i,
    /in partnership with/i,
    /partnered with/i,
    /paid partnership/i,
    /(?:^|\s)#ad(?:\s|$|[.,!?])/i,
    /(?:^|\s)#sponsored(?:\s|$|[.,!?])/i,
    /\buse code\b/i,
    /\bpromo code\b/i,
  ];

  let hasMatch = false;
  for (const regex of phraseRegexes) {
    if (regex.test(cleanText)) {
      hasMatch = true;
      break;
    }
  }

  // Extraction patterns where pattern allows identifying the brand name
  const extractionPatterns = [
    /(?:this video is\s+)?sponsored by(?::\s*|\s+)([^.,\n\r!?|]+)/i,
    /brought to you by(?::\s*|\s+)([^.,\n\r!?|]+)/i,
    /(?:special\s+|huge\s+)?thanks to\s+([^.,\n\r!?|]+?)\s+for sponsoring/i,
    /(?:thanks to|thank you to)\s+our sponsor(?::\s*|\s+|,?\s+)([^.,\n\r!?|]+)/i,
    /(?:^|[\r\n\s])sponsor:\s*([^.,\n\r!?|]+)/i,
    /in partnership with(?::\s*|\s+)([^.,\n\r!?|]+)/i,
    /partnered with(?::\s*|\s+)([^.,\n\r!?|]+)/i,
  ];

  let sponsorName: string | null = null;
  for (const pattern of extractionPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const candidate = cleanSponsorName(match[1]);
      if (candidate) {
        sponsorName = candidate;
        hasMatch = true;
        break;
      }
    }
  }

  return { hasMatch, sponsorName };
}

/**
 * Determines per-video sponsorship status, name, and source based on the rules:
 * - 'yes' if flag true OR any phrase matched in description or transcript.
 * - 'no' if flag false AND no match in description AND transcript was fetched and had no match.
 * - 'unknown' if flag false, no description match, and transcript not available.
 *
 * Source rules:
 * - If sponsorName found in description -> 'description'
 * - If sponsorName found in transcript -> 'transcript'
 * - If sponsored === 'yes' but no name:
 *   - 'description' if description matched a phrase
 *   - 'transcript' if transcript matched a phrase
 *   - 'flag' if API flag was true
 * - If sponsored is 'no' or 'unknown' -> sponsorSource: null, sponsorName: null
 */
export function evaluateSponsorship(params: {
  hasPaidPlacement: boolean;
  descResult: TextMatchResult;
  transcriptText: string | null;
  transcriptFetched: boolean;
}): SponsorDetectionResult {
  const { hasPaidPlacement, descResult, transcriptText, transcriptFetched } = params;

  // Step 2 result: did description yield a sponsor name?
  if (descResult.sponsorName) {
    return {
      sponsored: 'yes',
      sponsorName: descResult.sponsorName,
      sponsorSource: 'description',
    };
  }

  // Step 3 result: check transcript if it was fetched
  let transResult: TextMatchResult | null = null;
  if (transcriptFetched && transcriptText !== null) {
    transResult = detectSponsorInText(transcriptText);
    if (transResult.sponsorName) {
      return {
        sponsored: 'yes',
        sponsorName: transResult.sponsorName,
        sponsorSource: 'transcript',
      };
    }
  }

  // No sponsor name extracted from description or transcript.
  // Check if any indicator matched:
  const isSponsored =
    hasPaidPlacement || descResult.hasMatch || Boolean(transResult?.hasMatch);

  if (isSponsored) {
    let sponsorSource: 'flag' | 'description' | 'transcript' = 'flag';
    if (descResult.hasMatch) {
      sponsorSource = 'description';
    } else if (transResult?.hasMatch) {
      sponsorSource = 'transcript';
    } else if (hasPaidPlacement) {
      sponsorSource = 'flag';
    }

    return {
      sponsored: 'yes',
      sponsorName: null,
      sponsorSource,
    };
  }

  // If not sponsored, check if transcript was fetched and had no match
  if (transcriptFetched) {
    return {
      sponsored: 'no',
      sponsorName: null,
      sponsorSource: null,
    };
  }

  // Flag false, no description match, transcript not available / failed
  return {
    sponsored: 'unknown',
    sponsorName: null,
    sponsorSource: null,
  };
}

/**
 * Fetch video transcript using youtube-transcript with a timeout.
 * Returns transcript text string if available, or null on error / unavailable / timeout.
 */
export async function fetchVideoTranscript(videoId: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const fetchPromise = YoutubeTranscript.fetchTranscript(videoId);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Transcript fetch timeout')), timeoutMs)
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
 * Concurrency runner for executing async tasks with a limit (e.g. 3 concurrent requests).
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
