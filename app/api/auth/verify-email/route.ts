import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isAdminUserEmail } from "@/app/lib/admin";
import { applyAuthCookie } from "@/app/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    const emailNorm = String(email ?? "").trim().toLowerCase();
    const codeTrim = String(code ?? "").trim();

    if (!emailNorm || !codeTrim) {
      return NextResponse.json(
        { errors: ["Введите код подтверждения"] },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: emailNorm, mode: "insensitive" } },
    });

    if (!user) {
      return NextResponse.json(
        { errors: ["Неверный или просроченный код"] },
        { status: 400 },
      );
    }

    const verification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        code: codeTrim,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json(
        { errors: ["Неверный или просроченный код"] },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      prisma.emailVerification.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      }),
    ]);

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: isAdminUserEmail(user.email),
      },
    });
    await applyAuthCookie(response, { userId: user.id, username: user.username }, req);

    return response;
  } catch {
    return NextResponse.json(
      { errors: ["Внутренняя ошибка сервера"] },
      { status: 500 },
    );
  }
}
