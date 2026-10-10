/**
 * Controls one plain YouTube <iframe> through its postMessage control values
 * (enablejsapi=1). The iframe is created once and never replaced: play, pause
 * and seek are sent as commands; time and state come from "infoDelivery".
 */
export type IframeControlledPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
};

export function createIframePlayer(
  host: HTMLElement,
  videoId: string,
  opts: { autoplay?: boolean; captionLang?: string } = {},
): IframeControlledPlayer {
  const origin = window.location.origin;
  const iframe = document.createElement("iframe");
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    cc_load_policy: "1",
    autoplay: opts.autoplay ? "1" : "0",
    origin,
  });
  if (opts.captionLang) {
    params.set("cc_lang_pref", opts.captionLang);
  }
  iframe.src = `https://www.youtube.com/embed/${videoId}?${params}`;
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.setAttribute("allowfullscreen", "");
  iframe.className = "h-full w-full border-0";
  iframe.dataset.testid = "plain-youtube-iframe";
  host.appendChild(iframe);

  let currentTime = 0;
  let lastTimeAt = 0;
  let state = -1;

  const post = (func: string, args: unknown[] = []) =>
    iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");

  const activateCaptions = () => {
    post("loadModule", ["captions"]);
    if (opts.captionLang) {
      post("setOption", ["captions", "track", { languageCode: opts.captionLang }]);
    }
  };

  const onMessage = (e: MessageEvent) => {
    if (e.source !== iframe.contentWindow) return;
    let data: { event?: string; info?: { currentTime?: number; playerState?: number } };
    try {
      data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
    } catch {
      return;
    }
    if (data?.event === "onReady" || data?.event === "initialDelivery") {
      activateCaptions();
    }
    const info = data?.info;
    if (!info) return;
    if (typeof info.currentTime === "number") {
      currentTime = info.currentTime;
      lastTimeAt = performance.now();
    }
    if (typeof info.playerState === "number") state = info.playerState;
  };
  window.addEventListener("message", onMessage);
  const listen = () => {
    iframe.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*");
    activateCaptions();
  };
  iframe.addEventListener("load", listen);
  const keepAlive = window.setInterval(listen, 2000);

  return {
    playVideo: () => post("playVideo"),
    pauseVideo: () => post("pauseVideo"),
    seekTo: (s, a) => {
      currentTime = s;
      lastTimeAt = performance.now();
      post("seekTo", [s, a]);
    },
    // Interpolate between infoDelivery updates while playing for smooth section detection
    getCurrentTime: () =>
      state === 1 && lastTimeAt
        ? currentTime + (performance.now() - lastTimeAt) / 1000
        : currentTime,
    getPlayerState: () => state,
    destroy: () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(keepAlive);
      iframe.remove();
    },
  };
}
