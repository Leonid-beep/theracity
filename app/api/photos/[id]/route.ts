import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getProxyPhotoUrl, deletePhoto } from "@/app/lib/s3";
import { getSessionUser } from "@/app/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo)
      return NextResponse.json({ error: "Фото не найдено" }, { status: 404 });

    return NextResponse.json({
      photo: {
        id: photo.id,
        src: getProxyPhotoUrl(photo.s3Key),
        title: photo.title,
        metro: photo.metro,
        coords: `${photo.lat}, ${photo.lng}`,
        lat: photo.lat,
        lng: photo.lng,
        spaceType: photo.spaceType,
        mood: photo.mood,
        atmosphere: photo.atmosphere,
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
    if (!session)
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { id } = await params;
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo)
      return NextResponse.json({ error: "Фото не найдено" }, { status: 404 });
    if (photo.uploadedById !== session.userId)
      return NextResponse.json({ error: "Нет прав" }, { status: 403 });

    await deletePhoto(photo.s3Key);
    await prisma.photo.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
