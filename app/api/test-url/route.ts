import { NextResponse } from "next/server";
import { s3, s3Bucket, getSignedPhotoUrl } from "@/app/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = "1000045551.jpg";

  let sdkGetStatus = "unknown";
  let sdkGetError = "";
  try {
    const cmd = new GetObjectCommand({ Bucket: s3Bucket, Key: key });
    const resp = await s3.send(cmd);
    const body = resp.Body;
    if (body) {
      const bytes = await body.transformToByteArray();
      sdkGetStatus = `ok, ${bytes.length} bytes, type=${resp.ContentType}`;
    } else {
      sdkGetStatus = "empty body";
    }
  } catch (e) {
    sdkGetError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    sdkGetStatus = "error";
  }

  let signedUrl = "";
  let signedUrlGetStatus = "unknown";
  try {
    signedUrl = await getSignedPhotoUrl(key);
    const r = await fetch(signedUrl);
    signedUrlGetStatus = `${r.status} ${r.statusText}`;
    if (!r.ok) {
      const txt = await r.text();
      signedUrlGetStatus += ` — ${txt.slice(0, 200)}`;
    }
  } catch (e) {
    signedUrlGetStatus = `error: ${e}`;
  }

  const publicUrl = `${process.env.S3_ENDPOINT}/${s3Bucket}/${key}`;
  let publicGetStatus = "unknown";
  try {
    const r = await fetch(publicUrl);
    publicGetStatus = `${r.status} ${r.statusText}`;
    if (!r.ok) {
      const txt = await r.text();
      publicGetStatus += ` — ${txt.slice(0, 200)}`;
    }
  } catch (e) {
    publicGetStatus = `error: ${e}`;
  }

  return NextResponse.json({
    sdkGetStatus,
    sdkGetError,
    signedUrlGetStatus,
    signedUrl: signedUrl.slice(0, 200),
    publicGetStatus,
    publicUrl,
  });
}
