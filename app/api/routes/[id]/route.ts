import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminUserEmail } from "@/app/lib/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { id } = await params;

    const route = await prisma.route.findUnique({ where: { id } });
    if (!route)
      return NextResponse.json({ error: "Маршрут не найден" }, { status: 404 });

    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    const isAdmin = isAdminUserEmail(actor?.email);
    if (!isAdmin && route.createdById !== session.userId)
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

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
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { id } = await params;

    const route = await prisma.route.findUnique({
      where: { id },
      include: { routePhotos: { select: { photoId: true } } },
    });
    if (!route)
      return NextResponse.json({ error: "Маршрут не найден" }, { status: 404 });
    if (route.createdById !== session.userId)
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    if (route.routePhotos.length === 0)
      return NextResponse.json({ error: "Нельзя опубликовать пустой маршрут" }, { status: 400 });

    await prisma.route.update({
      where: { id },
      data: { isPublished: true },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
