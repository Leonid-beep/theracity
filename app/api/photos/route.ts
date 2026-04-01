import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl, uploadToS3 } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminUserEmail } from "@/app/lib/admin";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_FILE_BYTES, MAX_UPLOAD_FILE_LABEL } from "@/app/lib/upload";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    console.log("[/api/photos] entered photos route");

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 32));
    console.log("[/api/photos] parsed query params", {
      page,
      pageSize,
      raw: Object.fromEntries(sp.entries()),
    });

    const where: Record<string, unknown> = {};
    for (const key of ["metro", "spaceType", "mood", "atmosphere"] as const) {
      const val = sp.get(key);
      if (val) {
        const values = val.split(",").map((v) => v.trim()).filter(Boolean);
        if (values.length === 1) where[key] = values[0];
        else if (values.length > 1) where[key] = { in: values };
      }
    }

    console.log("[/api/photos] prisma query started", { where, page, pageSize });
    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.photo.count({ where }),
    ]);
    console.log("[/api/photos] prisma query finished", { total, page, pageSize, returned: photos.length });

    console.log("[/api/photos] photo count", { count: photos.length });

    console.log("[/api/photos] photo url mapping started");
    const withUrls = photos.map((p) => ({
      id: p.id,
      src: getProxyPhotoUrl(p.s3Key),
      title: p.title,
      metro: p.metro,
      coords: `${p.lat}, ${p.lng}`,
      lat: p.lat,
      lng: p.lng,
      spaceType: p.spaceType,
      mood: p.mood,
      atmosphere: p.atmosphere,
    }));
    console.log("[/api/photos] photo url mapping finished", { count: withUrls.length });

    return NextResponse.json({ photos: withUrls, total, page, pageSize });
  } catch (error) {
    if (error instanceof Error) {
      console.error("[/api/photos] unhandled error in GET", {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("[/api/photos] unhandled non-error value in GET", { error });
    }
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[/api/photos] POST entered photos route");

    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    if (!user || !isAdminUserEmail(user.email))
      return NextResponse.json({ error: "Нет прав на загрузку" }, { status: 403 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const title = form.get("title") as string;
    const metro = form.get("metro") as string;
    const lat = parseFloat(form.get("lat") as string);
    const lng = parseFloat(form.get("lng") as string);
    const spaceType = form.get("spaceType") as string;
    const mood = form.get("mood") as string;
    const atmosphere = form.get("atmosphere") as string;

    console.log("[/api/photos] POST parsed form data", {
      hasFile: !!file,
      hasTitle: !!title,
      hasMetro: !!metro,
      lat,
      lng,
      hasSpaceType: !!spaceType,
      hasMood: !!mood,
      hasAtmosphere: !!atmosphere,
      fileSize: file?.size,
      fileType: file?.type,
    });

    if (!file || !title || !metro || isNaN(lat) || isNaN(lng) || !spaceType || !mood || !atmosphere) {
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]))
      return NextResponse.json({ error: "Допустимые форматы: JPEG, PNG, WebP" }, { status: 400 });
    if (file.size > MAX_UPLOAD_FILE_BYTES)
      return NextResponse.json(
        { error: `Максимальный размер файла для серверной загрузки: ${MAX_UPLOAD_FILE_LABEL}` },
        { status: 400 },
      );

    const ext = file.name.split(".").pop() || "jpg";
    const s3Key = `photos/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("[/api/photos] POST upload to S3 started", {
      s3Key,
      fileType: file.type,
      fileSize: file.size,
    });
    await uploadToS3(s3Key, buffer, file.type);
    console.log("[/api/photos] POST upload to S3 finished", { s3Key });

    console.log("[/api/photos] POST prisma create started");
    const photo = await prisma.photo.create({
      data: {
        s3Key,
        title,
        metro,
        lat,
        lng,
        spaceType,
        mood,
        atmosphere,
        uploadedById: session.userId,
      },
    });
    console.log("[/api/photos] POST prisma create finished", { photoId: photo.id });

    return NextResponse.json({
      photo: {
        id: photo.id,
        src: getProxyPhotoUrl(s3Key),
        title: photo.title,
        metro: photo.metro,
        coords: `${photo.lat}, ${photo.lng}`,
        lat: photo.lat,
        lng: photo.lng,
        spaceType: photo.spaceType,
        mood: photo.mood,
        atmosphere: photo.atmosphere,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("[/api/photos] unhandled error in POST", {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("[/api/photos] unhandled non-error value in POST", { error });
    }
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
