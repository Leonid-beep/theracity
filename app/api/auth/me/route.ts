import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { isAdminUserEmail } from "@/app/lib/admin";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, email: true },
  });

  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: { ...user, isAdmin: isAdminUserEmail(user.email) },
  });
}
