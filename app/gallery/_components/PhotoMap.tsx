"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./PhotoMap.module.css";
import type { PhotoItem } from "../page";
import { getOptimizedPhotoUrl } from "@/app/ui/optimizedPhotoUrl";

type PositionedPhoto = {
  coords: [number, number];
  photo: PhotoItem;
};

type MarkerDimensions = {
  width: number;
  height: number;
  radius: number;
};

type WindowWithYMaps = Window & {
  ymaps?: any;
};

const YANDEX_MAPS_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? "";
const YANDEX_MAPS_SCRIPT_ID = "theracity-yandex-maps-api";
const DESKTOP_MARKER_DIMENSIONS: MarkerDimensions = {
  width: 72,
  height: 96,
  radius: 12,
};
const MOBILE_MARKER_DIMENSIONS: MarkerDimensions = {
  width: 50,
  height: 67,
  radius: 10,
};
const DUPLICATE_POINT_RADIUS = 0.00018;

let yandexMapsPromise: Promise<any> | null = null;

function loadYandexMaps(apiKey: string): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is unavailable"));
  }

  const currentWindow = window as WindowWithYMaps;
  if (currentWindow.ymaps?.ready) {
    return new Promise((resolve) => {
      currentWindow.ymaps.ready(() => resolve(currentWindow.ymaps));
    });
  }

  if (yandexMapsPromise) {
    return yandexMapsPromise;
  }

  yandexMapsPromise = new Promise((resolve, reject) => {
    const finishLoading = () => {
      const nextWindow = window as WindowWithYMaps;
      if (!nextWindow.ymaps?.ready) {
        yandexMapsPromise = null;
        reject(new Error("Yandex Maps API is unavailable"));
        return;
      }

      nextWindow.ymaps.ready(() => resolve(nextWindow.ymaps));
    };

    const existingScript = document.getElementById(
      YANDEX_MAPS_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", finishLoading, { once: true });
      existingScript.addEventListener(
        "error",
        () => {
          yandexMapsPromise = null;
          reject(new Error("Yandex Maps API failed to load"));
        },
        { once: true },
      );

      if ((existingScript.dataset.loaded ?? "") === "true") {
        finishLoading();
      }

      return;
    }

    const script = document.createElement("script");
    script.id = YANDEX_MAPS_SCRIPT_ID;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      finishLoading();
    };
    script.onerror = () => {
      yandexMapsPromise = null;
      reject(new Error("Yandex Maps API failed to load"));
    };
    document.head.appendChild(script);
  });

  return yandexMapsPromise;
}

function getMarkerDimensions(): MarkerDimensions {
  if (typeof window === "undefined") return DESKTOP_MARKER_DIMENSIONS;
  return window.innerWidth <= 700 ? MOBILE_MARKER_DIMENSIONS : DESKTOP_MARKER_DIMENSIONS;
}

