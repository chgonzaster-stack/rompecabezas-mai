"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(135deg, rgba(49,46,129,1) 0%, rgba(30,27,75,1) 100%)",
        color: "white",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          display: "grid",
          gap: "1.25rem",
        }}
      >
        <header
          style={{
            textAlign: "center",
            display: "grid",
            gap: ".5rem",
          }}
        >
          <img
            src="/images/reverso/cmm.png"
            alt="CMM Kids Logo"
            style={{
              width: 96,
              height: 96,
              margin: "0 auto",
              borderRadius: 16,
              background: "white",
              padding: 8,
              boxShadow: "0 10px 30px rgba(0,0,0,.25)",
              objectFit: "contain",
            }}
          />
          <h1 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700 }}>
            CMM Kids
          </h1>
          <p style={{ opacity: 0.85 }}>
            Juegos interactivos educativos
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <Link
            href="/puzzles"
            aria-label="Ir al juego de Rompecabezas"
            style={{
              display: "block",
              borderRadius: 16,
              background: "rgba(255,255,255,.06)",
              padding: "1.25rem",
              textDecoration: "none",
              color: "white",
              boxShadow: "0 6px 18px rgba(0,0,0,.25)",
            }}
          >
            <h2 style={{ margin: 0, fontWeight: 600 }}>🧩 Rompecabezas</h2>
            <p style={{ marginTop: 8, opacity: 0.85 }}>
              Arma piezas con tus personajes favoritos
            </p>
          </Link>

          <Link
            href="/memory"
            aria-label="Ir al juego de Memoria"
            style={{
              display: "block",
              borderRadius: 16,
              background: "rgba(255,255,255,.06)",
              padding: "1.25rem",
              textDecoration: "none",
              color: "white",
              boxShadow: "0 6px 18px rgba(0,0,0,.25)",
            }}
          >
            <h2 style={{ margin: 0, fontWeight: 600 }}>🧠 Memoria</h2>
            <p style={{ marginTop: 8, opacity: 0.85 }}>
              Encuentra las parejas y gana medallas
            </p>
          </Link>
        </section>

        <footer style={{ textAlign: "center", marginTop: "1rem", opacity: 0.6 }}>
          © {new Date().getFullYear()} Iglesia CMM – Kids
        </footer>
      </div>
    </main>
  );
}
