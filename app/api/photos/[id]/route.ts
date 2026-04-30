import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl, deletePhoto } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminUserEmail } from "@/app/lib/admin";
import {
  parseStoredMultiValue,
  serializeMultiValue,
} from "@/app/lib/photoMetadata";

function normalizeMultiValueList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: { uploadedBy: { select: { username: true } } },
    });

    if (!photo) {
      return NextResponse.json({ error: "Фото не найдено" }, { status: 404 });
    }

    return NextResponse.json({
      photo: {
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
        uploaderUsername: photo.uploadedBy.username,
      },
    });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const photo = await prisma.photo.findUnique({ where: { id } });

    if (!photo) {
      return NextResponse.json({ error: "Фото не найдено" }, { status: 404 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    const isAdmin = isAdminUserEmail(actor?.email);

    if (!isAdmin && photo.uploadedById !== session.userId) {
      return NextResponse.json({ error: "Нет прав" }, { status: 403 });
    }

    const s3Key = photo.s3Key;

    await prisma.$transaction(async (tx) => {
      const links = await tx.routePhoto.findMany({
        where: { photoId: id },
        select: { routeId: true },
      });
      const routeIds = [...new Set(links.map((link) => link.routeId))];

      if (routeIds.length > 0) {
        await tx.routePhoto.deleteMany({ where: { photoId: id } });
        await tx.route.updateMany({
          where: {
            id: { in: routeIds },
            routePhotos: { none: {} },
          },
          data: {
            isPublished: false,
            publishedAt: null,
          },
        });
      }

      await tx.photo.delete({ where: { id } });
    });

    await deletePhoto(s3Key);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    const isAdmin = isAdminUserEmail(actor?.email);

    if (!isAdmin) {
      return NextResponse.json({ error: "Нет прав" }, { status: 403 });
    }

    const { id } = await params;
    const photo = await prisma.photo.findUnique({ where: { id } });

    if (!photo) {
      return NextResponse.json({ error: "Фото не найдено" }, { status: 404 });
    }

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const metro = normalizeMultiValueList(body.metro);
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const spaceType = normalizeMultiValueList(body.spaceType);
    const mood = normalizeMultiValueList(body.mood);
    const atmosphere = normalizeMultiValueList(body.atmosphere);

    if (
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

    const updated = await prisma.photo.update({
      where: { id },
      data: {
        title,
        metro: serializeMultiValue(metro),
        lat,
        lng,
        spaceType: serializeMultiValue(spaceType),
        mood: serializeMultiValue(mood),
        atmosphere: serializeMultiValue(atmosphere),
      },
      include: { uploadedBy: { select: { username: true } } },
    });

    return NextResponse.json({
      photo: {
        id: updated.id,
        src: getProxyPhotoUrl(updated.s3Key),
        title: updated.title,
        metro: parseStoredMultiValue(updated.metro),
        coords: `${updated.lat}, ${updated.lng}`,
        lat: updated.lat,
        lng: updated.lng,
        spaceType: parseStoredMultiValue(updated.spaceType),
        mood: parseStoredMultiValue(updated.mood),
        atmosphere: parseStoredMultiValue(updated.atmosphere),
        uploaderUsername: updated.uploadedBy.username,
      },
    });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
