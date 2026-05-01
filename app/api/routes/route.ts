import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminUserEmail } from "@/app/lib/admin";
import {
  matchesSelectedValues,
  parseStoredMultiValue,
} from "@/app/lib/photoMetadata";

type FilterKey = "metro" | "spaceType" | "mood" | "atmosphere";
type RouteSort = "date" | "views" | "likes";

function getSelectedValues(sp: URLSearchParams, key: FilterKey): string[] {
  return (sp.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getRouteSort(value: string | null): RouteSort {
  if (value === "views" || value === "likes") {
    return value;
  }

  return "date";
}

function getRouteOrderBy(sort: RouteSort) {
  if (sort === "views") {
    return [
      { viewCount: "desc" as const },
      { publishedAt: "desc" as const },
      { createdAt: "desc" as const },
    ];
  }

  if (sort === "likes") {
    return [
      { favoritedBy: { _count: "desc" as const } },
      { publishedAt: "desc" as const },
      { createdAt: "desc" as const },
    ];
  }

  return [
    { publishedAt: "desc" as const },
    { createdAt: "desc" as const },
  ];
}

function mapRouteItem(
  route: {
    id: string;
    title: string;
    description: string;
    createdById: string;
    viewCount: number;
    createdBy?: { username: string | null } | null;
    _count: { favoritedBy: number };
    routePhotos: Array<{
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
  },
  sessionUserId: string | null,
  isAdmin: boolean,
) {
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
    favoriteCount: route._count.favoritedBy,
    viewCount: route.viewCount,
    canEdit: !!sessionUserId && (isAdmin || route.createdById === sessionUserId),
  };
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const includeAll = sp.get("all") === "1";
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 32));
    const sort = getRouteSort(sp.get("sort"));
    const filters = {
      metro: getSelectedValues(sp, "metro"),
      spaceType: getSelectedValues(sp, "spaceType"),
      mood: getSelectedValues(sp, "mood"),
      atmosphere: getSelectedValues(sp, "atmosphere"),
    };
    const hasFilters = Object.values(filters).some((selectedValues) => selectedValues.length > 0);

    const session = await getSessionUser();
    const actor = session
      ? await prisma.user.findUnique({
          where: { id: session.userId },
          select: { email: true },
        })
      : null;
    const isAdmin = isAdminUserEmail(actor?.email);

    const baseWhere = {
      isPublished: true,
      routePhotos: {
        some: {},
      },
    } as const;

    const routes = hasFilters
      ? await prisma.route.findMany({
          where: { isPublished: true },
          include: {
            createdBy: { select: { username: true } },
            _count: { select: { favoritedBy: true } },
            routePhotos: {
              include: {
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
                    uploadedBy: { select: { username: true } },
                  },
                },
              },
              orderBy: { order: "asc" },
            },
          },
          orderBy: getRouteOrderBy(sort),
        })
      : await prisma.route.findMany({
          where: baseWhere,
          include: {
            createdBy: { select: { username: true } },
            _count: { select: { favoritedBy: true } },
            routePhotos: {
              include: {
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
          orderBy: getRouteOrderBy(sort),
          ...(includeAll
            ? {}
            : {
                skip: (page - 1) * pageSize,
                take: pageSize,
              }),
        });

    const filteredRoutes = hasFilters
      ? routes
          .filter((route) =>
            route.routePhotos.some(({ photo }) =>
              matchesSelectedValues(photo.metro, filters.metro) &&
              matchesSelectedValues(photo.spaceType, filters.spaceType) &&
              matchesSelectedValues(photo.mood, filters.mood) &&
              matchesSelectedValues(photo.atmosphere, filters.atmosphere),
            ),
          )
      : routes;

    const pagedRoutes =
      hasFilters && !includeAll
        ? filteredRoutes.slice((page - 1) * pageSize, page * pageSize)
        : filteredRoutes;

    const total = hasFilters
      ? filteredRoutes.length
      : includeAll
        ? routes.length
        : await prisma.route.count({ where: baseWhere });

    const items = pagedRoutes.map((route) =>
      mapRouteItem(route, session?.userId ?? null, isAdmin),
    );

    return NextResponse.json({
      routes: items,
      total,
      page: includeAll ? 1 : page,
      pageSize: includeAll ? total || items.length : pageSize,
    });
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

    const { title, description, photoIds } = await req.json();
    const normalizedTitle = typeof title === "string" ? title.trim() : "";

    if (!normalizedTitle) {
      return NextResponse.json({ error: "РќР°Р·РІР°РЅРёРµ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ" }, { status: 400 });
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
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}
