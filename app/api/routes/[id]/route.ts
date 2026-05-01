import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminUserEmail } from "@/app/lib/admin";
import { getProxyPhotoUrl } from "@/app/lib/s3";
import { parseStoredMultiValue } from "@/app/lib/photoMetadata";

type RouteWithPhotos = {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  publishedAt: Date | null;
  createdById: string;
  viewCount: number;
  createdBy?: { username: string | null } | null;
  _count: { favoritedBy: number };
  routePhotos: Array<{
    photoId: string;
    photo: {
      id: string;
      s3Key: string;
      title: string;
      metro: string;
      lat: number;
      lng: number;
      uploadedBy?: { username: string | null } | null;
    };
  }>;
};

function formatRouteResponse(route: RouteWithPhotos, canEdit: boolean) {
  const photos = route.routePhotos.map((routePhoto) => ({
    id: routePhoto.photo.id,
    src: getProxyPhotoUrl(routePhoto.photo.s3Key),
    alt: routePhoto.photo.title,
    metro: parseStoredMultiValue(routePhoto.photo.metro),
    address: `${routePhoto.photo.lat}, ${routePhoto.photo.lng}`,
    uploaderUsername: routePhoto.photo.uploadedBy?.username ?? "",
  }));
  const firstPhoto = route.routePhotos[0]?.photo;

  return {
    id: route.id,
    title: route.title,
    desc: route.description,
    authorUsername: route.createdBy?.username ?? "",
    metro: firstPhoto ? parseStoredMultiValue(firstPhoto.metro) : [],
    address: firstPhoto ? `${firstPhoto.lat}, ${firstPhoto.lng}` : "",
    photos,
    coverUrl: photos[0]?.src ?? "",
    isPublished: route.isPublished,
    favoriteCount: route._count.favoritedBy,
    viewCount: route.viewCount,
    canEdit,
  };
}

async function getActorPermissions() {
  const session = await getSessionUser();

  if (!session) {
    return {
      session: null,
      isAdmin: false,
    };
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  return {
    session,
    isAdmin: isAdminUserEmail(actor?.email),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session, isAdmin } = await getActorPermissions();

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        createdBy: { select: { username: true } },
        _count: { select: { favoritedBy: true } },
        routePhotos: {
          include: {
            photo: {
              include: { uploadedBy: { select: { username: true } } },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!route) {
      return NextResponse.json({ error: "РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ" }, { status: 404 });
    }

    if (!route.isPublished) {
      if (!session) {
        return NextResponse.json({ error: "РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ" }, { status: 404 });
      }

      if (!isAdmin && route.createdById !== session.userId) {
        return NextResponse.json({ error: "РќРµС‚ РґРѕСЃС‚СѓРїР°" }, { status: 403 });
      }
    }

    return NextResponse.json({
      route: formatRouteResponse(route, !!session && (isAdmin || route.createdById === session.userId)),
    });
  } catch {
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, isAdmin } = await getActorPermissions();

    if (!session) {
      return NextResponse.json({ error: "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ" }, { status: 401 });
    }

    const { id } = await params;
    const route = await prisma.route.findUnique({ where: { id } });

    if (!route) {
      return NextResponse.json({ error: "РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ" }, { status: 404 });
    }

    if (!isAdmin && route.createdById !== session.userId) {
      return NextResponse.json({ error: "РќРµС‚ РґРѕСЃС‚СѓРїР°" }, { status: 403 });
    }

    await prisma.route.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, isAdmin } = await getActorPermissions();

    if (!session) {
      return NextResponse.json({ error: "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ" }, { status: 401 });
    }

    const { id } = await params;
    const route = await prisma.route.findUnique({
      where: { id },
      include: { routePhotos: { select: { photoId: true } } },
    });

    if (!route) {
      return NextResponse.json({ error: "РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ" }, { status: 404 });
    }

    let payload: { title?: unknown; description?: unknown; photoIds?: unknown } = {};

    try {
      payload = (await req.json()) as {
        title?: unknown;
        description?: unknown;
        photoIds?: unknown;
      };
    } catch {
      payload = {};
    }

    const hasEditableFields =
      Object.prototype.hasOwnProperty.call(payload, "title") ||
      Object.prototype.hasOwnProperty.call(payload, "description") ||
      Object.prototype.hasOwnProperty.call(payload, "photoIds");

    if (hasEditableFields) {
      if (!isAdmin && route.createdById !== session.userId) {
        return NextResponse.json({ error: "РќРµС‚ РґРѕСЃС‚СѓРїР°" }, { status: 403 });
      }

      const nextTitle =
        typeof payload.title === "string"
          ? payload.title.trim() || "РќРѕРІС‹Р№ РјР°СЂС€СЂСѓС‚"
          : route.title;
      const nextDescription =
        typeof payload.description === "string"
          ? payload.description.trim()
          : route.description;
      const nextPhotoIds = Array.isArray(payload.photoIds)
        ? [...new Set(payload.photoIds.map((photoId) => String(photoId).trim()).filter(Boolean))]
        : route.routePhotos.map((routePhoto) => routePhoto.photoId);

      if (Array.isArray(payload.photoIds) && nextPhotoIds.length === 0 && route.isPublished) {
        return NextResponse.json(
          { error: "В опубликованном маршруте должно быть хотя бы одно фото" },
          { status: 400 },
        );
      }

      if (Array.isArray(payload.photoIds) && nextPhotoIds.length > 0) {
        const existingPhotosCount = await prisma.photo.count({
          where: {
            id: {
              in: nextPhotoIds,
            },
          },
        });

        if (existingPhotosCount !== nextPhotoIds.length) {
          return NextResponse.json(
            { error: "Некоторые фото для маршрута не найдены" },
            { status: 400 },
          );
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.route.update({
          where: { id },
          data: {
            title: nextTitle,
            description: nextDescription,
            isPublished: nextPhotoIds.length > 0 ? route.isPublished : false,
            publishedAt: nextPhotoIds.length > 0 ? route.publishedAt : null,
          },
        });

        if (Array.isArray(payload.photoIds)) {
          await tx.routePhoto.deleteMany({ where: { routeId: id } });

          if (nextPhotoIds.length > 0) {
            await tx.routePhoto.createMany({
              data: nextPhotoIds.map((photoId, index) => ({
                routeId: id,
                photoId,
                order: index,
              })),
            });
          }
        }

        return tx.route.findUnique({
          where: { id },
          include: {
            createdBy: { select: { username: true } },
            _count: { select: { favoritedBy: true } },
            routePhotos: {
              include: {
                photo: {
                  include: { uploadedBy: { select: { username: true } } },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        });
      });

      if (!updated) {
        return NextResponse.json({ error: "РњР°СЂС€СЂСѓС‚ РЅРµ РЅР°Р№РґРµРЅ" }, { status: 404 });
      }

      return NextResponse.json({
        route: formatRouteResponse(updated as RouteWithPhotos, true),
      });
    }

    if (route.createdById !== session.userId) {
      return NextResponse.json({ error: "РќРµС‚ РґРѕСЃС‚СѓРїР°" }, { status: 403 });
    }

    if (route.routePhotos.length === 0) {
      return NextResponse.json(
        { error: "РќРµР»СЊР·СЏ РѕРїСѓР±Р»РёРєРѕРІР°С‚СЊ РїСѓСЃС‚РѕР№ РјР°СЂС€СЂСѓС‚" },
        { status: 400 },
      );
    }

    await prisma.route.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: route.publishedAt ?? new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}
