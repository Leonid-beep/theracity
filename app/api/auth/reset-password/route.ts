import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword, confirmPassword } = await req.json();
    const emailNorm = String(email ?? "").trim().toLowerCase();

    if (!newPassword || newPassword.length < 6)
      return NextResponse.json(
        { errors: ["Пароль должен содержать минимум 6 символов"] },
        { status: 400 },
      );

    if (newPassword !== confirmPassword)
      return NextResponse.json(
        { errors: ["Пароли не совпадают"] },
        { status: 400 },
      );

    const user = emailNorm
      ? await prisma.user.findFirst({
          where: { email: { equals: emailNorm, mode: "insensitive" } },
        })
      : null;
    if (!user)
      return NextResponse.json(
        { errors: ["Неверный код"] },
        { status: 400 },
      );

    const reset = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "desc" },
    });

    if (!reset)
      return NextResponse.json(
        { errors: ["Неверный или просроченный код"] },
        { status: 400 },
      );

    const passwordHash = await hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { errors: ["Внутренняя ошибка сервера"] },
      { status: 500 },
    );
  }
}
