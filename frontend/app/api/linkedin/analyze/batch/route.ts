import { proxyToBackend } from "@/lib/api";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const qs = request.nextUrl.searchParams.toString();
  const path = qs ? `/analyze/batch?${qs}` : "/analyze/batch";
  return proxyToBackend(path, request);
}
