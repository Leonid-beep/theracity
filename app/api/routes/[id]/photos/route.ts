import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { id: routeId } = await params;
    const { photoId } = await req.json();

    if (!photoId)
      return NextResponse.json({ error: "photoId обязателен" }, { status: 400 });

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route)
      return NextResponse.json({ error: "Маршрут не найден" }, { status: 404 });
    if (route.createdById !== session.userId)
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

    const existing = await prisma.routePhoto.findUnique({
      where: { routeId_photoId: { routeId, photoId } },
    });
    if (existing)
      return NextResponse.json({ ok: true, message: "Фото уже в маршруте" });

    const maxOrder = await prisma.routePhoto.aggregate({
      where: { routeId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    await prisma.routePhoto.create({
      data: { routeId, photoId, order: nextOrder },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
