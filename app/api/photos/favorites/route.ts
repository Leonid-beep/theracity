import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 10));

    const [favs, total] = await Promise.all([
      prisma.favoritePhoto.findMany({
        where: { userId: session.userId },
        include: { photo: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { photo: { createdAt: "desc" } },
      }),
      prisma.favoritePhoto.count({ where: { userId: session.userId } }),
    ]);

    const photos = favs.map((f) => ({
      id: f.photo.id,
      src: getProxyPhotoUrl(f.photo.s3Key),
      title: f.photo.title,
      metro: f.photo.metro,
      coords: `${f.photo.lat}, ${f.photo.lng}`,
      lat: f.photo.lat,
      lng: f.photo.lng,
      spaceType: f.photo.spaceType,
      mood: f.photo.mood,
      atmosphere: f.photo.atmosphere,
    }));

    return NextResponse.json({ photos, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { photoId } = await req.json();
    if (!photoId)
      return NextResponse.json({ error: "photoId обязателен" }, { status: 400 });

    await prisma.favoritePhoto.upsert({
      where: { userId_photoId: { userId: session.userId, photoId } },
      update: {},
      create: { userId: session.userId, photoId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { photoId } = await req.json();
    if (!photoId)
      return NextResponse.json({ error: "photoId обязателен" }, { status: 400 });

    await prisma.favoritePhoto.deleteMany({
      where: { userId: session.userId, photoId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
