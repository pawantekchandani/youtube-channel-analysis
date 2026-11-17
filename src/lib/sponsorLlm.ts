import { mapConcurrent } from "./sponsor";

export interface LlmSponsorItem {
  id: string;
  title: string;
  transcript: string;
}

export interface LlmSponsorResult {
  sponsored: boolean;
  sponsorName: string | null;
  evidence: string | null;
}

const PROMPT_HEADER =
  "You classify YouTube video transcript excerpts (parts are joined by ' ... '). For EACH video below, decide if it contains a paid sponsor or ad read for a third-party brand: a 'brought to you by', a segment promoting a product or service with a promo code, a discount link, or 'link in the description' to that brand, even if the word 'sponsor' is never said. NOT sponsored: the creator's own merch, store or courses; Patreon or channel memberships; plain product reviews or news with no promotional pitch. sponsorName = the brand name only, as the brand writes it (e.g. 'Squarespace', 'NordVPN'), or null if unclear. evidence = a short EXACT verbatim quote (10-40 words) copied from that video's transcript that shows the pitch; null if not sponsored. Return one result per video id.";

const MODEL = process.env.SPONSOR_LLM_MODEL || "deepseek/deepseek-v4.1-flash-1017";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RETRY_STATUS = new Set([429, 500, 502, 503]);

const BATCH_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          sponsored: { type: "boolean" },
          sponsorName: { type: ["string", "null"] },
          evidence: { type: ["string", "null"] },
        },
        required: ["id", "sponsored", "sponsorName", "evidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

/**
 * Checks whether evidence is a verbatim substring of the transcript.
 * Lowercase both, replace all non-letter/non-digit characters (Unicode-aware, \p{L}\p{N})
 * with single spaces, collapse spaces, trim.
 * Returns true if evidence (after normalization) is at least 4 words and is a substring of transcript.
 */
export function isVerbatim(
  evidence: string | null | undefined,
  transcript: string | null | undefined
): boolean {
  if (!evidence || !transcript) {
    return false;
  }

  const normalize = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normEvidence = normalize(evidence);
  const normTranscript = normalize(transcript);

  if (!normEvidence || !normTranscript) {
    return false;
  }

  const words = normEvidence.split(" ").filter(Boolean);
  if (words.length < 4) {
    return false;
  }

  return normTranscript.includes(normEvidence);
}

// Words that usually appear near a sponsor or ad read.
const PITCH_CUE =
  /sponsor|brought to you|partner|\.com|\bcode\b|% off|percent off|discount|free trial|link (?:is )?(?:in|below)|description|check (?:it )?out|promo|segue|thanks to|प्रायोजक|स्पॉन्सर|लिंक|डिस्क्रिप्शन|कोड|डिस्काउंट/gi;
const HEAD_CHARS = 2500;
const WINDOW_CHARS = 700;
const MAX_EXCERPT_CHARS = 6000;

/**
 * Builds a short excerpt of a transcript for the LLM: the opening part, plus
 * windows around pitch cue words. Overlapping windows are merged. Sending
 * full transcripts is slow and costly.
 */
export function buildPitchExcerpt(transcript: string): string {
  const ranges: Array<[number, number]> = [[0, Math.min(HEAD_CHARS, transcript.length)]];
  for (const m of transcript.matchAll(PITCH_CUE)) {
    const i = m.index ?? 0;
    ranges.push([Math.max(0, i - WINDOW_CHARS), Math.min(transcript.length, i + WINDOW_CHARS)]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  let out = '';
  for (const [a, b] of merged) {
    const part = transcript.slice(a, b);
    if (out.length + part.length > MAX_EXCERPT_CHARS) {
      out += (out ? ' ... ' : '') + part.slice(0, Math.max(0, MAX_EXCERPT_CHARS - out.length));
      break;
    }
    out += (out ? ' ... ' : '') + part;
  }
  return out;
}

export async function llmSponsorCheck(
  items: LlmSponsorItem[]
): Promise<Map<string, LlmSponsorResult>> {
  const resultMap = new Map<string, LlmSponsorResult>();
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (process.env.SPONSOR_LLM === "off" || items.length === 0) {
    return resultMap;
  }
  if (!apiKey) {
    console.warn("[sponsorLlm] OPENROUTER_API_KEY is not set; skipping LLM check");
    return resultMap;
  }

  const BATCH_SIZE = 10;
  const batches: LlmSponsorItem[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }

  const callLlm = async (prompt: string): Promise<any> => {
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: { name: "sponsor_batch", strict: true, schema: BATCH_SCHEMA },
          },
        }),
        signal: AbortSignal.timeout(120000),
      });
      const data: any = await res.json();
      if (res.ok && !data?.error) {
        return JSON.parse(data?.choices?.[0]?.message?.content || "");
      }
      const status = data?.error?.code ?? res.status;
      lastError = `HTTP ${status} ${data?.error?.message || ""}`;
      if (!RETRY_STATUS.has(Number(status))) break;
    }
    throw new Error(lastError);
  };

  await mapConcurrent(batches, 4, async (batch, batchIndex) => {
    let prompt = PROMPT_HEADER;
    for (const item of batch) {
      prompt += `\n\n=== VIDEO id=${item.id} title=${item.title} ===\n${buildPitchExcerpt(item.transcript)}`;
    }

    try {
      const parsed = await callLlm(prompt);
      if (!Array.isArray(parsed?.results)) {
        console.warn(`[sponsorLlm] batch ${batchIndex} failed: no results array`);
        return;
      }
      for (const r of parsed.results) {
        if (r && typeof r.id === "string") {
          resultMap.set(r.id, {
            sponsored: Boolean(r.sponsored),
            sponsorName: r.sponsorName ?? null,
            evidence: r.evidence ?? null,
          });
        }
      }
    } catch (err: any) {
      console.warn(`[sponsorLlm] batch ${batchIndex} failed: ${err?.message || err}`);
    }
  });

  return resultMap;
}
