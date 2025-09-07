# restaurar-estructura.ps1
$ErrorActionPreference = "Stop"

Write-Host "🔧 Restaurando estructura mínima..."

function Ensure-Dir($Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
        Write-Host "📂 Creada carpeta: $Path"
    }
}

# Carpetas requeridas
$dirs = @(
    "app",
    "app\memory",
    "app\puzzles",
    "public",
    "public\icons",
    "public\images",
    "public\sounds"
)

foreach ($d in $dirs) { Ensure-Dir $d }

# ---- Archivos mínimos ----

# layout.tsx
$layout = @'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
'@
Set-Content -Path "app\layout.tsx" -Value $layout -Encoding UTF8

# page.tsx (home)
$home = @'
export default function Home() {
  return (
    <main>
      <h1>Bienvenido a mi app</h1>
    </main>
  )
}
'@
Set-Content -Path "app\page.tsx" -Value $home -Encoding UTF8

# memory/page.tsx
$memory = @'
export default function MemoryPage() {
  return (
    <main>
      <h1>Juego de Memoria</h1>
    </main>
  )
}
'@
Set-Content -Path "app\memory\page.tsx" -Value $memory -Encoding UTF8

# puzzles/page.tsx
$puzzles = @'
export default function PuzzlesPage() {
  return (
    <main>
      <h1>Rompecabezas</h1>
    </main>
  )
}
'@
Set-Content -Path "app\puzzles\page.tsx" -Value $puzzles -Encoding UTF8

# manifest.webmanifest
$manifest = @'
{
  "name": "CMM Kids - Memoria",
  "short_name": "Memoria CMM",
  "start_url": "/memory",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#312e81",
  "icons": [
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
'@
Set-Content -Path "public\manifest.webmanifest" -Value $manifest -Encoding UTF8

Write-Host "✅ Restauración finalizada. Revisa la carpeta app/ y public/."
