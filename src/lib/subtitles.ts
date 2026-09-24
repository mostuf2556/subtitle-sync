// json3 subtitle parsing + parallel sentence alignment strategies.

export type Json3 = {
  events?: { tStartMs?: number; dDurationMs?: number; segs?: { utf8?: string; tOffsetMs?: number }[] }[];
};

export type Cue = { start: number; end: number; text: string };
/** A timed piece of text (word when offsets exist, otherwise a whole cue). */
type Token = { t: number; text: string };

export type Row = { start: number; end: number; texts: Record<string, string> };

export const LANGS: { code: string; name: string; tts: string }[] = [
  { code: "en", name: "English", tts: "en-US" },
  { code: "he", name: "Hebrew", tts: "he-IL" },
  { code: "ar", name: "Arabic", tts: "ar-SA" },
  { code: "it", name: "Italian", tts: "it-IT" },
  { code: "ru", name: "Russian", tts: "ru-RU" },
];

export const RTL = new Set(["he", "ar"]);

export function parseCues(j: Json3): Cue[] {
  const out: Cue[] = [];
  for (const e of j.events ?? []) {
    if (!e.segs) continue;
    const text = e.segs.map((s) => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const start = e.tStartMs ?? 0;
    out.push({ start, end: start + (e.dDurationMs ?? 0), text });
  }
  // Clip overlaps (ASR tracks overlap the next cue).
  for (let i = 0; i < out.length - 1; i++) out[i]!.end = Math.min(out[i]!.end, out[i + 1]!.start);
  return out;
}

function tokens(j: Json3): Token[] {
  const out: Token[] = [];
  for (const e of j.events ?? []) {
    if (!e.segs) continue;
    const base = e.tStartMs ?? 0;
    for (const s of e.segs) {
      const text = (s.utf8 ?? "").replace(/\s+/g, " ");
      if (text.trim()) out.push({ t: base + (s.tOffsetMs ?? 0), text });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

export type Strategy = "cue" | "sentence" | "window";

export const STRATEGIES: { id: Strategy; name: string; desc: string }[] = [
  { id: "sentence", name: "Sentence", desc: "Merge pivot cues until . ? ! ends a sentence." },
  { id: "cue", name: "Cue", desc: "One row per pivot-language cue, as authored." },
  { id: "window", name: "Window", desc: "Merge pivot cues into ~7s blocks (language-agnostic)." },
];

/** Build time sections from the pivot track using a strategy. */
export function sections(pivot: Cue[], strategy: Strategy): { start: number; end: number }[] {
  if (strategy === "cue") return pivot.map(({ start, end }) => ({ start, end }));
  const out: { start: number; end: number }[] = [];
  let cur: { start: number; end: number } | null = null;
  for (const c of pivot) {
    if (!cur) cur = { start: c.start, end: c.end };
    else cur.end = c.end;
    const done =
      strategy === "sentence"
        ? /[.?!…。؟]["'»)]*$/.test(c.text) || cur.end - cur.start > 15000
        : cur.end - cur.start >= 7000;
    if (done) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Align every track into the pivot's time sections; tokens are bucketed by timestamp. */
export function align(tracks: Record<string, Json3>, pivot: string, strategy: Strategy): Row[] {
  const secs = sections(parseCues(tracks[pivot] ?? {}), strategy);
  const rows: Row[] = secs.map((s) => ({ ...s, texts: {} }));
  if (!rows.length) return rows;
  // Make sections contiguous so no token falls between rows.
  for (let i = 0; i < rows.length - 1; i++) rows[i]!.end = rows[i + 1]!.start;
  for (const [lang, j] of Object.entries(tracks)) {
    let r = 0;
    for (const tk of tokens(j)) {
      while (r < rows.length - 1 && tk.t >= rows[r + 1]!.start) r++;
      rows[r]!.texts[lang] = (rows[r]!.texts[lang] ?? "") + tk.text;
    }
  }
  for (const row of rows)
    for (const k of Object.keys(row.texts)) row.texts[k] = row.texts[k]!.replace(/\s+/g, " ").trim();
  return rows;
}

export function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
