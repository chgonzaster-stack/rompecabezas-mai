"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Registra el Service Worker (PWA)
const PwaRegistrar = dynamic(() => import("../pwa-registrar"), { ssr: false });

/** 🔧 AJUSTA AQUÍ tus personajes (ubicados en /public/images/personajes/) */
const PERSONAJES = [
  { id: "Azulin",     src: "/images/personajes/Azulin.png",     nombre: "Azulín" },
  { id: "Chasca",     src: "/images/personajes/Chasca.png",     nombre: "Chasca" },
  { id: "Dolly",      src: "/images/personajes/Dolly.png",      nombre: "Dolly" },
  { id: "Florencia",  src: "/images/personajes/Florencia.png",  nombre: "Florencia" },
  { id: "Revoltoso",  src: "/images/personajes/Horacio.png",    nombre: "Revoltoso" },
  { id: "Kuky",       src: "/images/personajes/Kuky.png",       nombre: "Kuky" },
  { id: "Luby",       src: "/images/personajes/Luby.png",       nombre: "Luby" },
  { id: "Mateo",      src: "/images/personajes/Mateo.png",      nombre: "Mateo" },
  { id: "Metichina",  src: "/images/personajes/Metichina.png",  nombre: "Metichina" },
  { id: "Naty",       src: "/images/personajes/Naty.png",       nombre: "Naty" },
  { id: "Rata",       src: "/images/personajes/Rata.png",       nombre: "Rata" },
  { id: "Spanky",     src: "/images/personajes/Spanky.png",     nombre: "Spanky" },
  { id: "Tallarin",   src: "/images/personajes/Tallarin.png",   nombre: "Tallarín" },
  { id: "Tammy",      src: "/images/personajes/Tammy.png",      nombre: "Tammy" },
  { id: "Beky",       src: "/images/personajes/Veky.png",       nombre: "Beky" },
  { id: "Zanadorio",  src: "/images/personajes/Zanadorio.png",  nombre: "Zanadorio" }
];

type CardData = { uid: string; pairId: string; imgSrc: string; nombre: string };
type Mode = "clasico" | "crono";
type Theme = "classic" | "green" | "sky";
type Medal = "gold" | "silver" | "bronze" | "none";

type Score = {
  player: string;
  moves: number;
  seconds: number;     // clásico: tiempo empleado; crono: tiempo restante
  pairs: number;
  dateISO: string;
  mode: Mode;
  duration?: number;   // sólo crono
  medal?: Medal;
};

const LS_KEY = "cmm-memory-scores-v5";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const medalEmoji = (m?: Medal) => (m === "gold" ? "🥇" : m === "silver" ? "🥈" : m === "bronze" ? "🥉" : "🏁");

/** Escoge automáticamente el # de columnas que mejor reparte las cartas */
function pickCols(n: number) {
  const candidates = [3, 4, 5, 6];
  for (const c of candidates) if (n % c === 0) return c;
  let best = 4, bestRema = n % 4;
  for (const c of candidates) {
    const r = n % c;
    if (r < bestRema) { best = c; bestRema = r; }
    else if (r === bestRema && c > best) best = c;
  }
  return best;
}

