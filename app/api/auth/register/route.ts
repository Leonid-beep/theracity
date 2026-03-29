import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import { prisma } from "@/app/lib/prisma";
import { setAuthCookie } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, email, password, confirmPassword } = await req.json();

    const errors: string[] = [];

    if (!username || username.length < 3)
      errors.push("Имя пользователя должно содержать минимум 3 символа");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push("Некорректный формат email");
    if (!password || password.length < 6)
      errors.push("Пароль должен содержать минимум 6 символов");
    if (password !== confirmPassword)
      errors.push("Пароли не совпадают");

    if (errors.length > 0)
      return NextResponse.json({ errors }, { status: 400 });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      const field = existing.email === email ? "Email" : "Имя пользователя";
      return NextResponse.json(
        { errors: [`${field} уже занят`] },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, passwordHash },
    });

    await setAuthCookie({ userId: user.id, username: user.username });

    return NextResponse.json({
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch {
    return NextResponse.json(
      { errors: ["Внутренняя ошибка сервера"] },
      { status: 500 },
    );
  }
}
