import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ ids: [] });

    const favs = await prisma.favoriteRoute.findMany({
      where: { userId: session.userId },
      select: { routeId: true },
    });

    return NextResponse.json({ ids: favs.map((f) => f.routeId) });
  } catch {
    return NextResponse.json({ ids: [] });
  }
}
