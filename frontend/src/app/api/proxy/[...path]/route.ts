/**
 * Catch-all proxy to the FastAPI backend.
 * Runs server-side at request time — reads NEXT_PUBLIC_API_URL from the
 * Railway environment at runtime, not from the client bundle (which is
 * baked at build time and may be stale).
 *
 * Client calls /api/proxy/chat instead of https://backend.railway.app/chat
 * → no CORS, no build-time baking issues.
 */
import { NextRequest, NextResponse } from "next/server";

// Server-side: reads from process.env at request time (not baked into bundle)
// Ensure the URL has a scheme — Railway variables are sometimes set without https://
function normalizeUrl(raw: string): string {
  const s = raw.replace(/\/$/, "");
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}
const BACKEND = normalizeUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const search = req.nextUrl.search;
  const backendUrl = `${BACKEND}/${path.join("/")}${search}`;

  const init: RequestInit = { method: req.method };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer() as BodyInit;
    init.headers = { "content-type": req.headers.get("content-type") || "application/json" };
  }

  let res: Response;
  try {
    res = await fetch(backendUrl, init);
  } catch (err) {
    return NextResponse.json(
      { detail: `Proxy error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
