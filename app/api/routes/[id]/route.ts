import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

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
    if (route.createdById !== session.userId)
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

    await prisma.route.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
