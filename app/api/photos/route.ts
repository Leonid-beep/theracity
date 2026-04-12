import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl, uploadToS3 } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminUserEmail } from "@/app/lib/admin";
import {
  matchesSelectedValues,
  parseStoredMultiValue,
  serializeMultiValue,
} from "@/app/lib/photoMetadata";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_FILE_BYTES,
  MAX_UPLOAD_FILE_LABEL,
} from "@/app/lib/upload";

export const runtime = "nodejs";

type FilterKey = "metro" | "spaceType" | "mood" | "atmosphere";

const photoListSelect = {
  id: true,
  s3Key: true,
  title: true,
  metro: true,
  lat: true,
  lng: true,
  spaceType: true,
  mood: true,
  atmosphere: true,
} as const;

function getSelectedValues(sp: URLSearchParams, key: FilterKey): string[] {
  return (sp.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const includeAll = sp.get("all") === "1";
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 32));
    const filters = {
      metro: getSelectedValues(sp, "metro"),
      spaceType: getSelectedValues(sp, "spaceType"),
      mood: getSelectedValues(sp, "mood"),
      atmosphere: getSelectedValues(sp, "atmosphere"),
    };
    const hasFilters = Object.values(filters).some((selectedValues) => selectedValues.length > 0);

    const photos = hasFilters
      ? await prisma.photo.findMany({
          select: photoListSelect,
          orderBy: { createdAt: "desc" },
        })
      : await prisma.photo.findMany({
          select: photoListSelect,
          orderBy: { createdAt: "desc" },
          ...(includeAll
            ? {}
            : {
                skip: (page - 1) * pageSize,
                take: pageSize,
              }),
        });

    const filteredPhotos = hasFilters
      ? photos.filter((photo) =>
          matchesSelectedValues(photo.metro, filters.metro) &&
          matchesSelectedValues(photo.spaceType, filters.spaceType) &&
          matchesSelectedValues(photo.mood, filters.mood) &&
          matchesSelectedValues(photo.atmosphere, filters.atmosphere),
        )
      : photos;

    const pagedPhotos =
      hasFilters && !includeAll
        ? filteredPhotos.slice((page - 1) * pageSize, page * pageSize)
        : filteredPhotos;

    const total = hasFilters
      ? filteredPhotos.length
      : includeAll
        ? photos.length
        : await prisma.photo.count();

    const withUrls = pagedPhotos.map((photo) => ({
      id: photo.id,
      src: getProxyPhotoUrl(photo.s3Key),
      title: photo.title,
      metro: parseStoredMultiValue(photo.metro),
      coords: `${photo.lat}, ${photo.lng}`,
      lat: photo.lat,
      lng: photo.lng,
      spaceType: parseStoredMultiValue(photo.spaceType),
      mood: parseStoredMultiValue(photo.mood),
      atmosphere: parseStoredMultiValue(photo.atmosphere),
    }));

    return NextResponse.json({
      photos: withUrls,
      total,
      page: includeAll ? 1 : page,
      pageSize: includeAll ? total || withUrls.length : pageSize,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("[/api/photos] unhandled error in GET", {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("[/api/photos] unhandled non-error value in GET", { error });
    }

    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    if (!user || !isAdminUserEmail(user.email)) {
      return NextResponse.json({ error: "РќРµС‚ РїСЂР°РІ РЅР° Р·Р°РіСЂСѓР·РєСѓ" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const title = form.get("title") as string;
    const metro = form
      .getAll("metro")
      .map(String)
      .map((value) => value.trim())
      .filter(Boolean);
    const lat = parseFloat(form.get("lat") as string);
    const lng = parseFloat(form.get("lng") as string);
    const spaceType = form
      .getAll("spaceType")
      .map(String)
      .map((value) => value.trim())
      .filter(Boolean);
    const mood = form
      .getAll("mood")
      .map(String)
      .map((value) => value.trim())
      .filter(Boolean);
    const atmosphere = form
      .getAll("atmosphere")
      .map(String)
      .map((value) => value.trim())
      .filter(Boolean);

    if (
      !file ||
      !title ||
      !metro.length ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      !spaceType.length ||
      !mood.length ||
      !atmosphere.length
    ) {
      return NextResponse.json({ error: "Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ" }, { status: 400 });
    }

    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Р”РѕРїСѓСЃС‚РёРјС‹Рµ С„РѕСЂРјР°С‚С‹: JPEG, PNG, WebP" },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      return NextResponse.json(
        {
          error: `РњР°РєСЃРёРјР°Р»СЊРЅС‹Р№ СЂР°Р·РјРµСЂ С„Р°Р№Р»Р° РґР»СЏ СЃРµСЂРІРµСЂРЅРѕР№ Р·Р°РіСЂСѓР·РєРё: ${MAX_UPLOAD_FILE_LABEL}`,
        },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const s3Key = `photos/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadToS3(s3Key, buffer, file.type);

    const photo = await prisma.photo.create({
      data: {
        s3Key,
        title,
        metro: serializeMultiValue(metro),
        lat,
        lng,
        spaceType: serializeMultiValue(spaceType),
        mood: serializeMultiValue(mood),
        atmosphere: serializeMultiValue(atmosphere),
        uploadedById: session.userId,
      },
    });

    return NextResponse.json({
      photo: {
        id: photo.id,
        src: getProxyPhotoUrl(s3Key),
        title: photo.title,
        metro,
        coords: `${photo.lat}, ${photo.lng}`,
        lat: photo.lat,
        lng: photo.lng,
        spaceType,
        mood,
        atmosphere,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("[/api/photos] unhandled error in POST", {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("[/api/photos] unhandled non-error value in POST", { error });
    }

    return NextResponse.json({ error: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°" }, { status: 500 });
  }
}
