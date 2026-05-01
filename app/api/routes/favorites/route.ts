import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminUserEmail } from "@/app/lib/admin";
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
    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    const isAdmin = isAdminUserEmail(actor?.email);

    const [favs, total] = await Promise.all([
      prisma.favoriteRoute.findMany({
        where: { userId: session.userId },
        select: {
          route: {
            select: {
              id: true,
              title: true,
              description: true,
              createdById: true,
              viewCount: true,
              _count: { select: { favoritedBy: true } },
              routePhotos: {
                select: {
                  photo: {
                    select: {
                      id: true,
                      s3Key: true,
                      title: true,
                      metro: true,
                      lat: true,
                      lng: true,
                      uploadedBy: { select: { username: true } },
                    },
                  },
                },
                orderBy: { order: "asc" },
              },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { route: { publishedAt: "desc" } },
          { route: { createdAt: "desc" } },
        ],
      }),
      prisma.favoriteRoute.count({ where: { userId: session.userId } }),
    ]);

    const items = favs.map(({ route }) => {
      const photos = route.routePhotos.map((routePhoto) => ({
        id: routePhoto.photo.id,
        src: getProxyPhotoUrl(routePhoto.photo.s3Key),
        alt: routePhoto.photo.title,
        metro: parseStoredMultiValue(routePhoto.photo.metro),
        address: `${routePhoto.photo.lat}, ${routePhoto.photo.lng}`,
        uploaderUsername: routePhoto.photo.uploadedBy.username,
      }));
      const firstPhoto = route.routePhotos[0]?.photo;

      return {
        id: route.id,
        title: route.title,
        desc: route.description,
        metro: firstPhoto ? parseStoredMultiValue(firstPhoto.metro) : [],
        address: firstPhoto ? `${firstPhoto.lat}, ${firstPhoto.lng}` : "",
        photos,
        canEdit: isAdmin || route.createdById === session.userId,
        favoriteCount: route._count.favoritedBy,
        viewCount: route.viewCount,
      };
    });

    return NextResponse.json({ routes: items, total, page, pageSize });
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

    const { routeId } = await req.json();
    if (!routeId) {
      return NextResponse.json({ error: "routeId РѕР±СЏР·Р°С‚РµР»РµРЅ" }, { status: 400 });
    }

    await prisma.favoriteRoute.upsert({
      where: { userId_routeId: { userId: session.userId, routeId } },
      update: {},
      create: { userId: session.userId, routeId },
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

    const { routeId } = await req.json();
    if (!routeId) {
      return NextResponse.json({ error: "routeId РѕР±СЏР·Р°С‚РµР»РµРЅ" }, { status: 400 });
    }

    await prisma.favoriteRoute.deleteMany({
      where: { userId: session.userId, routeId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}
