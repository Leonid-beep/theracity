/** Server-only: emails пользователей с расширенными правами (загрузка фото, модерация). */
function normalizeEmails(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getConfiguredAdminEmails(): string[] {
  const fromList = normalizeEmails(process.env.ADMIN_EMAILS);
  const fromLegacy = normalizeEmails(process.env.ADMIN_EMAIL);
  return [...new Set([...fromList, ...fromLegacy])];
}

export function isAdminUserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getConfiguredAdminEmails().includes(email.trim().toLowerCase());
}
