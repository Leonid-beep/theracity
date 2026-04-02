import { GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { decodePhotoKey } from "@/app/lib/photo-url";
import { s3, s3Bucket } from "@/app/lib/s3";

export const runtime = "nodejs";

const DEFAULT_WIDTH = 1200;
const DEFAULT_QUALITY = 72;
const MAX_WIDTH = 2400;
const MIN_WIDTH = 64;
const MIN_QUALITY = 40;
const MAX_QUALITY = 82;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let key: string;
  try {
    key = decodePhotoKey(id);
  } catch {
    return NextResponse.json({ error: "invalid photo key" }, { status: 400 });
  }

  const width = clamp(
    parsePositiveInt(req.nextUrl.searchParams.get("w")) ?? DEFAULT_WIDTH,
    MIN_WIDTH,
    MAX_WIDTH,
  );
  const quality = clamp(
    parsePositiveInt(req.nextUrl.searchParams.get("q")) ?? DEFAULT_QUALITY,
    MIN_QUALITY,
    MAX_QUALITY,
  );

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: s3Bucket,
        Key: key,
      }),
    );

    const body = response.Body;
    if (!body) {
      return NextResponse.json({ error: "empty body" }, { status: 404 });
    }

    const originalBuffer = Buffer.from(await body.transformToByteArray());
    const optimizedBuffer = await sharp(originalBuffer, {
      failOn: "none",
      limitInputPixels: false,
    })
      .rotate()
      .resize({
        width,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 2,
      })
      .toBuffer();

    return new NextResponse(new Uint8Array(optimizedBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(optimizedBuffer.length),
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
        "CDN-Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
        "Vercel-CDN-Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
        "Content-Disposition": "inline; filename=\"photo.webp\"",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Optimized photo route error:", message);
    return NextResponse.json({ error: "not found", detail: message }, { status: 404 });
  }
}
