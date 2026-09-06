import { useCallback, useEffect, useRef, useState } from "react";
import { Director } from "./showcase/Director";
import {
  DURATION,
  WORLDS,
  clamp,
  formatTime,
  frameAt,
} from "./showcase/timeline";
import {
  createGame,
  stepGame,
  NO_INPUT,
  type GameState,
} from "./showcase/simulation";
import { LEVELS } from "./showcase/levels";
import { RunBoard } from "./showcase/RunBoard";

export interface CaptureAPI {
  ready: boolean;
  game?: () => GameState | null;
  frame: () => string;
  render: (time: number) => void | Promise<void>;
  resize: (width: number, height: number) => void;
  state: () => {
    time: number;
    active: number;
    playing: boolean;
    riding: boolean;
  };
}
declare global {
  interface Window {
    __TRON__?: CaptureAPI;
  }
}

export default function TronApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const directorRef = useRef<Director | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeRef = useRef(0);
  const playRef = useRef(true);
  const rideRef = useRef(true);
  const worldRef = useRef(3);
  const keysRef = useRef(new Set<string>());
  const rideState = useRef(createGame(3));
  const stepAccumulator = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(playRef.current);
  const [riding, setRiding] = useState(true);
  const [selectedWorld, setSelectedWorld] = useState(3);
  const [sound, setSound] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordMessage, setRecordMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const syncAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = clamp(timeRef.current, 0, DURATION - 0.01);
    if (playRef.current && !audio.muted)
      void audio.play().catch(() => {
        setSound(false);
      });
    else audio.pause();
  }, []);

  const seek = useCallback(
    (next: number) => {
      if (recordingRef.current) return;
      timeRef.current = clamp(next, 0, DURATION);
      setTime(timeRef.current);
      directorRef.current?.render(
        timeRef.current,
        rideRef.current ? worldRef.current : -1,
        rideRef.current ? rideState.current : undefined,
      );
      syncAudio();
    },
    [syncAudio],
  );

  const togglePlaying = useCallback(() => {
    if (recordingRef.current) return;
    if (timeRef.current >= DURATION) timeRef.current = 0;
    playRef.current = !playRef.current;
    setPlaying(playRef.current);
    syncAudio();
  }, [syncAudio]);

  const chooseWorld = useCallback(
    (index: number) => {
      if (recordingRef.current) return;
      worldRef.current = index;
      setSelectedWorld(index);
      if (rideRef.current) {
        rideState.current = createGame(index);
        stepAccumulator.current = 0;
        directorRef.current?.render(timeRef.current, index, rideState.current);
      } else seek(WORLDS[index].start + 0.8);
      (document.activeElement as HTMLElement)?.blur();
    },
    [seek],
  );

  useEffect(() => {
    let disposed = false,
      animation = 0,
      director: Director | undefined;
    let lastTime = performance.now(),
      lastPaint = 0,
      lastUI = 0;
    const initialize = async () => {
      await Promise.all([
        document.fonts.load("800 32px Showcase"),
        document.fonts.load("400 18px Showcase"),
        document.fonts.load("12px Telemetry"),
      ]);
      if (disposed || !canvasRef.current) return;
      try {
        director = new Director(canvasRef.current, 1600, 900);
        directorRef.current = director;
        await director.ready;
        if (disposed) return;
        director.render(0, worldRef.current, rideState.current);
        window.__TRON__ = {
          ready: true,
          game: () =>
            rideRef.current ? structuredClone(rideState.current) : null,
          frame: () =>
            director!.canvas.toDataURL("image/jpeg", 0.95).split(",")[1],
          render: (seconds) => {
            timeRef.current = clamp(seconds, 0, DURATION);
            director!.render(timeRef.current);
          },
          resize: (w, h) => {
            director!.setSize(w, h);
          },
          state: () => ({
            time: timeRef.current,
            active: rideRef.current
              ? worldRef.current
              : frameAt(timeRef.current).active,
            playing: playRef.current,
            riding: rideRef.current,
          }),
        };
        setReady(true);
      } catch (err) {
        setError(
          `The 3D renderer could not start. Enable hardware acceleration in your browser and reload. ${err instanceof Error ? err.message : ""}`,
        );
        return;
      }
      const tick = (now: number) => {
        if (disposed) return;
        animation = requestAnimationFrame(tick);
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        if (!playRef.current || document.hidden) return;
        timeRef.current += dt;
        if (rideRef.current) {
          const keys = keysRef.current;
          const controls = {
            steer:
              Number(keys.has("ArrowRight") || keys.has("KeyD")) -
              Number(keys.has("ArrowLeft") || keys.has("KeyA")),
            throttle: keys.has("ArrowUp") || keys.has("KeyW"),
            brake: keys.has("ArrowDown") || keys.has("KeyS"),
            boost: keys.has("ShiftLeft") || keys.has("ShiftRight"),
            jump: keys.has("Space"),
            drift: keys.has("Space"),
          };
          stepAccumulator.current += dt;
          while (stepAccumulator.current >= 1 / 120) {
            stepGame(rideState.current, controls, 1 / 120);
            stepAccumulator.current -= 1 / 120;
          }
        } else if (timeRef.current >= DURATION) {
          timeRef.current = DURATION;
          playRef.current = false;
          setPlaying(false);
          audioRef.current?.pause();
          if (recorderRef.current?.state === "recording")
            recorderRef.current.stop();
        }
        if (now - lastPaint > 1000 / 30 - 2) {
          director!.render(
            timeRef.current,
            rideRef.current ? worldRef.current : -1,
            rideRef.current ? rideState.current : undefined,
          );
          lastPaint = now;
        }
        if (now - lastUI > 150) {
          setTime(timeRef.current);
          lastUI = now;
        }
      };
      animation = requestAnimationFrame(tick);
    };
    void initialize();
    const observer = new ResizeObserver(() => {
      const wrap = wrapRef.current;
      if (wrap)
        wrap.classList.toggle(
          "fit-height",
          wrap.clientWidth / Math.max(1, wrap.clientHeight - 36) > 16 / 9,
        );
    });
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      observer.disconnect();
      director?.dispose();
      directorRef.current = null;
      delete window.__TRON__;
    };
  }, []);

  useEffect(() => {
    const audio = new Audio("./audio/score.mp3");
    audio.preload = "none";
    audio.volume = 0.7;
    audio.muted = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (recorderRef.current?.state === "recording")
        recorderRef.current.stop();
      if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (!rideRef.current && event.target instanceof HTMLButtonElement) return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          event.code,
        )
      )
        event.preventDefault();
      keysRef.current.add(event.code);
      if (event.repeat) return;
      if (event.code === "Space" && !rideRef.current) togglePlaying();
      if (event.code === "KeyP") togglePlaying();
      if (event.code === "KeyR" && rideRef.current) {
        rideState.current = createGame(worldRef.current);
        stepAccumulator.current = 0;
      }
      if (event.code === "ArrowRight" && !rideRef.current)
        seek(timeRef.current + 5);
      if (event.code === "ArrowLeft" && !rideRef.current)
        seek(timeRef.current - 5);
      if (/^Digit[1-4]$/.test(event.code))
        chooseWorld(Number(event.code.slice(-1)) - 1);
      if (event.code === "Escape" && rideRef.current) {
        rideRef.current = false;
        setRiding(false);
        seek(0);
      }
    };
    const keyUp = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const blur = () => keysRef.current.clear();
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
    };
  }, [togglePlaying, seek, chooseWorld]);

  const toggleSound = async () => {
    const audio = audioRef.current!;
    audio.muted = sound;
    setSound(!sound);
    if (!sound) {
      await audioContextRef.current?.resume();
      syncAudio();
    } else audio.pause();
  };
  const startMission = () => {
    if (rideState.current.status !== "ready")
      rideState.current = createGame(worldRef.current);
    stepAccumulator.current = 0;
    stepGame(rideState.current, { ...NO_INPUT, throttle: true }, 1 / 120);
    playRef.current = true;
    setPlaying(true);
    setTime(rideState.current.time);
    (document.activeElement as HTMLElement)?.blur();
    directorRef.current?.render(
      timeRef.current,
      worldRef.current,
      rideState.current,
    );
  };
  const toggleRide = () => {
    if (recordingRef.current) return;
    rideRef.current = !rideRef.current;
    setRiding(rideRef.current);
    if (rideRef.current) {
      const active = frameAt(timeRef.current).active;
      if (active >= 0) {
        worldRef.current = active;
        setSelectedWorld(active);
      }
      timeRef.current = 0;
      rideState.current = createGame(worldRef.current);
      stepAccumulator.current = 0;
      keysRef.current.clear();
      playRef.current = true;
      setPlaying(true);
    } else seek(0);
    (document.activeElement as HTMLElement)?.blur();
    syncAudio();
  };

  const recordFilm = async () => {
    if (!canvasRef.current || !directorRef.current || recordingRef.current)
      return;
    if (!("MediaRecorder" in window)) {
      setRecordMessage("Use npm run capture to export on this browser.");
      return;
    }
    try {
      const audio = audioRef.current!;
      if (!audioContextRef.current) {
        const context = new AudioContext();
        audioContextRef.current = context;
        const source = context.createMediaElementSource(audio);
        const destination = context.createMediaStreamDestination();
        audioDestRef.current = destination;
        source.connect(destination);
        source.connect(context.destination);
      }
      await audioContextRef.current.resume();
      audio.muted = false;
      setSound(true);
      const stream = canvasRef.current.captureStream(30);
      audioDestRef
        .current!.stream.getAudioTracks()
        .forEach((track) => stream.addTrack(track));
      const mimeType = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/webm;codecs=vp9,opus",
        "video/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType)
        throw new Error(
          "No supported video encoder. Run npm run capture for MP4 export.",
        );
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 12_000_000,
      });
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getVideoTracks().forEach((track) => track.stop());
        recordingRef.current = false;
        setRecording(false);
        if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
        if (!chunks.length) {
          setRecordMessage("Recording was empty. Use npm run capture.");
          return;
        }
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = `tron-worlds-demo.${mimeType.includes("mp4") ? "mp4" : "webm"}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        setRecordMessage("Demo saved.");
      };
      recorder.onerror = () => {
        recordingRef.current = false;
        setRecording(false);
        setRecordMessage(
          "Recording failed. Use npm run capture for offline export.",
        );
      };
      rideRef.current = false;
      setRiding(false);
      seek(0);
      directorRef.current.setSize(1920, 1080);
      directorRef.current.render(0);
      recordingRef.current = true;
      setRecording(true);
      setRecordMessage("Recording · keep this tab visible");
      recorder.start(1000);
      playRef.current = true;
      setPlaying(true);
      syncAudio();
      recordTimeoutRef.current = setTimeout(
        () => {
          if (recorder.state === "recording") recorder.stop();
        },
        (DURATION + 30) * 1000,
      );
    } catch (err) {
      setRecordMessage(
        err instanceof Error ? err.message : "Recording could not start.",
      );
    }
  };
  const active = riding ? selectedWorld : frameAt(time).active;

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <i className="brand-mark" aria-hidden="true" />
          TRON<span>WORLDS</span>
        </div>
        <div className="top-actions">
          <span className="top-label">FOUR ENVIRONMENTS / ONE LIGHTCYCLE</span>
          <button
            className={`button ${riding ? "active" : ""}`}
            disabled={!ready || recording}
            onClick={toggleRide}
          >
            {riding ? "▷ Watch demo · 44s" : "▶ Play game"}
          </button>
          <button
            className="button"
            disabled={!ready || recording}
            onClick={() => {
              void viewerRef.current
                ?.requestFullscreen()
                .catch(() =>
                  setRecordMessage(
                    "Fullscreen is unavailable in this browser.",
                  ),
                );
            }}
            aria-label="Enter fullscreen"
          >
            ⛶ <span>Fullscreen</span>
          </button>
          <button
            className="button primary"
            disabled={!ready || recording}
            onClick={() => void recordFilm()}
          >
            {recording ? "● Recording…" : "↓ Record demo"}
          </button>
        </div>
      </header>
      <div className="viewer-wrap" ref={wrapRef}>
        <div className="viewer" ref={viewerRef}>
          <canvas
            ref={canvasRef}
            aria-label="TRON Worlds: playable lightcycle missions"
            onClick={(event) => {
              if (riding || recording || frameAt(timeRef.current).zoom > 0.1)
                return;
              const bounds = event.currentTarget.getBoundingClientRect(),
                x = ((event.clientX - bounds.left) / bounds.width) * 1920,
                y = ((event.clientY - bounds.top) / bounds.height) * 1080;
              if (x > 58 && x < 1862 && y > 202 && y < 956)
                chooseWorld((x > 960 ? 1 : 0) + (y > 579 ? 2 : 0));
            }}
          />
          {!ready && (
            <div className="loading" role="status">
              {error ? (
                <div className="error">{error}</div>
              ) : (
                <>
                  <span className="loading-dot" />
                  Preparing four worlds…
                </>
              )}
            </div>
          )}
          {riding && rideState.current.status !== "running" && (
            <div className="mission-overlay">
              <span className="mission-eyebrow">
                {WORLDS[selectedWorld].name}
              </span>
              <h2>
                {rideState.current.status === "ready"
                  ? selectedWorld === 3
                    ? "Survive the arena."
                    : "Start your mission."
                  : rideState.current.status === "won"
                    ? "Mission complete."
                    : "Rider down."}
              </h2>
              <p>
                {rideState.current.status === "ready"
                  ? LEVELS[selectedWorld].objective
                  : rideState.current.reason}
              </p>
              <p className="mission-help">
                {rideState.current.status === "ready"
                  ? "A / D steer · W accelerates · Shift boosts · Space jumps or drifts."
                  : `${rideState.current.score.toLocaleString()} points · ${rideState.current.time.toFixed(1)} seconds`}
              </p>
              {rideState.current.status === "ready" && (
                <button
                  className="button primary start-mission"
                  onClick={startMission}
                >
                  Start mission
                </button>
              )}
              {rideState.current.status !== "ready" && (
                <button
                  className="button primary"
                  onClick={(event) => {
                    rideState.current = createGame(worldRef.current);
                    stepAccumulator.current = 0;
                    event.currentTarget.blur();
                  }}
                >
                  Try again · R
                </button>
              )}
            </div>
          )}
          {riding && (
            <div className="touch-controls" aria-label="Driving controls">
              {[
                ["KeyA", "←"],
                ["KeyD", "→"],
                ["KeyS", "Brake"],
                ["KeyW", "Go"],
                ["ShiftLeft", "Boost"],
                ["Space", selectedWorld === 2 ? "Jump" : "Drift"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  aria-label={label}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    keysRef.current.add(key);
                  }}
                  onPointerUp={() => keysRef.current.delete(key)}
                  onPointerCancel={() => keysRef.current.delete(key)}
                  onLostPointerCapture={() => keysRef.current.delete(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {riding && (
            <div className="ride-instructions">
              W / ↑ accelerate · A D / ← → steer · S / ↓ brake · Shift boost ·
              Space {selectedWorld === 2 ? "jump" : "drift"} · R restart · Esc
              film
            </div>
          )}
        </div>
      </div>
      {riding && <RunBoard game={rideState.current} />}
      <footer className="transport">
        <div className={`scrubber ${riding ? "game-scrubber" : ""}`}>
          <span className="timecode">
            {formatTime(time)} <span>/ {formatTime(DURATION)}</span>
          </span>
          <input
            className="timeline"
            type="range"
            aria-label="Film timeline"
            min="0"
            max={DURATION}
            step=".1"
            value={time}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!ready || riding || recording}
          />
          <span className="muted">{riding ? "PLAYING" : "DIRECTOR’S CUT"}</span>
        </div>
        <div className="control-row">
          <div className="playback">
            <button
              className="icon-button"
              disabled={!ready || recording}
              onClick={togglePlaying}
              aria-label={
                riding
                  ? playing
                    ? "Pause game"
                    : "Resume game"
                  : playing
                    ? "Pause film"
                    : "Play film"
              }
              title={riding ? "Pause game (P)" : "Play / pause (Space)"}
            >
              {playing ? "Ⅱ" : "▶"}
            </button>
            <button
              className="icon-button"
              disabled={!ready || recording}
              onClick={() =>
                riding
                  ? (rideState.current = createGame(worldRef.current))
                  : seek(0)
              }
              aria-label={riding ? "Restart mission" : "Restart film"}
              title="Restart"
            >
              ↺
            </button>
            <button
              className="button"
              onClick={() => void toggleSound()}
              aria-pressed={sound}
            >
              {sound ? "♪ Sound on" : "♪ Sound off"}
            </button>
            {recordMessage && (
              <span className="record-status" role="status">
                {recordMessage}
              </span>
            )}
          </div>
          <nav className="world-tabs" aria-label="Showcase chapters">
            <button
              className={`world-tab ${active < 0 ? "selected" : ""}`}
              disabled={recording}
              onClick={() => {
                rideRef.current = false;
                setRiding(false);
                seek(0);
              }}
            >
              ⊞ All worlds
            </button>
            {WORLDS.map((world, i) => (
              <button
                key={world.id}
                className={`world-tab ${active === i ? "selected" : ""}`}
                style={{ "--accent": world.color } as React.CSSProperties}
                disabled={recording}
                onClick={() => chooseWorld(i)}
                aria-current={active === i ? "true" : undefined}
              >
                <em>{world.label}</em>
                {world.name}
              </button>
            ))}
          </nav>
          <span className="key-hint">
            <kbd>{riding ? "P" : "Space"}</kbd> pause <kbd>1–4</kbd> worlds
          </span>
        </div>
      </footer>
    </main>
  );
}