export default function MemoryGamePage() {
  /** ======= Config ======= */
  const [player, setPlayer] = useState("");
  const [pairsToUse, setPairsToUse] = useState(8);
  const [mode, setMode] = useState<Mode>("clasico");
  const [duration, setDuration] = useState(90); // s en crono
  const [theme, setTheme] = useState<Theme>("classic");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(0.6);

  /** ======= WebAudio (buffers + gain) ======= */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Record<string, AudioBuffer | null>>({});
  const gainRef = useRef<GainNode | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx();
    audioCtxRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(ctx.destination);
    gainRef.current = gain;

    const names = ["flip", "match", "win", "timeup", "tick"];
    names.forEach(async (name) => {
      try {
        const res = await fetch(`/sounds/${name}.wav`);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        buffersRef.current[name] = buf;
      } catch {}
    });

    const resume = () => { ctx.resume(); window.removeEventListener("pointerdown", resume); };
    window.addEventListener("pointerdown", resume, { once: true });

    return () => { ctx.close().catch(() => {}); };
  }, []);
  useEffect(() => { if (gainRef.current) gainRef.current.gain.value = clamp(volume, 0, 1); }, [volume]);

  const play = (name: "flip" | "match" | "win" | "timeup" | "tick", rate = 1) => {
    if (!soundOn) return;
    const ctx = audioCtxRef.current;
    const buf = buffersRef.current[name];
    const gain = gainRef.current;
    if (!ctx || !buf || !gain) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.connect(gain);
    try { src.start(0); } catch {}
  };

  /** ======= Construye mazo ======= */
  const deck: CardData[] = useMemo(() => {
    const source =
      selectedIds.length > 0
        ? PERSONAJES.filter((p) => selectedIds.includes(p.id))
        : PERSONAJES;
    const base = source.slice(0, Math.min(source.length, pairsToUse));
    const pairs = base.flatMap((p) => [
      { uid: `${p.id}-a`, pairId: p.id, imgSrc: p.src, nombre: p.nombre },
      { uid: `${p.id}-b`, pairId: p.id, imgSrc: p.src, nombre: p.nombre },
    ]);
    return shuffle(pairs);
  }, [pairsToUse, selectedIds]);

  /** ======= Estado de juego ======= */
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0); // up/down
  const [locked, setLocked] = useState(false);
  const [lost, setLost] = useState(false);

  /** ======= Confetti Canvas sencillo ======= */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiRef = useRef<any[]>([]);
  const rafRef = useRef<number | null>(null);

  const confetti = (color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    confettiRef.current = Array.from({ length: 100 }, () => ({
      x: Math.random() * W,
      y: -10 - Math.random() * 200,
      r: 3 + Math.random() * 5,
      s: 1 + Math.random() * 3,
      a: Math.random() * Math.PI * 2,
    }));
    const step = () => {
      ctx.clearRect(0, 0, W, H);
      confettiRef.current.forEach((p) => {
        p.y += p.s;
        p.x += Math.sin(p.a) * 1.5;
        p.a += 0.05;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (confettiRef.current.some((p) => p.y < H + 10)) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    step();
    setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, W, H);
    }, 2000);
  };

  /** ======= Leaderboard ======= */
  const [scores, setScores] = useState<Score[]>([]);
  useEffect(() => { try { const raw = localStorage.getItem(LS_KEY); if (raw) setScores(JSON.parse(raw)); } catch {} }, []);

  /** ======= Timer ======= */
  useEffect(() => { setSeconds(mode === "clasico" ? 0 : duration); setLost(false); }, [mode, duration, pairsToUse, selectedIds]);
  useEffect(() => {
    const finished = matched.size === pairsToUse;
    if (finished || lost) return;
    const t = setInterval(() => {
      setSeconds((s) => {
        if (mode === "clasico") {
          const next = s + 1;
          if (soundOn && next % 10 === 0) play("tick", 1);
          return next;
        }
        const next = s - 1;
        if (next <= 0) {
          clearInterval(t);
          setLost(true);
          play("timeup", 1);
          confetti("rgba(244,63,94,0.8)");
          return 0;
        }
        if (soundOn && next <= 10) play("tick", 1.1);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [matched.size, pairsToUse, mode, lost, soundOn]);

  /** ======= Comparación ======= */
  useEffect(() => {
    if (flipped.length < 2) return;
    const [aUid, bUid] = flipped;
    const a = deck.find((c) => c.uid === aUid);
    const b = deck.find((c) => c.uid === bUid);
    if (!a || !b) return;

    setLocked(true);
    setMoves((m) => m + 1);

    if (a.pairId === b.pairId) {
      setTimeout(() => {
        setMatched((prev) => new Set(prev).add(a.pairId));
        setFlipped([]);
        setLocked(false);
        play("match", 1);
      }, 300);
    } else {
      setTimeout(() => { setFlipped([]); setLocked(false); }, 650);
    }
  }, [flipped, deck]);

  /** ======= Medallas ======= */
  const computeMedal = (mode: Mode, pairs: number, moves: number, seconds: number, duration?: number): Medal => {
    if (mode === "clasico") {
      const gold = moves <= pairs + 2 && seconds <= pairs * 5;
      const silver = moves <= pairs + 4 && seconds <= pairs * 7;
      if (gold) return "gold";
      if (silver) return "silver";
      return "bronze";
    } else {
      if (!duration || duration <= 0) return "none";
      const ratio = seconds / duration;
      if (ratio >= 0.5 && moves <= pairs + 4) return "gold";
      if (ratio >= 0.3) return "silver";
      if (ratio >= 0.1) return "bronze";
      return "none";
    }
  };

  /** ======= Guardar puntaje ======= */
  useEffect(() => {
    const allFound = matched.size === pairsToUse && pairsToUse > 0;
    if (!allFound) return;
    const medal = computeMedal(mode, pairsToUse, moves, seconds, duration);
    const newScore: Score = {
      player: player?.trim() || "Invitado",
      moves,
      seconds,
      pairs: pairsToUse,
      dateISO: new Date().toISOString(),
      mode,
      duration: mode === "crono" ? duration : undefined,
      medal,
    };
    const updated = [...scores, newScore]
      .sort((x, y) => {
        if (x.mode !== y.mode) return x.mode.localeCompare(y.mode);
        if (x.pairs !== y.pairs) return x.pairs - y.pairs;
        return x.mode === "clasico"
          ? (x.moves - y.moves) || (x.seconds - y.seconds)
          : (y.seconds - x.seconds) || (x.moves - y.moves);
      })
      .slice(0, 100);
    setScores(updated);
    try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch {}
    setTimeout(() => {
      const el = document.getElementById("win-banner");
      el?.classList.add("ring-2", "ring-emerald-400");
      setTimeout(() => el?.classList.remove("ring-2", "ring-emerald-400"), 1200);
    }, 50);
    confetti("rgba(16,185,129,0.9)");
    play("win", 1);
  }, [matched.size]); // eslint-disable-line

  /** ======= Handlers ======= */
  const onCardClick = (uid: string) => {
    if (locked || lost) return;
    if (flipped.includes(uid)) return;
    const card = deck.find((c) => c.uid === uid);
    if (card && matched.has(card.pairId)) return;
    setFlipped((prev) => (prev.length < 2 ? [...prev, uid] : prev));
    play("flip", 1.05);
  };

  const resetRound = () => {
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLost(false);
    setSeconds(mode === "clasico" ? 0 : duration);
  };
  const changeDifficulty = (pairs: number) => { setPairsToUse(pairs); setTimeout(resetRound, 0); };
  const changeMode = (m: Mode) => { setMode(m); setTimeout(resetRound, 0); };

  /** ======= Presentación ======= */
  const themeBg =
    theme === "classic" ? "from-indigo-950 via-indigo-900 to-indigo-800"
    : theme === "green" ? "from-emerald-900 via-emerald-700 to-emerald-600"
    : "from-sky-900 via-sky-700 to-sky-500";

  // fondo oscuro para selects según tema
  const selectDark =
    theme === "classic" ? "bg-indigo-950/80" :
    theme === "green"   ? "bg-emerald-950/70" :
                          "bg-sky-950/70";

  const passiveBtn = `${selectDark} border-white/30 text-gray-100 hover:brightness-110`;

  const totalCards = pairsToUse * 2;
  const cols = pickCols(totalCards);

  // tamaño mínimo de carta (px) calculado por viewport para reducir scroll
  const [cardMin, setCardMin] = useState(110);
  useEffect(() => {
    const handler = () => {
      const rows = Math.ceil(totalCards / cols);

      // Altura "cromática" para móvil un poco mayor por header sticky + FAB
      // (mejora la distribución y evita que el tablero empuje el footer)
      const chrome = window.innerWidth < 640 ? 420 : 360;

      const availH = Math.max(300, window.innerHeight - chrome);
      const gap = 16;

      const maxCardH = Math.floor((availH - (rows - 1) * gap) / rows);
      const maxW_fromH = Math.floor((maxCardH * 3) / 4);

      const availW = Math.max(320, window.innerWidth - 48);
      const maxW_fromW = Math.floor((availW - (cols - 1) * gap) / cols);

      const w = clamp(Math.min(maxW_fromH, maxW_fromW), 90, 180);
      setCardMin(w);
    };
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [cols, totalCards]);

  const topForConfig = scores
    .filter((s) => s.pairs === pairsToUse && s.mode === mode && (mode === "clasico" || s.duration === duration))
    .sort((a, b) =>
      mode === "clasico"
        ? (a.moves - b.moves) || (a.seconds - b.seconds)
        : (b.seconds - a.seconds) || (a.moves - b.moves)
    )
    .slice(0, 5);

  return (
    <main
      className={`min-h-screen relative bg-gradient-to-b ${themeBg} text-white
      pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}
    >
      <PwaRegistrar />

      {/* Header sticky */}
      <header className="sticky top-0 z-30 backdrop-blur bg-indigo-950/60 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/images/reverso/cmm.png" alt="CMM" className="size-8 rounded bg-white p-1" />
            <h1 className="text-lg sm:text-2xl font-bold">Juego de Memoria • CMM Kids</h1>
          </div>
          {/* Acciones visibles en tablet/desktop */}
          <nav className="hidden sm:flex items-center gap-2">
            <Link href="/" className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 border border-white/20">Inicio</Link>
            <Link href="/puzzles" className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 border border-white/20">Rompecabezas</Link>
            <button onClick={resetRound} className="rounded-xl bg-emerald-500/90 hover:bg-emerald-500 px-3 py-2 text-white">
              Barajar
            </button>
          </nav>
        </div>
      </header>

      {/* Botón flotante móvil (Barajar) */}
      <button
        onClick={resetRound}
        className="sm:hidden fixed right-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40
                 rounded-full shadow-lg px-4 py-3 bg-emerald-500 text-white"
      >
        Barajar
      </button>

      {/* Marca de agua */}
      <img
        src="/images/reverso/cmm.png"
        alt="CMM Watermark"
        className="pointer-events-none select-none opacity-5 absolute inset-0 m-auto w-2/3 h-2/3 object-contain"
      />

      {/* Canvas confetti */}
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50"></canvas>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {/* Controles superiores */}
        <section className="mt-1 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 border border-white/20 p-3">
            <label className="text-sm opacity-90">Nombre del jugador</label>
            <input
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
              placeholder="Ej: Emma"
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 outline-none"
            />
          </div>

          <div className="rounded-xl bg-white/10 border border-white/20 p-3">
            <label className="text-sm opacity-90">Dificultad (parejas)</label>
            <select
              value={pairsToUse}
              onChange={(e) => changeDifficulty(parseInt(e.target.value))}
              className={`mt-1 w-full rounded-lg ${selectDark} text-white border border-white/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400`}
            >
              {[4, 6, 8, 10, 12].filter(n => n <= (selectedIds.length || PERSONAJES.length)).map((n) =>
                <option key={n} value={n}>{n} parejas</option>
              )}
            </select>
          </div>

          <div className="rounded-xl bg-white/10 border border-white/20 p-3">
            <label className="text-sm opacity-90">Modo de juego</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                onClick={() => changeMode("clasico")}
                className={`rounded-lg px-3 py-2 border transition
                  ${mode === "clasico"
                    ? "bg-emerald-600/30 border-emerald-400/60 text-white"
                    : passiveBtn}`}
              >
                Clásico
              </button>

              <button
                onClick={() => changeMode("crono")}
                className={`rounded-lg px-3 py-2 border transition
                  ${mode === "crono"
                    ? "bg-amber-600/30 border-amber-400/60 text-white"
                    : passiveBtn}`}
              >
                Cronometrado
              </button>
            </div>

            {mode === "crono" && (
              <div className="mt-2">
                <label className="text-sm opacity-90">Duración</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className={`mt-1 w-full rounded-lg ${selectDark} text-white border border-white/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400`}
                >
                  {[45, 60, 90, 120, 180].map((d) => <option key={d} value={d}>{d} s</option>)}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Sonido + Tema */}
        <section className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 border border-white/20 p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Sonidos</div>
              <div className="text-xs opacity-80">Activar efectos</div>
            </div>
            <button
              onClick={() => setSoundOn(v => !v)}
              className={`rounded-lg px-3 py-2 border ${soundOn ? "bg-emerald-500/20 border-emerald-400/40" : "bg-white/10 border-white/20 hover:bg-white/20"}`}
            >
              {soundOn ? "ON" : "OFF"}
            </button>
          </div>

          <div className="rounded-xl bg-white/10 border border-white/20 p-3">
            <label className="text-sm opacity-90">Volumen</label>
            <input type="range" min={0} max={1} step={0.05} value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))} className="mt-2 w-full" />
          </div>

          <div className="rounded-xl bg-white/10 border border-white/20 p-3">
            <label className="text-sm opacity-90">Tema visual</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className={`mt-1 w-full rounded-lg ${selectDark} text-white border border-white/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400`}
            >
              <option value="classic">Clásico</option>
              <option value="green">Verde esperanza</option>
              <option value="sky">Cielo</option>
            </select>
          </div>
        </section>

        {/* Selector de personajes */}
        <section className="mt-5 rounded-xl bg-white/10 border border-white/20 p-3">
          <div className="font-semibold mb-2">Elige personajes</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PERSONAJES.map(p => (
              <label key={p.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={() =>
                    setSelectedIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])
                  }
                />
                <img src={p.src} alt={p.nombre} className="size-8 rounded-md" />
                <span className="text-sm">{p.nombre}</span>
              </label>
            ))}
          </div>
          <div className="text-xs opacity-80 mt-2">
            Si no seleccionas ninguno, se usarán todos los personajes. Ajusta la dificultad para no exceder la cantidad disponible.
          </div>
        </section>

        {/* Botón reiniciar (también hay FAB en móvil) */}
        <section className="mt-3 hidden sm:block">
          <button onClick={resetRound} className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 border border-white/20">
            Barajar / Reiniciar ronda
          </button>
        </section>

        {/* Indicadores */}
        <section className="mt-4 flex gap-3 flex-wrap">
          <div className="rounded-xl bg-white/10 border border-white/20 px-4 py-2">
            Intentos: <span className="font-semibold">{moves}</span>
          </div>
          <div className={`rounded-xl px-4 py-2 border ${mode === "crono" ? "bg-amber-500/20 border-amber-400/40" : "bg-white/10 border-white/20"}`}>
            {mode === "clasico" ? <>Tiempo: <span className="font-semibold">{seconds}s</span></> : <>Tiempo restante: <span className="font-semibold">{seconds}s</span></>}
          </div>
          <div className="rounded-xl bg-white/10 border border-white/20 px-4 py-2">
            Parejas: <span className="font-semibold">{matched.size}/{pairsToUse}</span>
          </div>
        </section>

        {/* Tablero */}
        <section
          className="mt-6 grid gap-3 sm:gap-4"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(${cardMin}px, 1fr))` }}
        >
          {deck.map((card) => {
            const isFlipped = flipped.includes(card.uid) || matched.has(card.pairId);
            return (
              <button
                key={card.uid}
                onClick={() => onCardClick(card.uid)}
                className="relative w-full aspect-[3/4] cursor-pointer focus:outline-none"
                aria-label={isFlipped ? card.nombre : "Carta boca abajo"}
                disabled={lost}
              >
                <div className={`flip-card-inner h-full w-full transition-transform duration-300 [transform-style:preserve-3d] ${isFlipped ? "[transform:rotateY(180deg)]" : ""} ${lost ? "opacity-60" : ""}`}>
                  {/* Reverso */}
                  <div className="absolute inset-0 rounded-2xl bg-white/5 border border-white/15 overflow-hidden [backface-visibility:hidden]">
                    <img src="/images/reverso/cmm.png" alt="Reverso CMM" className="h-full w-full object-contain p-4" draggable={false} />
                  </div>
                  {/* Frente */}
                  <div className="absolute inset-0 rounded-2xl bg-white/5 border border-white/15 overflow-hidden [transform:rotateY(180deg)] [backface-visibility:hidden]">
                    <img src={card.imgSrc} alt={card.nombre} className="h-full w-full object-contain p-3" draggable={false} />
                    <div className="absolute bottom-2 left-0 right-0 text-center text-xs sm:text-sm bg-black/30 backdrop-blur-sm py-1">
                      {card.nombre}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Mensajes y Top */}
        <section id="win-banner" className="mt-6 grid gap-4 sm:grid-cols-2">
          {(matched.size === pairsToUse) && (
            <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-3">
              {medalEmoji(computeMedal(mode, pairsToUse, moves, seconds, duration))} ¡Excelente, {player?.trim() || "Invitado"}!{" "}
              {mode === "clasico"
                ? <>Completaste {pairsToUse} parejas en <b>{moves}</b> intentos y <b>{seconds}</b> s.</>
                : <>¡Ganaste con <b>{seconds}</b> s restantes, {pairsToUse} parejas y <b>{moves}</b> intentos!</>}
            </div>
          )}
          {lost && matched.size !== pairsToUse && (
            <div className="rounded-xl bg-rose-500/20 border border-rose-400/40 p-3">⏰ Se acabó el tiempo. ¡Inténtalo de nuevo!</div>
          )}

          <div className="rounded-xl bg-white/10 border border-white/20 p-3">
            <div className="font-semibold mb-2">🏆 Mejores puntajes ({pairsToUse} parejas · {mode === "clasico" ? "Clásico" : `Crono ${duration}s`})</div>
            {topForConfig.length === 0 ? (
              <div className="text-sm opacity-80">Sin registros aún. ¡Sé el primero!</div>
            ) : (
              <ul className="text-sm space-y-1">
                {topForConfig.map((s, i) => (
                  <li key={`${s.dateISO}-${i}`} className="flex justify-between">
                    <span>{i + 1}. {s.player}</span>
                    <span>{s.mode === "clasico" ? `${s.moves} mov · ${s.seconds}s` : `${s.seconds}s rest · ${s.moves} mov`} {medalEmoji(s.medal)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <footer className="mt-8 text-center text-sm opacity-80">
          Consejo: para niños pequeños usa 4–6 parejas; sube a 10–12 para más desafío.
        </footer>
      </div>
    </main>
  );
}
