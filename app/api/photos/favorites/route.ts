import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";
import { parseStoredMultiValue } from "@/app/lib/photoMetadata";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 10));

    const [favs, total] = await Promise.all([
      prisma.favoritePhoto.findMany({
        where: { userId: session.userId },
        select: {
          photo: {
            select: {
              id: true,
              s3Key: true,
              title: true,
              metro: true,
              lat: true,
              lng: true,
              spaceType: true,
              mood: true,
              atmosphere: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { photo: { createdAt: "desc" } },
      }),
      prisma.favoritePhoto.count({ where: { userId: session.userId } }),
    ]);

    const photos = favs.map(({ photo }) => ({
      id: photo.id,
      src: getProxyPhotoUrl(photo.s3Key),
      title: photo.title,
      metro: parseStoredMultiValue(photo.metro),
      coords: `${photo.lat}, ${photo.lng}`,
      lat: photo.lat,
      lng: photo.lng,
      spaceType: parseStoredMultiValue(photo.spaceType),
      mood: parseStoredMultiValue(photo.mood),
      atmosphere: parseStoredMultiValue(photo.atmosphere),
    }));

    return NextResponse.json({ photos, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ" }, { status: 401 });
    }

    const { photoId } = await req.json();
    if (!photoId) {
      return NextResponse.json({ error: "photoId РѕР±СЏР·Р°С‚РµР»РµРЅ" }, { status: 400 });
    }

    await prisma.favoritePhoto.upsert({
      where: { userId_photoId: { userId: session.userId, photoId } },
      update: {},
      create: { userId: session.userId, photoId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ" }, { status: 401 });
    }

    const { photoId } = await req.json();
    if (!photoId) {
      return NextResponse.json({ error: "photoId РѕР±СЏР·Р°С‚РµР»РµРЅ" }, { status: 400 });
    }

    await prisma.favoritePhoto.deleteMany({
      where: { userId: session.userId, photoId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}
