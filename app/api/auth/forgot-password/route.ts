import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  AUTH_CODE_TTL_MS,
  createSixDigitAuthCode,
  sendAuthCodeEmail,
} from "@/app/lib/authEmail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json())?.email;
    const emailNorm = String(raw ?? "").trim().toLowerCase();

    const user = emailNorm
      ? await prisma.user.findFirst({
          where: { email: { equals: emailNorm, mode: "insensitive" } },
        })
      : null;

    if (user) {
      const code = createSixDigitAuthCode();
      const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS);

      await prisma.passwordReset.create({
        data: { userId: user.id, code, expiresAt },
      });

      await sendAuthCodeEmail({
        to: user.email,
        subject: "Восстановление пароля — TheraCity",
        text: `Ваш код восстановления: ${code}\n\nКод действителен 15 минут.`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
