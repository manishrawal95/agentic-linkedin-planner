import { proxyToBackend } from "@/lib/api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return proxyToBackend("/settings", request);
}

export async function PUT(request: NextRequest) {
  return proxyToBackend("/settings", request);
}
