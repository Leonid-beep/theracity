import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const [metros, spaceTypes, moods, atmospheres] = await Promise.all([
      prisma.photo.findMany({ select: { metro: true }, distinct: ["metro"], orderBy: { metro: "asc" } }),
      prisma.photo.findMany({ select: { spaceType: true }, distinct: ["spaceType"], orderBy: { spaceType: "asc" } }),
      prisma.photo.findMany({ select: { mood: true }, distinct: ["mood"], orderBy: { mood: "asc" } }),
      prisma.photo.findMany({ select: { atmosphere: true }, distinct: ["atmosphere"], orderBy: { atmosphere: "asc" } }),
    ]);

    return NextResponse.json({
      metro: metros.map((m) => m.metro),
      spaceType: spaceTypes.map((s) => s.spaceType),
      mood: moods.map((m) => m.mood),
      atmosphere: atmospheres.map((a) => a.atmosphere),
    });
  } catch {
    return NextResponse.json({ metro: [], spaceType: [], mood: [], atmosphere: [] });
  }
}
