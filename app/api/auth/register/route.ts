import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import {
  AUTH_CODE_TTL_MS,
  createSixDigitAuthCode,
  sendAuthCodeEmail,
} from "@/app/lib/authEmail";
import { MAX_USERNAME_LENGTH } from "@/app/lib/userValidation";

export const runtime = "nodejs";

async function sendEmailVerificationCode(user: { id: string; email: string }) {
  const code = createSixDigitAuthCode();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS);

  await prisma.$transaction([
    prisma.emailVerification.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    }),
    prisma.emailVerification.create({
      data: { userId: user.id, code, expiresAt },
    }),
  ]);

  await sendAuthCodeEmail({
    to: user.email,
    subject: "Подтверждение email — TheraCity",
    text: `Ваш код подтверждения email: ${code}\n\nКод действителен 15 минут.`,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { username, email, password, confirmPassword } = await req.json();

    const usernameTrim = String(username ?? "").trim();
    const emailNorm = String(email ?? "").trim().toLowerCase();

    const errors: string[] = [];

    if (!usernameTrim || usernameTrim.length < 3)
      errors.push("Имя пользователя должно содержать минимум 3 символа");
    if (usernameTrim.length > MAX_USERNAME_LENGTH)
      errors.push(`Имя пользователя должно быть не длиннее ${MAX_USERNAME_LENGTH} символов`);
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
    if (emailTaken?.emailVerified) fieldErrors.email = "Этот email уже зарегистрирован";
    if (usernameTaken && usernameTaken.id !== emailTaken?.id)
      fieldErrors.username = "Этот никнейм уже занят";

    if (Object.keys(fieldErrors).length > 0)
      return NextResponse.json({ errors: [], fieldErrors }, { status: 409 });

    const passwordHash = await hash(password, 12);
    const user =
      emailTaken && !emailTaken.emailVerified
        ? await prisma.user.update({
            where: { id: emailTaken.id },
            data: {
              username: usernameTrim,
              passwordHash,
              emailVerified: false,
              emailVerifiedAt: null,
            },
          })
        : await prisma.user.create({
            data: { username: usernameTrim, email: emailNorm, passwordHash },
          });

    try {
      await sendEmailVerificationCode(user);
    } catch {
      return NextResponse.json(
        { errors: ["Не удалось отправить код подтверждения"] },
        { status: 500 },
      );
    }

    return NextResponse.json({
      verificationRequired: true,
      email: user.email,
    });
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
