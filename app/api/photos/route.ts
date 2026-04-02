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

function getSelectedValues(sp: URLSearchParams, key: FilterKey): string[] {
  return (sp.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    console.log("[/api/photos] entered photos route");

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

    console.log("[/api/photos] parsed query params", {
      page,
      pageSize,
      includeAll,
      filters,
      raw: Object.fromEntries(sp.entries()),
    });

    console.log("[/api/photos] prisma query started", { filters, page, pageSize });
    const allPhotos = await prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
    });

    const filteredPhotos = allPhotos.filter((photo) =>
      matchesSelectedValues(photo.metro, filters.metro) &&
      matchesSelectedValues(photo.spaceType, filters.spaceType) &&
      matchesSelectedValues(photo.mood, filters.mood) &&
      matchesSelectedValues(photo.atmosphere, filters.atmosphere),
    );

    const total = filteredPhotos.length;
    const photos = includeAll
      ? filteredPhotos
      : filteredPhotos.slice((page - 1) * pageSize, page * pageSize);
    console.log("[/api/photos] prisma query finished", {
      total,
      page,
      pageSize,
      includeAll,
      returned: photos.length,
    });

    console.log("[/api/photos] photo count", { count: photos.length });

    console.log("[/api/photos] photo url mapping started");
    const withUrls = photos.map((photo) => ({
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
    console.log("[/api/photos] photo url mapping finished", { count: withUrls.length });

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

    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[/api/photos] POST entered photos route");

    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    if (!user || !isAdminUserEmail(user.email)) {
      return NextResponse.json({ error: "Нет прав на загрузку" }, { status: 403 });
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

    console.log("[/api/photos] POST parsed form data", {
      hasFile: !!file,
      hasTitle: !!title,
      metroCount: metro.length,
      lat,
      lng,
      spaceTypeCount: spaceType.length,
      moodCount: mood.length,
      atmosphereCount: atmosphere.length,
      fileSize: file?.size,
      fileType: file?.type,
    });

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
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
    }

    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Допустимые форматы: JPEG, PNG, WebP" },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      return NextResponse.json(
        {
          error: `Максимальный размер файла для серверной загрузки: ${MAX_UPLOAD_FILE_LABEL}`,
        },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const s3Key = `photos/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("[/api/photos] POST upload to S3 started", {
      s3Key,
      fileType: file.type,
      fileSize: file.size,
    });
    await uploadToS3(s3Key, buffer, file.type);
    console.log("[/api/photos] POST upload to S3 finished", { s3Key });

    console.log("[/api/photos] POST prisma create started");
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
    console.log("[/api/photos] POST prisma create finished", { photoId: photo.id });

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

    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
