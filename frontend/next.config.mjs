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
const nextConfig = {
  // AI fact-checks run web searches and can take a couple of minutes.
  experimental: { proxyTimeout: 300_000 },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
