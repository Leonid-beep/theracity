import nodemailer from "nodemailer";

export const AUTH_CODE_TTL_MS = 15 * 60 * 1000;

export function createSixDigitAuthCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendAuthCodeEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transport.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}
