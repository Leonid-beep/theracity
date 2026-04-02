import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";
import {
  matchesSelectedValues,
  parseStoredMultiValue,
} from "@/app/lib/photoMetadata";

type FilterKey = "metro" | "spaceType" | "mood" | "atmosphere";

function getSelectedValues(sp: URLSearchParams, key: FilterKey): string[] {
  return (sp.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const includeAll = sp.get("all") === "1";
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 32));
    const filters = {
      metro: getSelectedValues(sp, "metro"),
      spaceType: getSelectedValues(sp, "spaceType"),
      mood: getSelectedValues(sp, "mood"),
      atmosphere: getSelectedValues(sp, "atmosphere"),
    };

    const routes = await prisma.route.findMany({
      where: { isPublished: true },
      include: {
        createdBy: { select: { username: true } },
        routePhotos: {
          include: { photo: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const filteredRoutes = routes.filter((route) =>
      route.routePhotos.some(({ photo }) =>
        matchesSelectedValues(photo.metro, filters.metro) &&
        matchesSelectedValues(photo.spaceType, filters.spaceType) &&
        matchesSelectedValues(photo.mood, filters.mood) &&
        matchesSelectedValues(photo.atmosphere, filters.atmosphere),
      ),
    );

    const total = filteredRoutes.length;
    const pagedRoutes = includeAll
      ? filteredRoutes
      : filteredRoutes.slice((page - 1) * pageSize, page * pageSize);

    const items = pagedRoutes.map((route) => {
      const photos = route.routePhotos.map((routePhoto) => ({
        src: getProxyPhotoUrl(routePhoto.photo.s3Key),
        alt: routePhoto.photo.title,
        metro: parseStoredMultiValue(routePhoto.photo.metro),
        address: `${routePhoto.photo.lat}, ${routePhoto.photo.lng}`,
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
      };
    });

    return NextResponse.json({
      routes: items,
      total,
      page: includeAll ? 1 : page,
      pageSize: includeAll ? total || items.length : pageSize,
    });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { title, description, photoIds } = await req.json();
    const normalizedTitle = typeof title === "string" ? title.trim() : "";

    if (!normalizedTitle) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
    }

    const photoIdArr = Array.isArray(photoIds)
      ? photoIds.map((photoId) => String(photoId)).filter(Boolean)
      : [];

    const route = await prisma.$transaction(async (tx) => {
      const created = await tx.route.create({
        data: {
          title: normalizedTitle,
          description: typeof description === "string" ? description.trim() : "",
          createdById: session.userId,
          isPublished: false,
        },
      });

      if (photoIdArr.length > 0) {
        await tx.routePhoto.createMany({
          data: photoIdArr.map((photoId, index) => ({
            routeId: created.id,
            photoId,
            order: index,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ route: { id: route.id, title: route.title } });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
