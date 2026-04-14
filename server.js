/**
 * Redmine CORS Proxy — deployable to Render.com (free tier)
 * 
 * Environment variables:
 *   REDMINE_URL   — your Redmine instance URL (required)
 *   ALLOWED_ORIGIN — your Netlify frontend URL (optional, defaults to *)
 *   PORT          — server port (Render sets this automatically)
 */

import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";

const REDMINE_URL    = process.env.REDMINE_URL    || "https://redmine.agaramsolutions.net";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const PORT           = process.env.PORT           || 3002;

const app = express();

// CORS — allow the Netlify frontend (or all origins in dev)
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Redmine-API-Key"],
  credentials: true,
}));

// Health check — Render pings this to keep the service alive
app.get("/health", (req, res) => res.json({ status:"ok", target: REDMINE_URL }));

// Proxy everything else to Redmine
app.use("/", createProxyMiddleware({
  target: REDMINE_URL,
  changeOrigin: true,
  secure: true,
  on: {
    proxyReq: (proxyReq, req) => {
      const auth = req.headers["authorization"];
      if (auth) proxyReq.setHeader("Authorization", auth);
      const apiKey = req.headers["x-redmine-api-key"];
      if (apiKey) proxyReq.setHeader("X-Redmine-API-Key", apiKey);
      console.log(`→ ${req.method} ${req.url}`);
    },
    error: (err, req, res) => {
      console.error("Proxy error:", err.message);
      res.status(502).json({ error: err.message });
    }
  }
}));

app.listen(PORT, () => {
  console.log(`\n✓ Redmine proxy running on port ${PORT}`);
  console.log(`  Forwarding → ${REDMINE_URL}`);
  console.log(`  CORS origin → ${ALLOWED_ORIGIN}\n`);
});
