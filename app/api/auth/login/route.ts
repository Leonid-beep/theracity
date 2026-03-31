import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcrypt";
import { prisma } from "@/app/lib/prisma";
import { isAdminUserEmail } from "@/app/lib/admin";
import { setAuthCookie } from "@/app/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    console.log("[/api/auth/login] entered login route");

    const { login, password } = await req.json();
    console.log("[/api/auth/login] parsed body", { hasLogin: !!login, hasPassword: !!password });

    if (!login || !password)
      return NextResponse.json(
        { errors: ["Заполните все поля"] },
        { status: 400 },
      );

    const trimmed = String(login).trim();
    const asEmail = trimmed.toLowerCase();

    console.log("[/api/auth/login] prisma user lookup started", { trimmed, asEmail });
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
    console.log("[/api/auth/login] prisma user lookup finished", { found: !!user });

    if (!user) {
      console.log("[/api/auth/login] user not found", { trimmed, asEmail });
      return NextResponse.json(
        { errors: ["Неверный логин или пароль"] },
        { status: 401 },
      );
    }

    console.log("[/api/auth/login] user found", { userId: user.id, username: user.username });

    console.log("[/api/auth/login] bcrypt compare started", { userId: user.id });
    const valid = await compare(password, user.passwordHash);
    console.log("[/api/auth/login] bcrypt compare finished", { userId: user.id, valid });
    if (!valid) {
      console.log("[/api/auth/login] invalid password", { userId: user.id });
      return NextResponse.json(
        { errors: ["Неверный логин или пароль"] },
        { status: 401 },
      );
    }

    console.log("[/api/auth/login] token/session creation started", { userId: user.id });
    await setAuthCookie({ userId: user.id, username: user.username });
    console.log("[/api/auth/login] token/session creation finished", { userId: user.id });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: isAdminUserEmail(user.email),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("[/api/auth/login] unhandled error", {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("[/api/auth/login] unhandled non-error value", { error });
    }
    return NextResponse.json(
      { errors: ["Внутренняя ошибка сервера"] },
      { status: 500 },
    );
  }
}
