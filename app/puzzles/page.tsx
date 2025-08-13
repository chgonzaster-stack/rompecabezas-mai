// app/puzzles/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ImageInfo = { src: string; nombre: string };

const IMAGES: ImageInfo[] = [
  { src: "/puzzles/Chasca.jpg",   nombre: "Chasca" },
  { src: "/puzzles/Horacio.jpg",  nombre: "Revoltoso" },
  { src: "/puzzles/Luby.jpg",     nombre: "Osita Luvi" },
  { src: "/puzzles/Naty.jpg",     nombre: "Nancy" },
  { src: "/puzzles/Rata.jpg",     nombre: "El Rata" },
  { src: "/puzzles/Tallarin.jpg", nombre: "Spaguetti" },
  { src: "/puzzles/Veky.jpg",     nombre: "Beky" },
];

const BOARD_PX = 360;
const GAP = 2;

function indexToRC(i: number, n: number) {
  return { r: Math.floor(i / n), c: i % n };
}
function rcToIndex(r: number, c: number, n: number) {
  return r * n + c;
}
function neighborsOf(i: number, n: number) {
  const { r, c } = indexToRC(i, n);
  const out: number[] = [];
  if (r > 0) out.push(rcToIndex(r - 1, c, n));
  if (r < n - 1) out.push(rcToIndex(r + 1, c, n));
  if (c > 0) out.push(rcToIndex(r, c - 1, n));
  if (c < n - 1) out.push(rcToIndex(r, c + 1, n));
  return out;
}
function inversionCount(arr: number[]) {
  const flat = arr.filter((v) => v !== arr.length - 1);
  let inv = 0;
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inv++;
    }
  }
  return inv;
}
function isSolvable(arr: number[], n: number) {
  const inv = inversionCount(arr);
  const blankIndex = arr.indexOf(n * n - 1);
  const { r } = indexToRC(blankIndex, n);
  const rowFromBottom = n - r; // 1..n
  if (n % 2 === 0) return (inv + rowFromBottom) % 2 === 0;
  return inv % 2 === 0; // n impar
}
function shuffledSolvable(n: number) {
  const total = n * n;
  let arr = Array.from({ length: total }, (_, i) => i);
  do {
    for (let i = total - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } while (!isSolvable(arr, n) || arr.every((v, i) => v === i));
  return arr;
}

export default function PuzzlePage() {
  const [n, setN] = useState<3 | 4>(3);
  const [imgIndex, setImgIndex] = useState(0);
  const [tiles, setTiles] = useState<number[]>(() => shuffledSolvable(3));
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  // Música de fondo y sonido de victoria
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const [userStarted, setUserStarted] = useState(false);

  // Modal de victoria
  const [winOpen, setWinOpen] = useState(false);

  const tileSize = useMemo(() => Math.floor(BOARD_PX / n), [n]);
  const current = IMAGES[imgIndex];

  // Preparar audios una vez
  useEffect(() => {
    musicRef.current = new Audio("/audio/Samaritano.mp3");
    winSoundRef.current = new Audio("/audio/exito.mp3");

    if (musicRef.current) {
      musicRef.current.loop = true;
      musicRef.current.volume = 0.4;
    }
    if (winSoundRef.current) {
      winSoundRef.current.volume = 0.8;
    }

    const onVisibility = () => {
      if (!musicRef.current) return;
      if (document.hidden) musicRef.current.pause();
      else if (musicOn) void musicRef.current.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [musicOn]);

  // Detectar victoria -> sonido + modal
  useEffect(() => {
    const solved = tiles.every((v, i) => v === i);
    setWon(solved);
    if (solved) {
      if (winSoundRef.current) {
        winSoundRef.current.currentTime = 0;
        winSoundRef.current.play().catch(() => {});
      }
      setWinOpen(true);
    }
  }, [tiles]);

  // Pausar música cuando el modal está abierto y reanudar al cerrarlo
  useEffect(() => {
    if (!musicRef.current) return;
    if (winOpen) {
      musicRef.current.pause();
    } else if (musicOn) {
      musicRef.current.play().catch(() => {});
    }
  }, [winOpen, musicOn]);

  const startMusicIfNeeded = async () => {
    if (!musicRef.current || musicOn) return;
    try {
      await musicRef.current.play();
      setMusicOn(true);
    } catch {
      /* si falla autoplay, el usuario puede usar el botón */
    }
  };

  const reset = (size = n) => {
    setTiles(shuffledSolvable(size));
    setMoves(0);
    setWon(false);
    setWinOpen(false);
  };

  const onChangeImage = (i: number) => {
    setImgIndex(i);
    reset();
  };

  const onChangeSize = (newN: 3 | 4) => {
    setN(newN);
    setTiles(shuffledSolvable(newN));
    setMoves(0);
    setWon(false);
    setWinOpen(false);
  };

  const clickTile = (i: number) => {
    if (won) return;
    const blank = tiles.indexOf(n * n - 1);
    const neigh = neighborsOf(blank, n);
    if (!neigh.includes(i)) return;
    const next = tiles.slice();
    [next[i], next[blank]] = [next[blank], next[i]];
    setTiles(next);
    setMoves((m) => m + 1);
  };

  const handleStart = async () => {
    if (!userStarted) setUserStarted(true);
    await startMusicIfNeeded();
    reset(); // mezcla al comenzar
  };

  const toggleMusic = async () => {
    if (!musicRef.current) return;
    if (musicOn) {
      musicRef.current.pause();
      setMusicOn(false);
    } else {
      try {
        await musicRef.current.play();
        setMusicOn(true);
      } catch {}
    }
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "2rem auto",
        padding: "1rem",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "0.25rem" }}>
        <strong>Rompecabezas MAI</strong>
      </h1>
      <p style={{ textAlign: "center", marginTop: 0, color: "#475569" }}>
        Elige la imagen y el tamaño, luego presiona <em>Mezclar</em>.
      </p>

      {/* Controles */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          margin: "1rem 0",
        }}
      >
        <label>
          Imagen:&nbsp;
          <select
            value={imgIndex}
            onChange={(e) => onChangeImage(parseInt(e.target.value))}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              minWidth: 220,
            }}
          >
            {IMAGES.map((img, i) => (
              <option key={img.src} value={i}>
                {`Imagen ${i + 1} = ${img.nombre}`}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tamaño:&nbsp;
          <select
            value={n}
            onChange={(e) => onChangeSize(parseInt(e.target.value) as 3 | 4)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            <option value={3}>3 × 3 (fácil)</option>
            <option value={4}>4 × 4 (reto)</option>
          </select>
        </label>

        <button
          onClick={async () => {
            if (!userStarted) setUserStarted(true);
            await startMusicIfNeeded();
            reset();
          }}
          style={{
            background: "#2563eb",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Mezclar
        </button>

        {!userStarted && (
          <button
            onClick={handleStart}
            style={{
              background: "#ffcc00",
              color: "#000",
              padding: "8px 16px",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ¡Comenzar!
          </button>
        )}
      </div>

      {/* Tablero */}
      <div style={{ width: BOARD_PX, margin: "1rem auto", position: "relative" }}>
        <div
          style={{
            width: BOARD_PX,
            height: BOARD_PX,
            display: "grid",
            gridTemplateColumns: `repeat(${n}, ${tileSize}px)`,
            gridTemplateRows: `repeat(${n}, ${tileSize}px)`,
            gap: GAP,
            background: "#e2e8f0",
            borderRadius: 12,
            padding: GAP,
          }}
        >
          {tiles.map((v, i) => {
            const isBlank = v === n * n - 1;
            const { r: tr, c: tc } = indexToRC(v, n);
            const canMove = neighborsOf(i, n).includes(tiles.indexOf(n * n - 1));
            return (
              <div
                key={i}
                onClick={() => clickTile(i)}
                style={{
                  width: tileSize,
                  height: tileSize,
                  borderRadius: 8,
                  boxShadow: isBlank ? "none" : "0 1px 2px rgba(0,0,0,.12)",
                  backgroundColor: isBlank ? "transparent" : "#f8fafc",
                  backgroundImage: isBlank ? "none" : `url(${current.src})`,
                  backgroundSize: `${BOARD_PX}px ${BOARD_PX}px`,
                  backgroundPosition: isBlank
                    ? "0 0"
                    : `-${tc * tileSize}px -${tr * tileSize}px`,
                  cursor: isBlank || won ? "default" : canMove ? "pointer" : "default",
                  outline:
                    !isBlank && canMove && !won ? "2px solid #93c5fd" : "none",
                }}
                aria-label={isBlank ? "hueco" : current.nombre}
                role="button"
              />
            );
          })}
        </div>
      </div>

      {/* Panel info */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#334155" }}>
          Movimientos: <strong>{moves}</strong>
        </span>
        <span style={{ color: won ? "#16a34a" : "#64748b" }}>
          {won ? "¡Completado! 🎉" : "En juego…"}
        </span>
      </div>

      {/* Vista previa */}
      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          Vista previa
        </div>
        <img
          src={current.src}
          alt={current.nombre}
          width={120}
          height={120}
          style={{
            objectFit: "cover",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
          }}
        />
        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
          {current.nombre}
        </div>
      </div>

      {/* Botón flotante de música */}
      <button
        onClick={toggleMusic}
        title={musicOn ? "Pausar música" : "Reproducir música"}
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          zIndex: 9999,
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 999,
          padding: "10px 14px",
          boxShadow: "0 6px 20px rgba(0,0,0,.1)",
          cursor: "pointer",
        }}
        aria-label={musicOn ? "Pausar música" : "Reproducir música"}
      >
        {musicOn ? "🔊" : "🔇"}
      </button>

      {/* Modal de victoria */}
      {winOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 9998,
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "min(92vw, 520px)",
              background: "#fff",
              borderRadius: 16,
              padding: "1.25rem 1.25rem 1rem",
              boxShadow: "0 10px 40px rgba(0,0,0,.24)",
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.4rem" }}>¡Muy bien! 🎉</h2>
            <p style={{ margin: "10px 0 12px", color: "#334155" }}>
              Marcos 10:14 — “Dejad a los niños venir a mí, y no se lo impidáis; porque de los tales es el reino de Dios.”
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => {
                  reset();
                }}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: 10,
                  border: "none",
                  background: "#ffcc00",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Jugar otra vez
              </button>
              <button
                onClick={() => {
                  setWinOpen(false);
                  if (musicOn && musicRef.current) {
                    musicRef.current.play().catch(() => {});
                  }
                }}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
