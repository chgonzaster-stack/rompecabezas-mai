// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main style={{ textAlign: "center", padding: "2rem", fontFamily: "Comic Sans MS" }}>
      <h1>🎨 Bienvenido a mi app para niños</h1>
      <p>Aprende y juega con actividades divertidas</p>

      <Link
        href="/puzzles"
        style={{
          display: "inline-block",
          backgroundColor: "#ffcc00",
          padding: "1rem 2rem",
          borderRadius: "10px",
          fontSize: "1.2rem",
          border: "none",
          cursor: "pointer",
          marginTop: "1rem",
          textDecoration: "none",
          color: "#222"
        }}
      >
        ¡Comenzar!
      </Link>
    </main>
  );
}
