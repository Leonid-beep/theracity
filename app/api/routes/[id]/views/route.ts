import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await prisma.route.updateMany({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Маршрут не найден" }, { status: 404 });
    }

    const route = await prisma.route.findUnique({
      where: { id },
      select: { viewCount: true },
    });

    return NextResponse.json({ viewCount: route?.viewCount ?? 0 });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
