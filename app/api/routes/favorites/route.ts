import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminUserEmail } from "@/app/lib/admin";
import { parseStoredMultiValue } from "@/app/lib/photoMetadata";

function getRouteSortTimestamp(route: {
  createdAt: Date;
  publishedAt: Date | null;
}): number {
  return (route.publishedAt ?? route.createdAt).getTime();
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 10));
    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    const isAdmin = isAdminUserEmail(actor?.email);

    const favs = await prisma.favoriteRoute.findMany({
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
    });

    const sortedFavs = favs.sort(
      (a, b) => getRouteSortTimestamp(b.route) - getRouteSortTimestamp(a.route),
    );
    const total = sortedFavs.length;
    const pagedFavs = sortedFavs.slice((page - 1) * pageSize, page * pageSize);

    const items = pagedFavs.map((f) => {
      const photos = f.route.routePhotos.map((rp) => ({
        id: rp.photo.id,
        src: getProxyPhotoUrl(rp.photo.s3Key),
        alt: rp.photo.title,
        metro: parseStoredMultiValue(rp.photo.metro),
        address: `${rp.photo.lat}, ${rp.photo.lng}`,
      }));
      const firstPhoto = f.route.routePhotos[0]?.photo;
      return {
        id: f.route.id,
        title: f.route.title,
        desc: f.route.description,
        metro: firstPhoto ? parseStoredMultiValue(firstPhoto.metro) : [],
        address: firstPhoto ? `${firstPhoto.lat}, ${firstPhoto.lng}` : "",
        photos,
        canEdit: isAdmin || f.route.createdById === session.userId,
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
