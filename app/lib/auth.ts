import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/app/lib/env";

const secret = new TextEncoder().encode(requireEnv("JWT_SECRET"));
const ALG = "HS256";
const COOKIE = "token";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

type RequestLike = Pick<NextRequest, "headers" | "nextUrl" | "url"> | Request;

export type TokenPayload = { userId: string; username: string };

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

function isSecureCookieRequest(req?: RequestLike): boolean {
  const forced = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (forced === "true") return true;
  if (forced === "false") return false;

  const forwardedProto = req?.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  const protocol =
    req && "nextUrl" in req
      ? req.nextUrl.protocol
      : req?.url
        ? new URL(req.url).protocol
        : null;

  return protocol === "https:";
}

function getAuthCookieOptions(req?: RequestLike) {
  return {
    httpOnly: true,
    secure: isSecureCookieRequest(req),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  } as const;
}

export async function setAuthCookie(payload: TokenPayload) {
  const token = await signToken(payload);
  const store = await cookies();
  store.set(COOKIE, token, getAuthCookieOptions());
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.set(COOKIE, "", {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });
}

export async function applyAuthCookie(
  response: NextResponse,
  payload: TokenPayload,
  req?: RequestLike,
) {
  response.cookies.set(COOKIE, await signToken(payload), getAuthCookieOptions(req));
  return response;
}

export function applyClearedAuthCookie(response: NextResponse, req?: RequestLike) {
  response.cookies.set(COOKIE, "", {
    ...getAuthCookieOptions(req),
    maxAge: 0,
  });
  return response;
}

export async function getSessionUser(): Promise<TokenPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<TokenPayload> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
