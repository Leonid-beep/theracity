import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";
import { parseStoredMultiValue } from "@/app/lib/photoMetadata";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 10));

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where: { createdById: session.userId },
        include: {
          routePhotos: {
            include: { photo: true },
            orderBy: { order: "asc" },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.route.count({ where: { createdById: session.userId } }),
    ]);

    const items = routes.map((r) => {
      const photos = r.routePhotos.map((rp) => ({
        id: rp.photo.id,
        src: getProxyPhotoUrl(rp.photo.s3Key),
        alt: rp.photo.title,
        metro: parseStoredMultiValue(rp.photo.metro),
        address: `${rp.photo.lat}, ${rp.photo.lng}`,
      }));
      const firstPhoto = r.routePhotos[0]?.photo;
      return {
        id: r.id,
        title: r.title,
        desc: r.description,
        isPublished: r.isPublished,
        metro: firstPhoto ? parseStoredMultiValue(firstPhoto.metro) : [],
        address: firstPhoto ? `${firstPhoto.lat}, ${firstPhoto.lng}` : "",
        photos,
        coverUrl: photos[0]?.src ?? "",
        canEdit: true,
      };
    });

    return NextResponse.json({ routes: items, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
