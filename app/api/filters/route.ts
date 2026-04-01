import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  DEFAULT_ATMOSPHERES,
  DEFAULT_MOODS,
  DEFAULT_SPACE_TYPES,
  PETERSBURG_METRO_STATIONS,
  mergeOptionLists,
  parseStoredMultiValue,
} from "@/app/lib/photoMetadata";

export async function GET() {
  try {
    const photos = await prisma.photo.findMany({
      select: {
        metro: true,
        spaceType: true,
        mood: true,
        atmosphere: true,
      },
    });

    return NextResponse.json({
      metro: mergeOptionLists(
        PETERSBURG_METRO_STATIONS,
        photos.flatMap((photo) => parseStoredMultiValue(photo.metro)),
      ),
      spaceType: mergeOptionLists(
        DEFAULT_SPACE_TYPES,
        photos.flatMap((photo) => parseStoredMultiValue(photo.spaceType)),
      ),
      mood: mergeOptionLists(
        DEFAULT_MOODS,
        photos.flatMap((photo) => parseStoredMultiValue(photo.mood)),
      ),
      atmosphere: mergeOptionLists(
        DEFAULT_ATMOSPHERES,
        photos.flatMap((photo) => parseStoredMultiValue(photo.atmosphere)),
      ),
    });
  } catch {
    return NextResponse.json({
      metro: PETERSBURG_METRO_STATIONS,
      spaceType: DEFAULT_SPACE_TYPES,
      mood: DEFAULT_MOODS,
      atmosphere: DEFAULT_ATMOSPHERES,
    });
  }
}
