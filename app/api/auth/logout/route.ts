import { NextRequest, NextResponse } from "next/server";
import { applyClearedAuthCookie } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  applyClearedAuthCookie(response, req);
  return response;
}
