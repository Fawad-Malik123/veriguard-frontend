// Normalise the backend URL: add https:// if the scheme was left off and drop trailing slashes.
// (A bare host like "veriguard-backend.onrender.com" or a trailing "/" breaks the /api proxy and surfaces as a 502.)
function normalizeOrigin(value) {
  let origin = (value || "").trim();
  if (!origin) return "http://127.0.0.1:8000";
  if (!/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
  return origin.replace(/\/+$/, "");
}

const apiOrigin = normalizeOrigin(process.env.VERIGUARD_API_ORIGIN);

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The Analyze page records from the microphone and camera; nothing else may use them.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  poweredByHeader: false,
  // Lets the browser wake the sleeping backend directly (see wakeBackend in components/Api.js).
  env: { NEXT_PUBLIC_VERIGUARD_API_ORIGIN: apiOrigin },
  // AI fact-checks can take a couple of minutes.
  experimental: { proxyTimeout: 300_000 },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
