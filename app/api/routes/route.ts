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
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
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
    const pagedRoutes = filteredRoutes.slice((page - 1) * pageSize, page * pageSize);

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

    return NextResponse.json({ routes: items, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ" }, { status: 401 });

    const { title, description, photoIds } = await req.json();

    if (!title || typeof title !== "string")
      return NextResponse.json({ error: "РќР°Р·РІР°РЅРёРµ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ" }, { status: 400 });

    const photoIdArr: string[] = Array.isArray(photoIds) ? photoIds : [];

    const route = await prisma.$transaction(async (tx) => {
      const created = await tx.route.create({
        data: {
          title: title.trim(),
          description: (description ?? "").trim(),
          createdById: session.userId,
          isPublished: false,
        },
      });

      if (photoIdArr.length > 0) {
        await tx.routePhoto.createMany({
          data: photoIdArr.map((photoId, idx) => ({
            routeId: created.id,
            photoId,
            order: idx,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ route: { id: route.id, title: route.title } });
  } catch {
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}
