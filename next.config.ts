import type { NextConfig } from "next";

// Inicializamos el plugin con require para evitar problemas de tipos
// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);