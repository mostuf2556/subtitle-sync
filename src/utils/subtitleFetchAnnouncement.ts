export type SubtitleFetchMethod =
  | "server"
  | "anon"
  | "session"
  | "cache"
  | "direct"
  | "interception"
  | "fixture"
  | "manual";

export interface SubtitleFetchAnnouncementParams {
  languageName: string;
  langCode?: string;
  method?: SubtitleFetchMethod;
  cuesCount?: number;
}

const METHOD_LABELS: Record<SubtitleFetchMethod, string> = {
  server: "via server",
  anon: "anonymously",
  session: "with session",
  cache: "from cache",
  direct: "directly",
  interception: "from video captions",
  fixture: "from fixture",
  manual: "manually",
};

export function describeSubtitleFetchMethod(method?: SubtitleFetchMethod): string {
  if (!method) return "";
  return METHOD_LABELS[method] ?? "";
}

export function buildSubtitleFetchAnnouncement({
  languageName,
  langCode,
  method,
}: SubtitleFetchAnnouncementParams): string {
  const cleanName = (languageName || langCode || "Subtitles").split("(")[0].trim();
  const methodPhrase = describeSubtitleFetchMethod(method);
  if (methodPhrase) {
    return `${cleanName} subtitles fetched ${methodPhrase}`;
  }
  return `${cleanName} subtitles fetched`;
}
