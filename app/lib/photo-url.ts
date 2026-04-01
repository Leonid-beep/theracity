import "server-only";

const PHOTO_ROUTE_PREFIX = "/api/photo";

export function encodePhotoKey(key: string): string {
  return Buffer.from(key, "utf8").toString("base64url");
}

export function decodePhotoKey(encodedKey: string): string {
  return Buffer.from(encodedKey, "base64url").toString("utf8");
}

export function getPhotoUrl(key: string): string {
  return `${PHOTO_ROUTE_PREFIX}/${encodePhotoKey(key)}`;
}
