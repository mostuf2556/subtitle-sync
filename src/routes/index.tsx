import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  align,
  fmt,
  LANGS,
  RTL,
  STRATEGIES,
  type Json3,
  type Row,
  type Strategy,
} from "@/lib/subtitles";
import {
  decodeInterceptedCaption,
  nativeShell,
  parseJson3,
  parseVideoId,
  timedTextVideoId,
} from "@/lib/native-captions";

const DEMO_VIDEO = "L2Ryrr6txwA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Parallel Subtitles — learn languages from video" },
      {
        name: "description",
        content:
          "Align json3 subtitles into parallel sentences and hear each language spoken between video sections.",
      },
      { property: "og:title", content: "Parallel Subtitles" },
      {
        property: "og:description",
        content: "Sentence-aligned multilingual subtitles with pause-and-speak playback.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, a: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
};
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
    onNativeCaptionsInterceptedBase64?: (payload: string) => void;
    onNativeSharedLinkReceived?: (url: string) => void;
    __pendingSharedLink?: string;
  }
}

type SpeechProgress = { lang: string; row: number; start: number; end: number } | null;
type Theme = "light" | "dark" | "dark-blue";
type PanelId = "player" | "playback" | "parser" | "languages" | "subtitles";

const PANELS: { id: PanelId; title: string }[] = [
  { id: "player", title: "Video" },
  { id: "playback", title: "Playback" },
  { id: "parser", title: "Parser" },
  { id: "languages", title: "Languages" },
  { id: "subtitles", title: "Parallel subtitles" },
];

