"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./PhotoMap.module.css";
import type { PhotoItem } from "../page";
import { getOptimizedPhotoUrl } from "@/app/ui/optimizedPhotoUrl";

type PositionedPhoto = {
  coords: [number, number];
  photo: PhotoItem;
};

type WindowWithYMaps = Window & {
  ymaps?: any;
};

const YANDEX_MAPS_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? "";
const YANDEX_MAPS_SCRIPT_ID = "theracity-yandex-maps-api";
const DESKTOP_MARKER_SIZE = 64;
const MOBILE_MARKER_SIZE = 44;
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

function getMarkerSize(): number {
  if (typeof window === "undefined") return DESKTOP_MARKER_SIZE;
  return window.innerWidth <= 700 ? MOBILE_MARKER_SIZE : DESKTOP_MARKER_SIZE;
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
  const mapRootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const [loadState, setLoadState] = useState<"idle" | "ready" | "error" | "missing-key">(
    "idle",
  );

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

        const markerSize = getMarkerSize();

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
            },
            {
              iconLayout: "default#image",
              iconImageHref: getOptimizedPhotoUrl(photo.src, markerSize * 2, 70),
              iconImageSize: [markerSize, markerSize],
              iconImageOffset: [-markerSize / 2, -markerSize / 2],
              iconShape: {
                type: "Rectangle",
                coordinates: [
                  [0, 0],
                  [markerSize, markerSize],
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
  }, [mapPhotos, onSelectPhoto]);

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
      <section className={styles.section} aria-label="Карта фотографий">
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
      <section className={styles.section} aria-label="Карта фотографий">
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
    <section className={styles.section} aria-label="Карта фотографий">
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

        {loadState !== "missing-key" && loadState !== "error" ? (
          <div ref={mapRootRef} className={styles.canvas} />
        ) : null}
      </div>
    </section>
  );
}