function shouldUseWheelZoom(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function createMarkerLayout(ymaps: any, markerDimensions: MarkerDimensions) {
  const markerLayout = ymaps.templateLayoutFactory.createClass(
    `
      <div
        class="${styles.marker}"
        style="width:${markerDimensions.width}px;height:${markerDimensions.height}px;border-radius:${markerDimensions.radius}px;"
      >
        <div
          class="${styles.markerImage}"
          style="border-radius:${Math.max(markerDimensions.radius - 2, 0)}px;"
        ></div>
      </div>
    `,
    {
      build(this: any) {
        markerLayout.superclass.build.call(this);

        const element = this.getElement() as HTMLElement | null;
        const imageElement = element?.querySelector(`.${styles.markerImage}`) as HTMLElement | null;
        const iconHref = this.getData().properties.get("iconHref");
        const iconAlt = this.getData().properties.get("iconAlt");

        if (element && iconAlt) {
          element.setAttribute("aria-label", iconAlt);
          element.title = iconAlt;
        }

        if (imageElement && iconHref) {
          imageElement.style.backgroundImage = `url("${iconHref}")`;
        }
      },
    },
  );

  return markerLayout;
}

function createDuplicateAwarePositions(photos: PhotoItem[]): PositionedPhoto[] {
  const groups = new Map<string, PhotoItem[]>();

  photos.forEach((photo) => {
    const key = `${photo.lat.toFixed(6)}:${photo.lng.toFixed(6)}`;
    const current = groups.get(key) ?? [];
    current.push(photo);
    groups.set(key, current);
  });

  const positioned: PositionedPhoto[] = [];

  groups.forEach((group) => {
    if (group.length === 1) {
      positioned.push({
        photo: group[0],
        coords: [group[0].lat, group[0].lng],
      });
      return;
    }

    group.forEach((photo, index) => {
      const ring = Math.floor(index / 8);
      const indexInRing = index % 8;
      const pointsInRing = Math.min(8, group.length - ring * 8);
      const angle = (2 * Math.PI * indexInRing) / pointsInRing;
      const radius = DUPLICATE_POINT_RADIUS * (ring + 1);
      const latOffset = Math.sin(angle) * radius;
      const lngOffset =
        (Math.cos(angle) * radius) /
        Math.max(Math.cos((photo.lat * Math.PI) / 180), 0.35);

      positioned.push({
        photo,
        coords: [photo.lat + latOffset, photo.lng + lngOffset],
      });
    });
  });

  return positioned;
}

function getBounds(points: [number, number][]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;

  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLng = points[0][1];
  let maxLng = points[0][1];

  points.forEach(([lat, lng]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

export default function PhotoMap({
  photos,
  onSelectPhoto,
}: {
  photos: PhotoItem[];
  onSelectPhoto: (photo: PhotoItem) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const mapRootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const [markerDimensions, setMarkerDimensions] = useState<MarkerDimensions>(() =>
    getMarkerDimensions(),
  );
  const [allowWheelZoom, setAllowWheelZoom] = useState<boolean>(() => shouldUseWheelZoom());
  const [loadState, setLoadState] = useState<"idle" | "ready" | "error" | "missing-key">(
    "idle",
  );
  const [shouldInitMap, setShouldInitMap] = useState(false);

  const mapPhotos = useMemo(
    () =>
      createDuplicateAwarePositions(
        photos.filter(
          (photo) => Number.isFinite(photo.lat) && Number.isFinite(photo.lng),
        ),
      ),
    [photos],
  );

  useEffect(() => {
    if (mapPhotos.length === 0) {
      setShouldInitMap(false);
      return;
    }

    if (shouldInitMap || typeof IntersectionObserver === "undefined") {
      setShouldInitMap(true);
      return;
    }

    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldInitMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [mapPhotos.length, shouldInitMap]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewportSettings = () => {
      setMarkerDimensions(getMarkerDimensions());
      setAllowWheelZoom(shouldUseWheelZoom());
    };

    updateViewportSettings();
    window.addEventListener("resize", updateViewportSettings);

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    mediaQuery.addEventListener?.("change", updateViewportSettings);

    return () => {
      window.removeEventListener("resize", updateViewportSettings);
      mediaQuery.removeEventListener?.("change", updateViewportSettings);
    };
  }, []);

  useEffect(() => {
    if (!shouldInitMap) {
      return;
    }

    if (!YANDEX_MAPS_API_KEY) {
      setLoadState("missing-key");
      return;
    }

    if (!mapRootRef.current || mapPhotos.length === 0) {
      return;
    }

    let cancelled = false;

    const buildMap = async () => {
      try {
        const ymaps = await loadYandexMaps(YANDEX_MAPS_API_KEY);
        if (cancelled || !mapRootRef.current) return;

        const currentMarkerLayout = createMarkerLayout(ymaps, markerDimensions);

        if (!mapRef.current) {
          mapRef.current = new ymaps.Map(
            mapRootRef.current,
            {
              center: mapPhotos[0].coords,
              zoom: mapPhotos.length > 1 ? 12 : 15,
              controls: ["zoomControl"],
            },
            {
              searchControlProvider: "yandex#search",
              suppressMapOpenBlock: true,
              yandexMapDisablePoiInteractivity: true,
              autoFitToViewport: "ifNull",
            },
          );
        }

        if (allowWheelZoom) {
          mapRef.current.behaviors.enable("scrollZoom");
        } else {
          mapRef.current.behaviors.disable("scrollZoom");
        }

        markerRefs.current.forEach((marker) => {
          mapRef.current?.geoObjects.remove(marker);
        });
        markerRefs.current = [];

        mapPhotos.forEach(({ photo, coords }) => {
          const placemark = new ymaps.Placemark(
            coords,
            {
              hintContent: photo.title,
              iconHref: getOptimizedPhotoUrl(photo.src, markerDimensions.width * 2, 78),
              iconAlt: photo.title || "Фото на карте",
            },
            {
              iconLayout: currentMarkerLayout,
              iconOffset: [-markerDimensions.width / 2, -markerDimensions.height / 2],
              iconShape: {
                type: "Rectangle",
                coordinates: [
                  [0, 0],
                  [markerDimensions.width, markerDimensions.height],
                ],
              },
              hideIconOnBalloonOpen: false,
            },
          );

          placemark.events.add("click", () => onSelectPhoto(photo));
          mapRef.current.geoObjects.add(placemark);
          markerRefs.current.push(placemark);
        });

        if (mapPhotos.length === 1) {
          mapRef.current.setCenter(mapPhotos[0].coords, 15);
        } else {
          const bounds = getBounds(mapPhotos.map((item) => item.coords));
          if (bounds) {
            mapRef.current.setBounds(bounds, {
              checkZoomRange: true,
            });
          }
        }

        mapRef.current.container.fitToViewport();
        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setLoadState("error");
        }
      }
    };

    void buildMap();

    return () => {
      cancelled = true;
    };
  }, [allowWheelZoom, mapPhotos, markerDimensions, onSelectPhoto, shouldInitMap]);

  useEffect(() => {
    if (!mapRootRef.current || loadState !== "ready" || !allowWheelZoom) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
    };

    const mapRoot = mapRootRef.current;
    mapRoot.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      mapRoot.removeEventListener("wheel", handleWheel);
    };
  }, [allowWheelZoom, loadState]);

  useEffect(() => {
    if (!mapRootRef.current || !mapRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      mapRef.current?.container.fitToViewport();
    });

    observer.observe(mapRootRef.current);

    return () => observer.disconnect();
  }, [loadState]);

  useEffect(() => {
    return () => {
      markerRefs.current = [];
      mapRef.current?.destroy?.();
      mapRef.current = null;
    };
  }, []);

  if (photos.length === 0) {
    return (
      <section ref={sectionRef} className={styles.section} aria-label="Карта фотографий">
        <h2 className={styles.title}>
          <span className={styles.mark}>Карта</span> фотографий
        </h2>
        <div className={styles.card}>
          <div className={styles.status}>Пока нет фотографий, которые можно показать на карте.</div>
        </div>
      </section>
    );
  }

  if (mapPhotos.length === 0) {
    return (
      <section ref={sectionRef} className={styles.section} aria-label="Карта фотографий">
        <h2 className={styles.title}>
          <span className={styles.mark}>Карта</span> фотографий
        </h2>
        <div className={styles.card}>
          <div className={styles.status}>У этих фотографий пока нет координат для карты.</div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={styles.section} aria-label="Карта фотографий">
      <h2 className={styles.title}>
        <span className={styles.mark}>Карта</span> фотографий
      </h2>

      <div className={styles.card}>
        {loadState === "missing-key" ? (
          <div className={styles.status}>
            Для отображения карты добавьте `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`.
          </div>
        ) : null}

        {loadState === "error" ? (
          <div className={styles.status}>Не удалось загрузить Яндекс.Карту.</div>
        ) : null}

        {loadState !== "missing-key" && loadState !== "error" && shouldInitMap ? (
          <div ref={mapRootRef} className={styles.canvas} />
        ) : null}

        {!shouldInitMap ? <div className={styles.canvas} aria-hidden="true" /> : null}
      </div>
    </section>
  );
}
