"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/** ====== PERSONAJES disponibles (ajusta nombres y rutas si hace falta) ====== */
const PERSONAJES_PZ = [
  { id: "Azulin",     src: "/images/monos/Azulin.png",     nombre: "Azulín" },
  { id: "Chasca",     src: "/images/monos/Chasca.png",     nombre: "Chasca" },
  { id: "Dolly",      src: "/images/monos/Dolly.png",      nombre: "Dolly" },
  { id: "Florencia",  src: "/images/monos/Florencia.png",  nombre: "Florencia" },
  { id: "Revoltoso",  src: "/images/monos/Horacio.png",    nombre: "Revoltoso" },
  { id: "Kuky",       src: "/images/monos/Kuky.png",       nombre: "Kuky" },
  { id: "Luby",       src: "/images/monos/Luby.png",       nombre: "Luby" },
  { id: "Mateo",      src: "/images/monos/Mateo.png",      nombre: "Mateo" },
  { id: "Metichina",  src: "/images/monos/Metichina.png",  nombre: "Metichina" },
  { id: "Naty",       src: "/images/monos/Naty.png",       nombre: "Naty" },
  { id: "Rata",       src: "/images/monos/Rata.png",       nombre: "Rata" },
  { id: "Spanky",     src: "/images/monos/Spanky.png",     nombre: "Spanky" },
  { id: "Tallarin",   src: "/images/monos/Tallarin.png",   nombre: "Tallarín" },
  { id: "Tammy",      src: "/images/monos/Tammy.png",      nombre: "Tammy" },
  { id: "Beky",       src: "/images/monos/Veky.png",       nombre: "Beky" },
  { id: "Zanadorio",  src: "/images/monos/Zanadorio.png",  nombre: "Zanadorio" },
] as const;

type PersonajeId = typeof PERSONAJES_PZ[number]["id"];

function findPersonaje(id: PersonajeId) {
  return PERSONAJES_PZ.find(p => p.id === id) ?? PERSONAJES_PZ[0];
}

/** ====== Utilidades Sliding Puzzle ====== */
// Genera arreglo [0..n-1], 0 será el "hueco".
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// Cuenta inversiones (para solvencia del rompecabezas)
function inversionCount(arr: number[]) {
  let inv = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      const a = arr[i];
      const b = arr[j];
      if (a !== 0 && b !== 0 && a > b) inv++;
    }
  }
  return inv;
}

function isSolvable(perm: number[], size: number) {
  // Para tamaño impar, solvable si inversiones es par.
  if (size % 2 === 1) return inversionCount(perm) % 2 === 0;

  // Para tamaño par:
  // - Calcula "fila" del hueco contando desde abajo (1-indexed)
  const blankIndex = perm.indexOf(0);
  const rowFromTop = Math.floor(blankIndex / size);
  const rowFromBottom = size - rowFromTop; // 1..size
  const inv = inversionCount(perm);

  // Clásica regla:
  // - Si blank está en fila par desde abajo (2,4,..) entonces inversiones deben ser impares
  // - Si blank está en fila impar desde abajo (1,3,..) entonces inversiones deben ser pares
  if (rowFromBottom % 2 === 0) return inv % 2 === 1;
  return inv % 2 === 0;
}

function shuffledSolvable(size: number) {
  const total = size * size;
  while (true) {
    const a = range(total);
    // Fisher-Yates
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (isSolvable(a, size)) return a;
  }
}

/** ====== Sonidos ====== */
function useWinSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctx: any =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    try {
      const ctx: AudioContext = new Ctx();
      audioCtxRef.current = ctx;

      const load = async () => {
        try {
          const res = await fetch("/sounds/win.wav");
          if (!res.ok) return;
          const arr = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(arr);
          bufferRef.current = buf;
        } catch {}
      };
      load();

      const resume = () => {
        ctx.resume().catch(() => {});
        window.removeEventListener("pointerdown", resume);
      };
      window.addEventListener("pointerdown", resume, { once: true });

      return () => {
        ctx.close().catch(() => {});
      };
    } catch {
      // Nada: si no se puede crear el contexto, seguimos sin sonido
    }
  }, []);

  const play = () => {
    const ctx = audioCtxRef.current;
    const buf = bufferRef.current;
    if (!ctx || !buf) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {}
  };

  return play;
}

