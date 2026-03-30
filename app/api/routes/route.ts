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
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 32));

    const photoWhere: Record<string, unknown> = {};
    for (const key of ["metro", "spaceType", "mood", "atmosphere"] as const) {
      const val = sp.get(key);
      if (val) {
        const values = val.split(",").map((v) => v.trim()).filter(Boolean);
        if (values.length === 1) photoWhere[key] = values[0];
        else if (values.length > 1) photoWhere[key] = { in: values };
      }
    }

    const where = {
      isPublished: true,
      routePhotos: {
        some: {
          photo: photoWhere,
        },
      },
    };

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        include: {
          createdBy: { select: { username: true } },
          routePhotos: {
            include: { photo: true },
            orderBy: { order: "asc" },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.route.count({ where }),
    ]);

    const items = routes.map((r) => {
      const photos = r.routePhotos.map((rp) => ({
        src: getProxyPhotoUrl(rp.photo.s3Key),
        alt: rp.photo.title,
        metro: rp.photo.metro,
        address: `${rp.photo.lat}, ${rp.photo.lng}`,
      }));
      const firstPhoto = r.routePhotos[0]?.photo;
      return {
        id: r.id,
        title: r.title,
        desc: r.description,
        authorUsername: r.createdBy?.username ?? "",
        metro: firstPhoto?.metro ?? "",
        address: firstPhoto ? `${firstPhoto.lat}, ${firstPhoto.lng}` : "",
        photos,
        coverUrl: photos[0]?.src ?? "",
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

    const { title, description, photoIds } = await req.json();

    if (!title || typeof title !== "string")
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });

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
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
