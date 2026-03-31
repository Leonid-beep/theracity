/** Server-only: email пользователя с расширенными правами (загрузка фото, модерация). */
export function isAdminUserEmail(email: string | null | undefined): boolean {
  const configured = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!configured || !email) return false;
  return email.trim().toLowerCase() === configured;
}
