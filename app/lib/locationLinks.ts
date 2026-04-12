type CoordinatePair = {
  lat: number;
  lng: number;
};

const EARTH_RADIUS_KM = 6371;
const ROUTE_IMPROVEMENT_EPSILON = 0.000001;
const YANDEX_MAPS_ZOOM = "17";

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

function serializeCoordinatePair(
  coords: CoordinatePair,
  order: "lng-lat" | "lat-lng" = "lng-lat",
): string {
  if (order === "lat-lng") {
    return `${coords.lat},${coords.lng}`;
  }

  return `${coords.lng},${coords.lat}`;
}

function buildYandexPointParams(coords: CoordinatePair): URLSearchParams {
  const point = serializeCoordinatePair(coords);

  return new URLSearchParams({
    ll: point,
    z: YANDEX_MAPS_ZOOM,
    l: "map",
    mode: "whatshere",
    "whatshere[point]": point,
    "whatshere[zoom]": YANDEX_MAPS_ZOOM,
  });
}

function dedupeCoordinatePairs(coords: CoordinatePair[]): CoordinatePair[] {
  const seen = new Set<string>();

  return coords.filter((coordsItem) => {
    const key = `${coordsItem.lat},${coordsItem.lng}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getDistanceKm(a: CoordinatePair, b: CoordinatePair): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const haversine =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

function getPathDistance(coords: CoordinatePair[]): number {
  let total = 0;

  for (let index = 1; index < coords.length; index += 1) {
    total += getDistanceKm(coords[index - 1], coords[index]);
  }

  return total;
}

function buildNearestNeighborPath(
  points: CoordinatePair[],
  startIndex: number,
): CoordinatePair[] {
  const remaining = new Set(points.map((_, index) => index));
  const ordered: CoordinatePair[] = [];
  let currentIndex = startIndex;

  while (remaining.size > 0) {
    ordered.push(points[currentIndex]);
    remaining.delete(currentIndex);

    if (remaining.size === 0) break;

    let nextIndex = -1;
    let minDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((candidateIndex) => {
      const distance = getDistanceKm(points[currentIndex], points[candidateIndex]);

      if (distance < minDistance) {
        minDistance = distance;
        nextIndex = candidateIndex;
      }
    });

    currentIndex = nextIndex;
  }

  return ordered;
}

function reverseSegment(
  points: CoordinatePair[],
  startIndex: number,
  endIndex: number,
): CoordinatePair[] {
  return [
    ...points.slice(0, startIndex),
    ...points.slice(startIndex, endIndex + 1).reverse(),
    ...points.slice(endIndex + 1),
  ];
}

function improvePathWithTwoOpt(points: CoordinatePair[]): CoordinatePair[] {
  if (points.length < 4) return points;

  let best = points.slice();
  let improved = true;

  while (improved) {
    improved = false;
    const bestDistance = getPathDistance(best);

    for (let startIndex = 0; startIndex < best.length - 2; startIndex += 1) {
      for (let endIndex = startIndex + 1; endIndex < best.length; endIndex += 1) {
        const candidate = reverseSegment(best, startIndex, endIndex);
        const candidateDistance = getPathDistance(candidate);

        if (candidateDistance + ROUTE_IMPROVEMENT_EPSILON < bestDistance) {
          best = candidate;
          improved = true;
          break;
        }
      }

      if (improved) break;
    }
  }

  return best;
}

function optimizeRoutePoints(points: CoordinatePair[]): CoordinatePair[] {
  if (points.length <= 2) return points;

  let best = points.slice();
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let startIndex = 0; startIndex < points.length; startIndex += 1) {
    const candidate = improvePathWithTwoOpt(buildNearestNeighborPath(points, startIndex));
    const candidateDistance = getPathDistance(candidate);

    if (candidateDistance < bestDistance) {
      best = candidate;
      bestDistance = candidateDistance;
    }
  }

  return best;
}

export function buildYandexMapsUrl(coords: CoordinatePair | null): string | null {
  if (!coords) return null;
  return `https://yandex.ru/maps/?${buildYandexPointParams(coords).toString()}`;
}

export function buildYandexMapsRouteUrl(
  coords: CoordinatePair[] | null | undefined,
): string | null {
  const normalized = dedupeCoordinatePairs(
    (coords ?? []).filter(
      (coordsItem): coordsItem is CoordinatePair => coordsItem !== null && coordsItem !== undefined,
    ),
  );

  if (normalized.length === 0) return null;
  if (normalized.length === 1) return buildYandexMapsUrl(normalized[0]);

  // Approximate the shortest order locally, then let Yandex rebuild it as a pedestrian route.
  const optimized = optimizeRoutePoints(normalized);
  const params = new URLSearchParams({
    mode: "routes",
    rtext: optimized
      .map((coordsItem) => serializeCoordinatePair(coordsItem, "lat-lng"))
      .join("~"),
    rtt: "pd",
    rtm: "atm",
  });

  return `https://yandex.ru/maps/?${params.toString()}`;
}

export function buildYandexMapsUrlFromString(value: string | null | undefined): string | null {
  return buildYandexMapsUrl(parseCoordinatePair(value));
}

export function buildYandexMapsRouteUrlFromStrings(
  values: Array<string | null | undefined>,
): string | null {
  return buildYandexMapsRouteUrl(
    values
      .map((value) => parseCoordinatePair(value))
      .filter((coords): coords is CoordinatePair => coords !== null),
  );
}

export function buildRouteShareUrl(routeId: string, origin: string): string {
  return `${origin}/routes?routeId=${encodeURIComponent(routeId)}`;
}

export function buildPhotoShareUrl(photoId: string, origin: string): string {
  return `${origin}/gallery?photoId=${encodeURIComponent(photoId)}`;
}

async function copyShareLink(url: string): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Window is unavailable");
  }

  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard is unavailable");
  }

  await navigator.clipboard.writeText(url);
  return url;
}

export async function copyRouteShareLink(routeId: string): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Window is unavailable");
  }

  return copyShareLink(buildRouteShareUrl(routeId, window.location.origin));
}

export async function copyPhotoShareLink(photoId: string): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Window is unavailable");
  }

  return copyShareLink(buildPhotoShareUrl(photoId, window.location.origin));
}
