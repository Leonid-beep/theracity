export type RouteOption = {
  id: string;
  title: string;
  src: string;
  isEmpty: boolean;
};

let cachedRouteOptions: RouteOption[] | null = null;
let routeOptionsPromise: Promise<RouteOption[]> | null = null;

function normalizeRouteOptions(value: unknown): RouteOption[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const routes = Array.isArray((value as { routes?: unknown }).routes)
    ? ((value as { routes: unknown[] }).routes)
    : [];

  return routes.map((route) => {
    const item = route as { id?: unknown; title?: unknown; coverUrl?: unknown };
    const src = typeof item.coverUrl === "string" ? item.coverUrl : "";

    return {
      id: typeof item.id === "string" ? item.id : "",
      title: typeof item.title === "string" ? item.title : "",
      src,
      isEmpty: !src,
    };
  }).filter((route) => route.id);
}

export async function fetchRouteOptions(): Promise<RouteOption[]> {
  if (cachedRouteOptions) {
    return cachedRouteOptions;
  }

  if (!routeOptionsPromise) {
    routeOptionsPromise = fetch("/api/routes/my")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load routes");
        }

        return normalizeRouteOptions(await response.json());
      })
      .then((data) => {
        cachedRouteOptions = data;
        return data;
      })
      .catch((error) => {
        routeOptionsPromise = null;
        throw error;
      });
  }

  return routeOptionsPromise;
}

export function invalidateRouteOptionsCache(): void {
  cachedRouteOptions = null;
  routeOptionsPromise = null;
}