function speak(
  text: string,
  lang: string,
  rate: number,
  voiceURI: string,
  row: number,
  onProgress: (value: SpeechProgress) => void,
) {
  return new Promise<void>((res) => {
    if (!text) return res();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const voices = speechSynthesis.getVoices();
    const v =
      voices.find((x) => x.voiceURI === voiceURI) ??
      voices.find((x) => x.lang.replace("_", "-").startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    u.onboundary = (event) => {
      if (event.name !== "word") return;
      const remainder = text.slice(event.charIndex);
      const wordLength = event.charLength || remainder.match(/^\S+/)?.[0].length || 1;
      onProgress({
        lang: lang.slice(0, 2),
        row,
        start: event.charIndex,
        end: event.charIndex + wordLength,
      });
    };
    u.onend = u.onerror = () => {
      onProgress(null);
      res();
    };
    speechSynthesis.speak(u);
  });
}

function Index() {
  const [isAndroid, setIsAndroid] = useState(false);
  const [videoId, setVideoId] = useState(DEMO_VIDEO);
  const [videoInput, setVideoInput] = useState("");
  const [captionStatus, setCaptionStatus] = useState("");
  const [observedUrl, setObservedUrl] = useState("");
  const [tracks, setTracks] = useState<Record<string, Json3> | null>(null);
  const [pivot, setPivot] = useState("he");
  const [strategy, setStrategy] = useState<Strategy>("sentence");
  const [shown, setShown] = useState<string[]>(["en", "he", "it"]);
  const [spoken, setSpoken] = useState<string[]>(["en", "it"]);
  const [targetLanguages, setTargetLanguages] = useState<string[]>(["he", "it"]);
  const [languageOrder, setLanguageOrder] = useState(() => LANGS.map((lang) => lang.code));
  const [rates, setRates] = useState<Record<string, number>>(() =>
    Object.fromEntries(LANGS.map((lang) => [lang.code, 1])),
  );
  const [voiceSelections, setVoiceSelections] = useState<Record<string, string>>({});
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [theme, setTheme] = useState<Theme>("light");
  const [pauseMode, setPauseMode] = useState(true);
  const [autoFocus, setAutoFocus] = useState(true);
  const [showVideoSubtitles, setShowVideoSubtitles] = useState(true);
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(() => PANELS.map((panel) => panel.id));
  const [openPanels, setOpenPanels] = useState<Record<PanelId, boolean>>({
    player: true,
    playback: true,
    parser: true,
    languages: true,
    subtitles: true,
  });
  const [active, setActive] = useState(-1);
  const [speakingLang, setSpeakingLang] = useState<string | null>(null);
  const [speakingRow, setSpeakingRow] = useState(-1);
  const [speechProgress, setSpeechProgress] = useState<SpeechProgress>(null);

  useEffect(() => {
    const shell = nativeShell();
    if (!shell) return;
    setIsAndroid(true);
    const openLink = (link: string) => {
      const id = parseVideoId(link);
      if (id) {
        setVideoId(id);
        setVideoInput(link);
      }
    };
    window.onNativeSharedLinkReceived = openLink;
    if (window.__pendingSharedLink) openLink(window.__pendingSharedLink);
    const query = new URLSearchParams(location.search).get("url");
    if (query) openLink(query);
    return () => {
      delete window.onNativeSharedLinkReceived;
    };
  }, []);

  useEffect(() => {
    if (!isAndroid) return;
    setTracks(null);
    setObservedUrl("");
    setCaptionStatus(
      "Waiting for YouTube captions. Play the video and enable captions if necessary.",
    );
    const shell = nativeShell();
    const captured = shell?.getLastObservedTimedTextUrl();
    if (captured && timedTextVideoId(captured) === videoId) setObservedUrl(captured);
    window.onNativeCaptionsInterceptedBase64 = (encoded) => {
      const payload = decodeInterceptedCaption(encoded);
      if (!payload || timedTextVideoId(payload.url) !== videoId) return;
      setObservedUrl(payload.url);
      const lang =
        new URL(payload.url).searchParams.get("tlang") ??
        new URL(payload.url).searchParams.get("lang");
      const json = parseJson3(payload.rawData);
      if (lang && json && LANGS.some((l) => l.code === lang))
        setTracks((prev) => ({ ...prev, [lang]: json }));
    };
    return () => {
      delete window.onNativeCaptionsInterceptedBase64;
    };
  }, [isAndroid, videoId]);

  useEffect(() => {
    if (!isAndroid || !observedUrl) return;
    const shell = nativeShell();
    if (!shell) return;
    const selected = [...new Set([...shown, ...spoken, ...targetLanguages, pivot])];
    let cancelled = false;
    // The Android bridge is synchronous; schedule languages separately to let the UI paint.
    const fetchTracks = async () => {
      const next: Record<string, Json3> = {};
      for (const code of selected) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (cancelled) return;
        try {
          const json = parseJson3(shell.fetchTranslatedCaptionsWithUrl(observedUrl, code, "json3"));
          if (json) next[code] = json;
        } catch {
          /* The observed URL may expire; wait for a new intercepted URL. */
        }
      }
      if (!cancelled) {
        setTracks((previous) => ({ ...previous, ...next }));
        setCaptionStatus(
          Object.keys(next).length
            ? `${Object.keys(next).length} live language tracks loaded.`
            : "No live captions returned. Enable captions on the video or try another video.",
        );
      }
    };
    setCaptionStatus("Fetching live subtitles for selected languages…");
    void fetchTracks();
    return () => {
      cancelled = true;
    };
  }, [isAndroid, observedUrl, shown, spoken, targetLanguages, pivot]);

  useEffect(() => {
    const saved = window.localStorage.getItem("parallel-subtitles-theme");
    if (saved === "light" || saved === "dark" || saved === "dark-blue") setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark", "dark-blue");
    if (theme !== "light") document.documentElement.classList.add(theme);
    window.localStorage.setItem("parallel-subtitles-theme", theme);
  }, [theme]);

  useEffect(() => {
    const refreshVoices = () => setVoices(window.speechSynthesis.getVoices());
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
  }, []);

  useEffect(() => {
    if (isAndroid) return;
    Promise.all(
      LANGS.map((l) =>
        fetch(`/fixtures/${DEMO_VIDEO}/${l.code}.json`)
          .then((response) => (response.ok ? response.json() : null))
          .then((j) => (j ? ([l.code, j] as const) : null))
          .catch(() => null),
      ),
    ).then((entries) =>
      setTracks(
        Object.fromEntries(
          entries.filter((entry): entry is readonly [string, Json3] => entry !== null),
        ),
      ),
    );
  }, [isAndroid]);

  const rows = useMemo<Row[]>(
    () => (tracks ? align(tracks, pivot, strategy) : []),
    [tracks, pivot, strategy],
  );

  // Keep latest values for the polling loop.
  const orderedLangs = languageOrder
    .map((code) => LANGS.find((lang) => lang.code === code))
    .filter((lang): lang is (typeof LANGS)[number] => Boolean(lang));
  const st = useRef({ rows, spoken, rates, voiceSelections, pauseMode, orderedLangs });
  st.current = { rows, spoken, rates, voiceSelections, pauseMode, orderedLangs };

  const playerEl = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const busy = useRef(false);
  const lastRow = useRef(-1);

  useEffect(() => {
    const init = () => {
      if (!playerEl.current || !window.YT) return;
      player.current = new window.YT.Player(playerEl.current, {
        videoId,
        playerVars: { rel: 0, cc_load_policy: isAndroid ? 1 : 0, playsinline: 1 },
      });
    };
    if (window.YT?.Player) init();
    else {
      window.onYouTubeIframeAPIReady = init;
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
    const iv = setInterval(async () => {
      const p = player.current;
      if (!p?.getCurrentTime || busy.current) return;
      const ms = p.getCurrentTime() * 1000;
      const { rows, spoken, rates, voiceSelections, pauseMode, orderedLangs } = st.current;
      const idx = rows.findIndex((r) => ms >= r.start && ms < r.end);
      setActive(idx);
      const prev = lastRow.current;
      lastRow.current = idx;
      // Crossed the end of a section while playing → pause and speak it.
      if (pauseMode && prev >= 0 && idx === prev + 1 && p.getPlayerState() === 1) {
        busy.current = true;
        p.pauseVideo();
        const langs = orderedLangs.filter((l) => spoken.includes(l.code));
        for (const l of langs) {
          setSpeakingLang(l.code);
          setSpeakingRow(prev);
          await speak(
            rows[prev]?.texts[l.code] ?? "",
            l.tts,
            rates[l.code] ?? 1,
            voiceSelections[l.code] ?? "",
            prev,
            setSpeechProgress,
          );
        }
        setSpeakingLang(null);
        setSpeakingRow(-1);
        busy.current = false;
        p.playVideo();
      }
    }, 150);
    return () => {
      clearInterval(iv);
      speechSynthesis.cancel();
      player.current?.destroy?.();
      player.current = null;
    };
  }, [videoId, isAndroid]);

  useEffect(() => {
    if (!autoFocus) return;
    document
      .querySelector(`[data-row="${active}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active, autoFocus]);

  const seek = (r: Row, i: number) => {
    speechSynthesis.cancel();
    busy.current = false;
    lastRow.current = i;
    player.current?.seekTo(r.start / 1000, true);
    player.current?.playVideo();
  };

  const toggle = (list: string[], set: (v: string[]) => void, c: string) =>
    set(list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);

  const moveLanguage = (code: string, direction: -1 | 1) => {
    setLanguageOrder((current) => {
      const index = current.indexOf(code);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next]!, copy[index]!];
      return copy;
    });
  };

  const movePanel = (id: PanelId, direction: -1 | 1) => {
    setPanelOrder((current) => {
      const index = current.indexOf(id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      const adjacent = copy[next];
      if (!adjacent) return current;
      copy[index] = adjacent;
      copy[next] = id;
      return copy;
    });
  };

  const cols = orderedLangs.filter((l) => shown.includes(l.code));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-4">
        <div className="mr-auto flex items-baseline gap-4">
          <h1 className="font-display text-2xl">Parallel Subtitles</h1>
          <span className="text-sm text-muted-foreground">
            video {videoId} · {rows.length} sections ·{" "}
            {isAndroid ? "live Android captions" : "fixture demo"}
          </span>
        </div>
        <div
          className="flex items-center gap-1 rounded-md border border-border bg-card p-1"
          aria-label="Color theme"
        >
          {(["light", "dark", "dark-blue"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={theme === option ? "default" : "ghost"}
              onClick={() => setTheme(option)}
              aria-pressed={theme === option}
              title={`${option === "dark-blue" ? "Dark blue" : option === "light" ? "Light" : "Dark"} theme`}
              className="gap-1.5 capitalize"
            >
              {option === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              {option === "dark-blue" ? "Blue" : option}
            </Button>
          ))}
        </div>
      </header>

      <div className="grid items-start gap-4 p-4 md:p-6 lg:grid-cols-2">
        {panelOrder.map((panelId, panelIndex) => {
          const panel = PANELS.find((candidate) => candidate.id === panelId);
          if (!panel) return null;
          return (
            <AccordionSection
              key={panelId}
              title={panel.title}
              open={openPanels[panelId]}
              onOpenChange={(open) => setOpenPanels((current) => ({ ...current, [panelId]: open }))}
              onMoveUp={() => movePanel(panelId, -1)}
              onMoveDown={() => movePanel(panelId, 1)}
              canMoveUp={panelIndex > 0}
              canMoveDown={panelIndex < panelOrder.length - 1}
              wide={panelId === "subtitles"}
            >
              {panelId === "player" && (
                <div>
                  {isAndroid && (
                    <form
                      className="flex gap-2 p-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const id = parseVideoId(videoInput);
                        if (id) setVideoId(id);
                        else setCaptionStatus("Enter a valid YouTube link or video ID.");
                      }}
                    >
                      <input
                        aria-label="YouTube video URL or ID"
                        value={videoInput}
                        onChange={(event) => setVideoInput(event.target.value)}
                        placeholder="YouTube link or video ID"
                        className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1"
                      />
                      <Button type="submit">Load video</Button>
                    </form>
                  )}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <div ref={playerEl} className="h-full w-full" />
                    {showVideoSubtitles && speakingLang && speakingRow >= 0 && (
                      <div
                        className="pointer-events-none absolute inset-x-3 top-3 text-center"
                        aria-live="polite"
                      >
                        <p
                          dir={RTL.has(speakingLang) ? "rtl" : "ltr"}
                          className="inline-block max-w-[92%] rounded-md bg-foreground/90 px-3 py-2 text-base font-medium text-background shadow-lg md:text-lg"
                        >
                          <HighlightedSubtitle
                            text={rows[speakingRow]?.texts[speakingLang] ?? ""}
                            progress={
                              speechProgress?.row === speakingRow &&
                              speechProgress.lang === speakingLang
                                ? speechProgress
                                : null
                            }
                          />
                        </p>
                      </div>
                    )}
                  </div>
                  {isAndroid && (
                    <p role="status" className="px-3 py-2 text-sm text-muted-foreground">
                      {captionStatus}
                    </p>
                  )}
                </div>
              )}

              {panelId === "playback" && (
                <div className="space-y-3">
                  {speakingLang ? (
                    <p>
                      Speaking <b>{LANGS.find((l) => l.code === speakingLang)?.name}</b>…
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Press play.{" "}
                      {pauseMode
                        ? "The video pauses after each section and speaks it."
                        : "Continuous playback."}
                    </p>
                  )}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pauseMode}
                      onChange={(e) => setPauseMode(e.target.checked)}
                    />{" "}
                    Pause &amp; speak after each section
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoFocus}
                      onChange={(e) => setAutoFocus(e.target.checked)}
                    />{" "}
                    Auto-focus and scroll to current subtitle
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showVideoSubtitles}
                      onChange={(e) => setShowVideoSubtitles(e.target.checked)}
                    />{" "}
                    Show spoken subtitle over video
                  </label>
                </div>
              )}

              {panelId === "parser" && (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {STRATEGIES.map((s) => (
                      <Button
                        key={s.id}
                        type="button"
                        size="sm"
                        variant={strategy === s.id ? "default" : "outline"}
                        onClick={() => setStrategy(s.id)}
                        title={s.desc}
                      >
                        {s.name}
                        {s.parallel ? " ⇄" : ""}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {STRATEGIES.find((s) => s.id === strategy)?.desc} · {rows.length} rows
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ⇄ = uses all parallel subtitles, not just one.
                  </p>
                  <label className="mt-3 flex items-center gap-2">
                    Timing from{" "}
                    <select
                      value={pivot}
                      onChange={(e) => setPivot(e.target.value)}
                      className="rounded-md border border-input bg-background px-2 py-1"
                    >
                      {LANGS.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {panelId === "languages" && (
                <>
                  <div className="mb-4 space-y-2 border-b border-border pb-4">
                    <label htmlFor="target-language-select" className="font-medium">
                      Target languages
                    </label>
                    <select
                      id="target-language-select"
                      aria-label="Target languages"
                      multiple
                      size={Math.min(LANGS.length, 6)}
                      value={targetLanguages}
                      onChange={(event) => {
                        const next = Array.from(
                          event.target.selectedOptions,
                          (option) => option.value,
                        );
                        setTargetLanguages(next);
                        setShown(next);
                      }}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5"
                    >
                      {LANGS.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Select one or more languages. Android fetches each selected translation
                      track from the observed YouTube captions request.
                    </p>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left font-normal">Language</th>
                        <th className="font-normal">Show</th>
                        <th className="font-normal">Speak</th>
                        <th className="font-normal">Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedLangs.map((l, index) => (
                        <tr key={l.code}>
                          <td className="py-1">{l.name}</td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={shown.includes(l.code)}
                              onChange={() => toggle(shown, setShown, l.code)}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={spoken.includes(l.code)}
                              onChange={() => toggle(spoken, setSpoken, l.code)}
                            />
                          </td>
                          <td>
                            <div className="flex justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={index === 0}
                                onClick={() => moveLanguage(l.code, -1)}
                                title={`Move ${l.name} earlier`}
                                aria-label={`Move ${l.name} earlier`}
                              >
                                <ChevronUp aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={index === orderedLangs.length - 1}
                                onClick={() => moveLanguage(l.code, 1)}
                                title={`Move ${l.name} later`}
                                aria-label={`Move ${l.name} later`}
                              >
                                <ChevronDown aria-hidden="true" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 space-y-3 border-t border-border pt-3">
                    {orderedLangs
                      .filter((lang) => spoken.includes(lang.code))
                      .map((lang) => {
                        const languageVoices = voices.filter((voice) =>
                          voice.lang.replace("_", "-").startsWith(lang.tts.slice(0, 2)),
                        );
                        return (
                          <div key={lang.code} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{lang.name}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {(rates[lang.code] ?? 1).toFixed(1)}×
                              </span>
                            </div>
                            <input
                              aria-label={`${lang.name} speech rate`}
                              type="range"
                              min={0.6}
                              max={1.4}
                              step={0.1}
                              value={rates[lang.code] ?? 1}
                              onChange={(e) =>
                                setRates((current) => ({
                                  ...current,
                                  [lang.code]: Number(e.target.value),
                                }))
                              }
                              className="w-full"
                            />
                            <select
                              aria-label={`${lang.name} voice`}
                              value={voiceSelections[lang.code] ?? ""}
                              onChange={(e) =>
                                setVoiceSelections((current) => ({
                                  ...current,
                                  [lang.code]: e.target.value,
                                }))
                              }
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5"
                            >
                              <option value="">Device default</option>
                              {languageVoices.map((voice) => (
                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                  {voice.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}

              {panelId === "subtitles" &&
                (!tracks ? (
                  <p className="p-2 text-muted-foreground">Loading subtitles…</p>
                ) : (
                  <div className="max-h-[calc(100vh-8rem)] overflow-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 z-10 bg-secondary">
                        <tr>
                          <th className="w-24 px-3 py-2 text-left font-medium">Time</th>
                          {cols.map((l) => (
                            <th key={l.code} className="px-3 py-2 text-left font-medium">
                              {l.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr
                            key={i}
                            data-row={i}
                            onClick={() => seek(r, i)}
                            className={`cursor-pointer border-t border-border align-top ${i === active ? "bg-accent" : "hover:bg-muted"}`}
                          >
                            <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                              {fmt(r.start)}–{fmt(r.end)}
                            </td>
                            {cols.map((l) => (
                              <td
                                key={l.code}
                                dir={RTL.has(l.code) ? "rtl" : "ltr"}
                                className="px-3 py-2 leading-relaxed"
                              >
                                <HighlightedSubtitle
                                  text={r.texts[l.code] ?? ""}
                                  progress={
                                    speechProgress?.row === i && speechProgress.lang === l.code
                                      ? speechProgress
                                      : null
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </AccordionSection>
          );
        })}
      </div>
    </div>
  );
}

function HighlightedSubtitle({
  text,
  progress,
}: {
  text: string;
  progress: Exclude<SpeechProgress, null> | null;
}) {
  if (!progress) return text;
  return (
    <>
      {text.slice(0, progress.start)}
      <mark className="rounded-sm bg-highlight px-0.5 text-highlight-foreground">
        {text.slice(progress.start, progress.end)}
      </mark>
      {text.slice(progress.end)}
    </>
  );
}

function AccordionSection({
  title,
  children,
  open,
  onOpenChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  wide?: boolean;
}) {
  return (
    <details
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
      className={`overflow-hidden rounded-lg border border-border bg-card text-sm ${wide ? "lg:col-span-2" : ""}`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 marker:hidden">
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
        <h2 className="mr-auto text-xs uppercase tracking-wider text-muted-foreground">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canMoveUp}
          onClick={(event) => {
            event.preventDefault();
            onMoveUp();
          }}
          aria-label={`Move ${title} earlier`}
          title={`Move ${title} earlier`}
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canMoveDown}
          onClick={(event) => {
            event.preventDefault();
            onMoveDown();
          }}
          aria-label={`Move ${title} later`}
          title={`Move ${title} later`}
        >
          <ChevronDown aria-hidden="true" />
        </Button>
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}
