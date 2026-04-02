import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminUserEmail } from "@/app/lib/admin";
import { getProxyPhotoUrl } from "@/app/lib/s3";
import { parseStoredMultiValue } from "@/app/lib/photoMetadata";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        createdBy: { select: { username: true } },
        routePhotos: {
          include: { photo: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!route) {
      return NextResponse.json({ error: "Маршрут не найден" }, { status: 404 });
    }

    if (!route.isPublished) {
      const session = await getSessionUser();
      if (!session) {
        return NextResponse.json({ error: "Маршрут не найден" }, { status: 404 });
      }

      const actor = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true },
      });
      const isAdmin = isAdminUserEmail(actor?.email);

      if (!isAdmin && route.createdById !== session.userId) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }
    }

    const photos = route.routePhotos.map((routePhoto) => ({
      src: getProxyPhotoUrl(routePhoto.photo.s3Key),
      alt: routePhoto.photo.title,
      metro: parseStoredMultiValue(routePhoto.photo.metro),
      address: `${routePhoto.photo.lat}, ${routePhoto.photo.lng}`,
    }));
    const firstPhoto = route.routePhotos[0]?.photo;

    return NextResponse.json({
      route: {
        id: route.id,
        title: route.title,
        desc: route.description,
        authorUsername: route.createdBy?.username ?? "",
        metro: firstPhoto ? parseStoredMultiValue(firstPhoto.metro) : [],
        address: firstPhoto ? `${firstPhoto.lat}, ${firstPhoto.lng}` : "",
        photos,
        coverUrl: photos[0]?.src ?? "",
        isPublished: route.isPublished,
      },
    });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const route = await prisma.route.findUnique({ where: { id } });

    if (!route) {
      return NextResponse.json({ error: "Маршрут не найден" }, { status: 404 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    const isAdmin = isAdminUserEmail(actor?.email);

    if (!isAdmin && route.createdById !== session.userId) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    await prisma.route.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const route = await prisma.route.findUnique({
      where: { id },
      include: { routePhotos: { select: { photoId: true } } },
    });

    if (!route) {
      return NextResponse.json({ error: "Маршрут не найден" }, { status: 404 });
    }

    if (route.createdById !== session.userId) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    if (route.routePhotos.length === 0) {
      return NextResponse.json(
        { error: "Нельзя опубликовать пустой маршрут" },
        { status: 400 },
      );
    }

    await prisma.route.update({
      where: { id },
      data: { isPublished: true },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
