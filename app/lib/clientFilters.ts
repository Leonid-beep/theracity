export type FilterOptions = {
  metro: string[];
  spaceType: string[];
  mood: string[];
  atmosphere: string[];
};

const EMPTY_FILTER_OPTIONS: FilterOptions = {
  metro: [],
  spaceType: [],
  mood: [],
  atmosphere: [],
};

let cachedFilterOptions: FilterOptions | null = null;
let filterOptionsPromise: Promise<FilterOptions> | null = null;

function normalizeFilterOptions(value: unknown): FilterOptions {
  if (!value || typeof value !== "object") {
    return EMPTY_FILTER_OPTIONS;
  }

  const data = value as Partial<Record<keyof FilterOptions, unknown>>;

  return {
    metro: Array.isArray(data.metro) ? data.metro.map(String) : [],
    spaceType: Array.isArray(data.spaceType) ? data.spaceType.map(String) : [],
    mood: Array.isArray(data.mood) ? data.mood.map(String) : [],
    atmosphere: Array.isArray(data.atmosphere) ? data.atmosphere.map(String) : [],
  };
}

export function getEmptyFilterOptions(): FilterOptions {
  return EMPTY_FILTER_OPTIONS;
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
  if (cachedFilterOptions) {
    return cachedFilterOptions;
  }

  if (!filterOptionsPromise) {
    filterOptionsPromise = fetch("/api/filters")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load filters");
        }

        return normalizeFilterOptions(await response.json());
      })
      .then((data) => {
        cachedFilterOptions = data;
        return data;
      })
      .catch((error) => {
        filterOptionsPromise = null;
        throw error;
      });
  }

  return filterOptionsPromise;
}

export function invalidateFilterOptionsCache(): void {
  cachedFilterOptions = null;
  filterOptionsPromise = null;
}
