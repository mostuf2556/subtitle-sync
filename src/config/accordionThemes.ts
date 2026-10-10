export type PanelId =
  "player" | "playback" | "parser" | "languages" | "language-player" | "subtitles" | "library";

export interface PanelConfig {
  id: PanelId;
  title: string;
}

export const PANELS: PanelConfig[] = [
  { id: "player", title: "Video" },
  { id: "playback", title: "Playback" },
  { id: "parser", title: "Parser" },
  { id: "languages", title: "Languages" },
  { id: "language-player", title: "Language video player" },
  { id: "subtitles", title: "Parallel subtitles" },
  { id: "library", title: "Video library" },
];

export interface AccordionTheme {
  borderLeft: string;
  summaryBg: string;
  badgeBg: string;
  dotBg: string;
  tagColor: string;
}

export const ACCORDION_THEMES: Record<PanelId, AccordionTheme> = {
  player: {
    borderLeft: "border-l-4 border-l-blue-500",
    summaryBg: "bg-blue-50/70 hover:bg-blue-100/70 dark:bg-blue-950/30 dark:hover:bg-blue-950/50",
    badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dotBg: "bg-blue-500",
    tagColor: "blue",
  },
  playback: {
    borderLeft: "border-l-4 border-l-emerald-500",
    summaryBg:
      "bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50",
    badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dotBg: "bg-emerald-500",
    tagColor: "emerald",
  },
  parser: {
    borderLeft: "border-l-4 border-l-amber-500",
    summaryBg:
      "bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-950/50",
    badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dotBg: "bg-amber-500",
    tagColor: "amber",
  },
  languages: {
    borderLeft: "border-l-4 border-l-purple-500",
    summaryBg:
      "bg-purple-50/70 hover:bg-purple-100/70 dark:bg-purple-950/30 dark:hover:bg-purple-950/50",
    badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    dotBg: "bg-purple-500",
    tagColor: "purple",
  },
  "language-player": {
    borderLeft: "border-l-4 border-l-indigo-500",
    summaryBg:
      "bg-indigo-50/70 hover:bg-indigo-100/70 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50",
    badgeBg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    dotBg: "bg-indigo-500",
    tagColor: "indigo",
  },
  subtitles: {
    borderLeft: "border-l-4 border-l-teal-500",
    summaryBg: "bg-teal-50/70 hover:bg-teal-100/70 dark:bg-teal-950/30 dark:hover:bg-teal-950/50",
    badgeBg: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
    dotBg: "bg-teal-500",
    tagColor: "teal",
  },
  library: {
    borderLeft: "border-l-4 border-l-rose-500",
    summaryBg: "bg-rose-50/70 hover:bg-rose-100/70 dark:bg-rose-950/30 dark:hover:bg-rose-950/50",
    badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    dotBg: "bg-rose-500",
    tagColor: "rose",
  },
};
