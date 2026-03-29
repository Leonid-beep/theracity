import { NextRequest, NextResponse } from "next/server";
import { s3, s3Bucket } from "@/app/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key)
    return NextResponse.json({ error: "key required" }, { status: 400 });

  try {
    const command = new GetObjectCommand({ Bucket: s3Bucket, Key: key });
    const response = await s3.send(command);

    const body = response.Body;
    if (!body)
      return NextResponse.json({ error: "empty body" }, { status: 404 });

    const bytes = await body.transformToByteArray();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": response.ContentType || "image/jpeg",
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("S3 proxy error:", message);
    return NextResponse.json({ error: "not found", detail: message }, { status: 404 });
  }
}
