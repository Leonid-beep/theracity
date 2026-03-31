import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcrypt";
import { prisma } from "@/app/lib/prisma";
import { isAdminUserEmail } from "@/app/lib/admin";
import { setAuthCookie } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();

    if (!login || !password)
      return NextResponse.json(
        { errors: ["Заполните все поля"] },
        { status: 400 },
      );

    const trimmed = String(login).trim();
    const asEmail = trimmed.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmed },
          { username: { equals: trimmed, mode: "insensitive" } },
          { email: trimmed },
          { email: { equals: asEmail, mode: "insensitive" } },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { errors: ["Неверный логин или пароль"] },
        { status: 401 },
      );
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { errors: ["Неверный логин или пароль"] },
        { status: 401 },
      );
    }

    await setAuthCookie({ userId: user.id, username: user.username });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: isAdminUserEmail(user.email),
      },
    });
  } catch {
    return NextResponse.json(
      { errors: ["Внутренняя ошибка сервера"] },
      { status: 500 },
    );
  }
}
