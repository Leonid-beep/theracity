import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { isAdminUserEmail } from "@/app/lib/admin";
import { applyAuthCookie } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, email, password, confirmPassword } = await req.json();

    const usernameTrim = String(username ?? "").trim();
    const emailNorm = String(email ?? "").trim().toLowerCase();

    const errors: string[] = [];

    if (!usernameTrim || usernameTrim.length < 3)
      errors.push("Имя пользователя должно содержать минимум 3 символа");
    if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm))
      errors.push("Некорректный формат email");
    if (!password || password.length < 6)
      errors.push("Пароль должен содержать минимум 6 символов");
    if (password !== confirmPassword)
      errors.push("Пароли не совпадают");

    if (errors.length > 0)
      return NextResponse.json({ errors }, { status: 400 });

    const [emailTaken, usernameTaken] = await Promise.all([
      prisma.user.findFirst({
        where: { email: { equals: emailNorm, mode: "insensitive" } },
      }),
      prisma.user.findFirst({
        where: { username: { equals: usernameTrim, mode: "insensitive" } },
      }),
    ]);

    const fieldErrors: { email?: string; username?: string } = {};
    if (emailTaken) fieldErrors.email = "Этот email уже зарегистрирован";
    if (usernameTaken) fieldErrors.username = "Этот никнейм уже занят";

    if (Object.keys(fieldErrors).length > 0)
      return NextResponse.json({ errors: [], fieldErrors }, { status: 409 });

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: { username: usernameTrim, email: emailNorm, passwordHash },
    });

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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const targets = e.meta?.target;
      const t = Array.isArray(targets) ? targets.join(",") : String(targets ?? "");
      const fieldErrors: { email?: string; username?: string } = {};
      if (t.includes("email")) fieldErrors.email = "Этот email уже зарегистрирован";
      if (t.includes("username")) fieldErrors.username = "Этот никнейм уже занят";
      if (Object.keys(fieldErrors).length > 0)
        return NextResponse.json({ errors: [], fieldErrors }, { status: 409 });
    }
    return NextResponse.json(
      { errors: ["Внутренняя ошибка сервера"] },
      { status: 500 },
    );
  }
}
