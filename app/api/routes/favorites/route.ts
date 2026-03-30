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
      prisma.favoriteRoute.findMany({
        where: { userId: session.userId },
        include: {
          route: {
            include: {
              routePhotos: {
                include: { photo: true },
                orderBy: { order: "asc" },
              },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { route: { createdAt: "desc" } },
      }),
      prisma.favoriteRoute.count({ where: { userId: session.userId } }),
    ]);

    const items = favs.map((f) => {
      const photos = f.route.routePhotos.map((rp) => ({
        src: getProxyPhotoUrl(rp.photo.s3Key),
        alt: rp.photo.title,
        metro: rp.photo.metro,
        address: `${rp.photo.lat}, ${rp.photo.lng}`,
      }));
      const firstPhoto = f.route.routePhotos[0]?.photo;
      return {
        id: f.route.id,
        title: f.route.title,
        desc: f.route.description,
        metro: firstPhoto?.metro ?? "",
        address: firstPhoto ? `${firstPhoto.lat}, ${firstPhoto.lng}` : "",
        photos,
      };
    });

    return NextResponse.json({ routes: items, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { routeId } = await req.json();
    if (!routeId)
      return NextResponse.json({ error: "routeId обязателен" }, { status: 400 });

    await prisma.favoriteRoute.upsert({
      where: { userId_routeId: { userId: session.userId, routeId } },
      update: {},
      create: { userId: session.userId, routeId },
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

    const { routeId } = await req.json();
    if (!routeId)
      return NextResponse.json({ error: "routeId обязателен" }, { status: 400 });

    await prisma.favoriteRoute.deleteMany({
      where: { userId: session.userId, routeId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
