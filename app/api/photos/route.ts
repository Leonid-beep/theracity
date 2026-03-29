import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl, getSignedPhotoUrl, uploadToS3 } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 32));

    const where: Record<string, unknown> = {};
    for (const key of ["metro", "spaceType", "mood", "atmosphere"] as const) {
      const val = sp.get(key);
      if (val) {
        const values = val.split(",").map((v) => v.trim()).filter(Boolean);
        if (values.length === 1) where[key] = values[0];
        else if (values.length > 1) where[key] = { in: values };
      }
    }

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.photo.count({ where }),
    ]);

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

    return NextResponse.json({ photos: withUrls, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;
const ADMIN_EMAIL = "leonidusachev04@yandex.ru";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    if (!user || user.email !== ADMIN_EMAIL)
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

    if (!file || !title || !metro || isNaN(lat) || isNaN(lng) || !spaceType || !mood || !atmosphere) {
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "Допустимые форматы: JPEG, PNG, WebP" }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "Максимальный размер файла: 10MB" }, { status: 400 });

    const ext = file.name.split(".").pop() || "jpg";
    const s3Key = `photos/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadToS3(s3Key, buffer, file.type);

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
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