/** ====== Página ====== */
export default function PuzzlesPage() {
  /** Tema del fondo (opcional): usa el mismo que Memoria si lo tienes */
  const themeBg = "from-indigo-950 via-indigo-900 to-indigo-800";

  /** Estado principal */
  const [imgId, setImgId] = useState<PersonajeId>("Azulin");
  const [size, setSize] = useState<number>(3);
  const [tiles, setTiles] = useState<number[]>(() => shuffledSolvable(3));
  const [moves, setMoves] = useState(0);

  const personaje = findPersonaje(imgId);
  const thumbSrc = personaje.src;

  const playWin = useWinSound();

  // Reset/mezclar
  const mezclar = () => {
    setTiles(shuffledSolvable(size));
    setMoves(0);
  };

  // Cuando cambia tamaño o imagen, remezclar
  useEffect(() => {
    setTiles(shuffledSolvable(size));
    setMoves(0);
  }, [size, imgId]);

  const total = size * size;
  const blankIndex = tiles.indexOf(0);

  /** Comprobación de victoria */
  const isSolved = useMemo(() => {
    // Resuelto si coincide con [0..total-1] o [1..total-1,0]? Para sliding puzzle
    // Aquí usamos "0" hueco al final como posición final:
    // tiles = [1,2,3,..,total-1,0]
    for (let i = 0; i < total - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[total - 1] === 0;
  }, [tiles, total]);

  useEffect(() => {
    if (isSolved && moves > 0) {
      playWin();
    }
  }, [isSolved, moves, playWin]);

  /** Movimiento de una ficha */
  const moveIndex = (idx: number) => {
    if (isSolved) return;
    const r1 = Math.floor(idx / size);
    const c1 = idx % size;
    const r0 = Math.floor(blankIndex / size);
    const c0 = blankIndex % size;

    const isAdj =
      (r1 === r0 && Math.abs(c1 - c0) === 1) ||
      (c1 === c0 && Math.abs(r1 - r0) === 1);

    if (!isAdj) return;

    const next = tiles.slice();
    [next[idx], next[blankIndex]] = [next[blankIndex], next[idx]];
    setTiles(next);
    setMoves((m) => m + 1);
  };

  /** Estilos de posición del fondo para cada tile */
  const tileStyle = (tileValue: number): React.CSSProperties => {
    // tileValue va de 0..total-1, pero 0 es hueco
    if (tileValue === 0) return {};
    const tilePos = tileValue - 1; // 0..total-2
    const row = Math.floor(tilePos / size);
    const col = tilePos % size;

    const bgSize = `${size * 100}% ${size * 100}%`;
    const bgPosX = `${(col * 100) / (size - 1)}%`;
    const bgPosY = `${(row * 100) / (size - 1)}%`;

    // Ajuste fino para que el fondo cuadre perfecto:
    // Usamos "background-size" a N*N y "background-position" proporcional.
    return {
      backgroundImage: `url(${thumbSrc})`,
      backgroundSize: bgSize,
      backgroundPosition: `${bgPosX} ${bgPosY}`,
      backgroundRepeat: "no-repeat",
    };
  };

  return (
    <main
      className={`min-h-screen bg-gradient-to-b ${themeBg} text-white
      pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}
    >
      {/* HEADER sticky */}
      <header className="sticky top-0 z-30 backdrop-blur bg-indigo-950/60 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img
              src="/images/reverso/cmm.png"
              alt="CMM"
              className="size-8 rounded bg-white p-1"
            />
            <h1 className="text-lg sm:text-2xl font-bold">Rompecabezas</h1>
          </div>

          {/* Acciones visibles en tablet/desktop */}
          <nav className="hidden sm:flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 border border-white/20"
            >
              Inicio
            </Link>
            <Link
              href="/memory"
              className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 border border-white/20"
            >
              Memoria
            </Link>
            <button
              onClick={mezclar}
              className="rounded-xl bg-emerald-500/90 hover:bg-emerald-500 px-3 py-2 text-white"
            >
              Mezclar
            </button>
          </nav>
        </div>
      </header>

      {/* FAB móvil Mezclar */}
      <button
        onClick={mezclar}
        className="sm:hidden fixed right-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40
                 rounded-full shadow-lg px-4 py-3 bg-emerald-500 text-white"
      >
        Mezclar
      </button>

      {/* Controles */}
      <section className="max-w-6xl mx-auto px-4 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Selector de imagen */}
        <div className="rounded-xl bg-white/10 border border-white/20 p-3 relative z-20">
          <label className="text-sm opacity-90">Imagen</label>
          <select
            value={imgId}
            onChange={(e) => setImgId(e.target.value as PersonajeId)}
            className="mt-1 w-full rounded-lg bg-white text-gray-900 px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
			{PERSONAJES_PZ.map((p) => (
              <option key={p.id} value={p.id}>
			  {p.nombre}
			 </option>  
			  
            ))}
          </select>
        </div>

        {/* Selector de tamaño */}
        <div className="rounded-xl bg-white/10 border border-white/20 p-3 relative z-20">
          <label className="text-sm opacity-90">Tamaño</label>
          <select
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="mt-1 w-full rounded-lg bg-white text-gray-900 px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {[3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} × {n}
              </option>
            ))}
          </select>
        </div>

        {/* Movimientos */}
        <div className="rounded-xl bg-white/10 border border-white/20 p-3">
          <label className="text-sm opacity-90">Movimientos</label>
          <div className="mt-2 text-lg font-semibold">{moves}</div>
        </div>
      </section>

      {/* Tablero */}
      <section className="mt-4 px-4">
        <div className="mx-auto w-full max-w-[min(92vw,560px)]">
          {/* Contenedor cuadrado del tablero */}
          <div
            className="aspect-square w-full rounded-xl overflow-hidden bg-white/5 border border-white/15 p-1"
            aria-label="Tablero del rompecabezas"
          >
            <div
              className="grid h-full w-full gap-1"
              style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
            >
              {tiles.map((value, idx) => {
                const isBlank = value === 0;
                return (
                  <button
                    key={idx}
                    onClick={() => moveIndex(idx)}
                    disabled={isBlank}
                    aria-label={isBlank ? "Hueco" : `Ficha ${value}`}
                    className={`relative rounded-xl border border-white/15 
                                ${isBlank ? "bg-indigo-900/30" : "bg-white/10 hover:bg-white/15"}`}
                    style={tileStyle(value)}
                  >
                    {/* Etiqueta opcional (debug): 
                    <span className="absolute bottom-1 right-2 text-xs opacity-80">
                      {value}
                    </span> */}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mensaje de victoria */}
          {isSolved && (
            <div className="mt-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-3 text-center">
              🎉 ¡Completado en <b>{moves}</b> movimientos!
            </div>
          )}

          {/* Referencia */}
          <div className="mt-6 text-center">
            <div className="text-sm opacity-80 mb-2">Referencia</div>
            <div className="mx-auto w-20 h-20 rounded-xl overflow-hidden bg-white/10 border border-white/20">
              <img
                src={thumbSrc}
                alt="Referencia"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-10 mb-8 text-center text-sm opacity-80 px-4">
        Consejo: en móvil, empieza con 3×3. Si buscas más reto, sube a 4×4 o 5×5.
      </footer>
    </main>
  );
}
