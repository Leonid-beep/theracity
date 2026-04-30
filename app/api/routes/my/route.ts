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

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where: { createdById: session.userId },
        select: {
          id: true,
          title: true,
          description: true,
          isPublished: true,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.route.count({ where: { createdById: session.userId } }),
    ]);

    const items = routes.map((route) => {
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
        isPublished: route.isPublished,
        metro: firstPhoto ? parseStoredMultiValue(firstPhoto.metro) : [],
        address: firstPhoto ? `${firstPhoto.lat}, ${firstPhoto.lng}` : "",
        photos,
        coverUrl: photos[0]?.src ?? "",
        canEdit: true,
      };
    });

    return NextResponse.json({ routes: items, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}
