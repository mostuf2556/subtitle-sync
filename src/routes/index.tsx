import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { align, fmt, LANGS, RTL, STRATEGIES, type Json3, type Row, type Strategy } from "@/lib/subtitles";

const VIDEO = "L2Ryrr6txwA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Parallel Subtitles — learn languages from video" },
      { name: "description", content: "Align json3 subtitles into parallel sentences and hear each language spoken between video sections." },
      { property: "og:title", content: "Parallel Subtitles" },
      { property: "og:description", content: "Sentence-aligned multilingual subtitles with pause-and-speak playback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type YTPlayer = { playVideo(): void; pauseVideo(): void; seekTo(s: number, a: boolean): void; getCurrentTime(): number; getPlayerState(): number };
declare global {
  interface Window { YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer }; onYouTubeIframeAPIReady?: () => void }
}

function speak(text: string, lang: string, rate: number) {
  return new Promise<void>((res) => {
    if (!text) return res();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const v = speechSynthesis.getVoices().find((x) => x.lang.replace("_", "-").startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    u.onend = u.onerror = () => res();
    speechSynthesis.speak(u);
  });
}

function Index() {
  const [tracks, setTracks] = useState<Record<string, Json3> | null>(null);
  const [pivot, setPivot] = useState("he");
  const [strategy, setStrategy] = useState<Strategy>("sentence");
  const [shown, setShown] = useState<string[]>(["en", "he", "it"]);
  const [spoken, setSpoken] = useState<string[]>(["en", "it"]);
  const [rate, setRate] = useState(1);
  const [pauseMode, setPauseMode] = useState(true);
  const [active, setActive] = useState(-1);
  const [speakingLang, setSpeakingLang] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(LANGS.map((l) => fetch(`/fixtures/${VIDEO}/${l.code}.json`).then((r) => r.json()).then((j) => [l.code, j] as const)))
      .then((e) => setTracks(Object.fromEntries(e)));
  }, []);

  const rows = useMemo<Row[]>(() => (tracks ? align(tracks, pivot, strategy) : []), [tracks, pivot, strategy]);

  // Keep latest values for the polling loop.
  const st = useRef({ rows, spoken, rate, pauseMode });
  st.current = { rows, spoken, rate, pauseMode };

  const playerEl = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const busy = useRef(false);
  const lastRow = useRef(-1);

  useEffect(() => {
    const init = () => {
      if (!playerEl.current || !window.YT) return;
      player.current = new window.YT.Player(playerEl.current, {
        videoId: VIDEO,
        playerVars: { rel: 0, cc_load_policy: 0, playsinline: 1 },
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
      const { rows, spoken, rate, pauseMode } = st.current;
      const idx = rows.findIndex((r) => ms >= r.start && ms < r.end);
      setActive(idx);
      const prev = lastRow.current;
      lastRow.current = idx;
      // Crossed the end of a section while playing → pause and speak it.
      if (pauseMode && prev >= 0 && idx === prev + 1 && p.getPlayerState() === 1) {
        busy.current = true;
        p.pauseVideo();
        const langs = LANGS.filter((l) => spoken.includes(l.code));
        for (const l of langs) {
          setSpeakingLang(l.code);
          await speak(rows[prev]?.texts[l.code] ?? "", l.tts, rate);
        }
        setSpeakingLang(null);
        busy.current = false;
        p.playVideo();
      }
    }, 150);
    return () => { clearInterval(iv); speechSynthesis.cancel(); };
  }, []);

  useEffect(() => {
    document.querySelector(`[data-row="${active}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active]);

  const seek = (r: Row, i: number) => {
    speechSynthesis.cancel();
    busy.current = false;
    lastRow.current = i;
    player.current?.seekTo(r.start / 1000, true);
    player.current?.playVideo();
  };

  const toggle = (list: string[], set: (v: string[]) => void, c: string) =>
    set(list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);

  const cols = LANGS.filter((l) => shown.includes(l.code));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-baseline gap-4">
        <h1 className="font-display text-2xl">Parallel Subtitles</h1>
        <span className="text-sm text-muted-foreground">video {VIDEO} · {rows.length} sections</span>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,520px)_1fr] gap-6 p-6">
        <aside className="space-y-5 lg:sticky lg:top-6 self-start">
          <div className="aspect-video rounded-lg overflow-hidden bg-muted"><div ref={playerEl} className="w-full h-full" /></div>

          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            {speakingLang ? (
              <p>Speaking <b>{LANGS.find((l) => l.code === speakingLang)?.name}</b>…</p>
            ) : (
              <p className="text-muted-foreground">Press play. {pauseMode ? "The video pauses after each section and speaks it." : "Continuous playback."}</p>
            )}
          </div>

          <Section title="Parser">
            <div className="grid grid-cols-3 gap-2">
              {STRATEGIES.map((s) => (
                <button key={s.id} onClick={() => setStrategy(s.id)} title={s.desc}
                  className={`rounded-md border px-2 py-1.5 ${strategy === s.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                  {s.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{STRATEGIES.find((s) => s.id === strategy)?.desc}</p>
            <label className="flex items-center gap-2 mt-3">Timing from
              <select value={pivot} onChange={(e) => setPivot(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1">
                {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </label>
          </Section>

          <Section title="Languages">
            <table className="w-full">
              <thead><tr className="text-xs text-muted-foreground"><th className="text-left font-normal">Language</th><th className="font-normal">Show</th><th className="font-normal">Speak</th></tr></thead>
              <tbody>
                {LANGS.map((l) => (
                  <tr key={l.code}>
                    <td className="py-1">{l.name}</td>
                    <td className="text-center"><input type="checkbox" checked={shown.includes(l.code)} onChange={() => toggle(shown, setShown, l.code)} /></td>
                    <td className="text-center"><input type="checkbox" checked={spoken.includes(l.code)} onChange={() => toggle(spoken, setSpoken, l.code)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label className="flex items-center gap-2 mt-3"><input type="checkbox" checked={pauseMode} onChange={(e) => setPauseMode(e.target.checked)} /> Pause &amp; speak after each section</label>
            <label className="flex items-center gap-2 mt-2">Voice speed
              <input type="range" min={0.6} max={1.4} step={0.1} value={rate} onChange={(e) => setRate(+e.target.value)} className="flex-1" />
              <span className="w-8 text-right tabular-nums">{rate.toFixed(1)}</span>
            </label>
          </Section>
        </aside>

        <main className="rounded-lg border border-border bg-card overflow-hidden">
          {!tracks ? <p className="p-6 text-muted-foreground">Loading subtitles…</p> : (
            <div className="max-h-[calc(100vh-8rem)] overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-secondary z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium w-24">Time</th>
                    {cols.map((l) => <th key={l.code} className="px-3 py-2 text-left font-medium">{l.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} data-row={i} onClick={() => seek(r, i)}
                      className={`cursor-pointer border-t border-border align-top ${i === active ? "bg-accent" : "hover:bg-muted"}`}>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground whitespace-nowrap">{fmt(r.start)}–{fmt(r.end)}</td>
                      {cols.map((l) => (
                        <td key={l.code} dir={RTL.has(l.code) ? "rtl" : "ltr"} className="px-3 py-2 leading-relaxed">{r.texts[l.code] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 text-sm">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{title}</h2>
      {children}
    </section>
  );
}
