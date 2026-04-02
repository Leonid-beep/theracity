type CoordinatePair = {
  lat: number;
  lng: number;
};

export function parseCoordinatePair(value: string | null | undefined): CoordinatePair | null {
  if (!value) return null;

  const [latRaw, lngRaw] = value.split(",").map((part) => part.trim());
  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return { lat, lng };
}

export function buildYandexMapsUrl(coords: CoordinatePair | null): string | null {
  if (!coords) return null;
  return `https://yandex.ru/maps/?pt=${coords.lng},${coords.lat}&z=17&l=map`;
}

export function buildYandexMapsUrlFromString(value: string | null | undefined): string | null {
  return buildYandexMapsUrl(parseCoordinatePair(value));
}

export function buildRouteShareUrl(routeId: string, origin: string): string {
  return `${origin}/routes?routeId=${encodeURIComponent(routeId)}`;
}

export async function copyRouteShareLink(routeId: string): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Window is unavailable");
  }

  const url = buildRouteShareUrl(routeId, window.location.origin);
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard is unavailable");
  }

  await navigator.clipboard.writeText(url);
  return url;
}
