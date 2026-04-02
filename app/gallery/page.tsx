"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./styles.module.css";
import { useAuth } from "@/app/providers/AuthProvider";
import { SuccessToast, useSuccessToast } from "@/app/ui/SuccessToast";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

const PhotoModals = dynamic(() => import("./_components/PhotoModals"), {
  ssr: false,
});
const UploadPhotoModal = dynamic(() => import("./_components/UploadPhotoModal"), {
  ssr: false,
});

function useGalleryBreakpoint() {
  const [pageSize, setPageSize] = useState(32);

  useEffect(() => {
    const calc = () => {
      const width = window.innerWidth;
      if (width <= 480) setPageSize(8);
      else if (width <= 700) setPageSize(16);
      else if (width <= 1024) setPageSize(25);
      else if (width <= 1440) setPageSize(32);
      else setPageSize(28);
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return pageSize;
}

export type PhotoItem = {
  id: string;
  src: string;
  title: string;
  metro: string[];
  coords: string;
  lat: number;
  lng: number;
  spaceType: string[];
  mood: string[];
  atmosphere: string[];
};

type Filters = {
  metro: string[];
  spaceType: string[];
  mood: string[];
  atmosphere: string[];
};

function isAllSelected(selected: string[], options: string[]): boolean {
  return options.length > 0 && selected.length === options.length;
}

function summarizeSelection(selected: string[], options: string[]): string {
  if (!selected.length) return "Выберите...";
  if (isAllSelected(selected, options)) return "Все";
  return selected.join(", ");
}

function buildFilterValue(selected: string[], options: string[]): string | null {
  if (!selected.length || !options.length || isAllSelected(selected, options)) {
    return null;
  }

  return selected.join(",");
}

function buildGallerySearch(filters: Record<string, string>, extras?: Record<string, string>) {
  return new URLSearchParams({
    ...filters,
    ...extras,
  });
}

export default function GalleryPage() {
  const pageSize = useGalleryBreakpoint();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const returnToGallery = "/gallery";

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [liked, setLiked] = useState<Set<string>>(() => new Set());

  const [filterOptions, setFilterOptions] = useState<Filters>({
    metro: [],
    spaceType: [],
    mood: [],
    atmosphere: [],
  });
  const [selMetro, setSelMetro] = useState<string[]>([]);
  const [selSpace, setSelSpace] = useState<string[]>([]);
  const [selMood, setSelMood] = useState<string[]>([]);
  const [selAtmo, setSelAtmo] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const [selected, setSelected] = useState<PhotoItem | null>(null);
  const { message: successMsg, showSuccess } = useSuccessToast();

  const filterRef = useRef<HTMLElement>(null);
  useCloseDetailsOnOutsideClick(filterRef, "gallery-filters");

  const requireAuth = useCallback(() => {
    if (authLoading) return;
    router.push(`/auth/login?returnTo=${encodeURIComponent(returnToGallery)}`);
  }, [authLoading, router]);

  const openPhoto = useCallback((photo: PhotoItem) => {
    setSelected(photo);
  }, []);

  useEffect(() => {
    fetch("/api/filters")
      .then((response) => response.json())
      .then((data: Filters) => {
        setFilterOptions(data);

        if (!filtersInitialized) {
          setSelMetro(data.metro);
          setSelSpace(data.spaceType);
          setSelMood(data.mood);
          setSelAtmo(data.atmosphere);
          setFiltersInitialized(true);
        }
      })
      .catch(() => {});
  }, [filtersInitialized]);

  useEffect(() => {
    fetch("/api/photos/favorites/ids")
      .then((response) => response.json())
      .then((data) => setLiked(new Set(data.ids ?? [])))
      .catch(() => {});
  }, []);

  const fetchPhotos = useCallback(
    async (nextPage: number, filters: Record<string, string>) => {
      setLoading(true);

      const pageSearch = buildGallerySearch(filters, {
        page: String(nextPage),
        pageSize: String(pageSize),
      });
      const allSearch = buildGallerySearch(filters, { all: "1" });

      try {
        const [pageResponse, allResponse] = await Promise.all([
          fetch(`/api/photos?${pageSearch}`),
          fetch(`/api/photos?${allSearch}`),
        ]);
        const [pageData, allData] = await Promise.all([
          pageResponse.json(),
          allResponse.json(),
        ]);
        setPhotos(pageData.photos ?? []);
        setAllPhotos(allData.photos ?? []);
        setTotal(pageData.total ?? 0);
      } catch {
        setPhotos([]);
        setAllPhotos([]);
        setTotal(0);
      }

      setLoading(false);
    },
    [pageSize],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPhotos(page, appliedFilters);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [page, appliedFilters, fetchPhotos]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const go = (nextPage: number) => {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
  };

  const pagesToShow = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const result: (number | "dots")[] = [1];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);

    if (left > 2) result.push("dots");

    for (let nextPage = left; nextPage <= right; nextPage += 1) {
      result.push(nextPage);
    }

    if (right < totalPages - 1) result.push("dots");
    result.push(totalPages);

    return result;
  }, [page, totalPages]);

  const handleApplyFilters = () => {
    if (!selMetro.length || !selSpace.length || !selMood.length || !selAtmo.length) {
      return;
    }

    const nextFilters: Record<string, string> = {};
    const metro = buildFilterValue(selMetro, filterOptions.metro);
    const spaceType = buildFilterValue(selSpace, filterOptions.spaceType);
    const mood = buildFilterValue(selMood, filterOptions.mood);
    const atmosphere = buildFilterValue(selAtmo, filterOptions.atmosphere);

    if (metro) nextFilters.metro = metro;
    if (spaceType) nextFilters.spaceType = spaceType;
    if (mood) nextFilters.mood = mood;
    if (atmosphere) nextFilters.atmosphere = atmosphere;

    setAppliedFilters(nextFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelMetro([]);
    setSelSpace([]);
    setSelMood([]);
    setSelAtmo([]);
    setAppliedFilters({});
    setPage(1);
  };

  const hasAppliedFilters = Object.keys(appliedFilters).length > 0;
  const canResetFilters =
    hasAppliedFilters ||
    selMetro.length > 0 ||
    selSpace.length > 0 ||
    selMood.length > 0 ||
    selAtmo.length > 0;
  const canFind =
    selMetro.length > 0 &&
    selSpace.length > 0 &&
    selMood.length > 0 &&
    selAtmo.length > 0;

  const toggleValue = (
    value: string,
    options: string[],
    setter: (updater: (prev: string[]) => string[]) => void,
  ) => {
    setter((prev) => {
      const next = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      return options.filter((option) => next.includes(option));
    });
  };

  const handlePhotoDeleted = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    setAllPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    setTotal((currentTotal) => Math.max(0, currentTotal - 1));
    setLiked((prev) => {
      const next = new Set(prev);
      next.delete(photoId);
      return next;
    });
    setSelected(null);
  }, []);

  const handlePhotoUpdated = useCallback((updatedPhoto: PhotoItem) => {
    setPhotos((prev) =>
      prev.map((photo) => (photo.id === updatedPhoto.id ? updatedPhoto : photo)),
    );
    setAllPhotos((prev) =>
      prev.map((photo) => (photo.id === updatedPhoto.id ? updatedPhoto : photo)),
    );
    setSelected((prev) => (prev && prev.id === updatedPhoto.id ? updatedPhoto : prev));
  }, []);

  const toggleLike = async (photoId: string) => {
    if (authLoading) return;

    if (!user) {
      requireAuth();
      return;
    }

    const wasLiked = liked.has(photoId);

    setLiked((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(photoId);
      else next.add(photoId);
      return next;
    });

    try {
      const response = await fetch("/api/photos/favorites", {
        method: wasLiked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });

      if (response.ok) {
        showSuccess(wasLiked ? "Удалено из избранного" : "Добавлено в избранное");
      } else {
        setLiked((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(photoId);
          else next.delete(photoId);
          return next;
        });
      }
    } catch {
      setLiked((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(photoId);
        else next.delete(photoId);
        return next;
      });
    }
  };

  return (
    <main className={styles.root}>
      <h1 className={styles.h1}>
        <span className={styles.mark}>Выберите</span> место, которое откликается
      </h1>

      {isAdmin ? (
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={() => setUploadOpen(true)}
        >
          Загрузить фото
        </button>
      ) : null}

      <div className={styles.wrap}>
        <section className={styles.gallery}>
          <div className={styles.grid}>
            {loading && photos.length === 0 ? (
              <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#fff" }}>
                Загрузка...
              </p>
            ) : (
              photos.map((photo) => (
                <figure
                  key={photo.id}
                  className={styles.card}
                  onClick={() => openPhoto(photo)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openPhoto(photo);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.thumb}>
                    <OptimizedPhoto
                      src={photo.src}
                      alt={photo.title}
                      fill
                      sizes="150px"
                      className={styles.img}
                      quality={70}
                    />
                    {liked.has(photo.id) ? (
                      <Image
                        src="/images/city/heart_red.png"
                        alt=""
                        width={23}
                        height={23}
                        className={styles.cardLike}
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <figcaption className={styles.cap}>{photo.title}</figcaption>
                </figure>
              ))
            )}
          </div>

          <div className={styles.pagination}>
            <button
              className={`${styles.pagBtn} ${!canPrev ? styles.pagBtnDisabled : ""}`}
              aria-label="Назад"
              disabled={!canPrev}
              onClick={() => go(page - 1)}
            >
              ←
            </button>

            <div className={styles.pages}>
              {pagesToShow.map((pageNumber, index) =>
                pageNumber === "dots" ? (
                  <span key={`d-${index}`} className={styles.dots}>
                    …
                  </span>
                ) : (
                  <button
                    key={pageNumber}
                    className={`${styles.page} ${pageNumber === page ? styles.pageActive : ""}`}
                    onClick={() => go(pageNumber)}
                    aria-current={pageNumber === page ? "page" : undefined}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
            </div>

            <button
              className={`${styles.pagBtn} ${!canNext ? styles.pagBtnDisabled : ""}`}
              aria-label="Вперёд"
              disabled={!canNext}
              onClick={() => go(page + 1)}
            >
              →
            </button>
          </div>
        </section>

        <aside ref={filterRef} className={styles.filter}>
          <div className={styles.filterBox}>
            <h2 className={styles.filterTitle}>
              <span className={styles.mark}>Фильтр</span> для фотографий
            </h2>

            <div className={styles.filterFields}>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Тип пространства</div>
                <details className={styles.multi} name="gallery-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {summarizeSelection(selSpace, filterOptions.spaceType)}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.spaceType.map((value) => (
                      <label key={value} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selSpace.includes(value)}
                          onChange={() =>
                            toggleValue(value, filterOptions.spaceType, setSelSpace)
                          }
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Эмоциональный фон</div>
                <details className={styles.multi} name="gallery-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {summarizeSelection(selMood, filterOptions.mood)}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.mood.map((value) => (
                      <label key={value} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selMood.includes(value)}
                          onChange={() => toggleValue(value, filterOptions.mood, setSelMood)}
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Станция метро</div>
                <details className={styles.multi} name="gallery-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {summarizeSelection(selMetro, filterOptions.metro)}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.metro.map((value) => (
                      <label key={value} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selMetro.includes(value)}
                          onChange={() => toggleValue(value, filterOptions.metro, setSelMetro)}
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Атмосфера</div>
                <details className={styles.multi} name="gallery-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {summarizeSelection(selAtmo, filterOptions.atmosphere)}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.atmosphere.map((value) => (
                      <label key={value} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selAtmo.includes(value)}
                          onChange={() =>
                            toggleValue(value, filterOptions.atmosphere, setSelAtmo)
                          }
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            <button
              type="button"
              className={styles.apply}
              onClick={handleApplyFilters}
              disabled={!canFind}
            >
              Применить
            </button>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.findBtn}
                onClick={handleApplyFilters}
                aria-label="Найти"
                disabled={!canFind}
              >
                Найти
              </button>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={handleResetFilters}
                disabled={!canResetFilters}
                aria-label="Сбросить"
              >
                Сбросить
              </button>
            </div>
          </div>
        </aside>
      </div>

      {selected ? (
        <PhotoModals
          photo={selected}
          photos={allPhotos.length > 0 ? allPhotos : photos}
          onClose={() => setSelected(null)}
          liked={liked}
          onToggleLike={toggleLike}
          isAdmin={isAdmin}
          isAuthenticated={!!user}
          onRequireAuth={requireAuth}
          onPhotoDeleted={handlePhotoDeleted}
          onPhotoUpdated={handlePhotoUpdated}
          onActionSuccess={showSuccess}
        />
      ) : null}

      {uploadOpen ? (
        <UploadPhotoModal
          open
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            void fetchPhotos(page, appliedFilters);
            showSuccess("Фото загружено");
          }}
        />
      ) : null}

      <SuccessToast message={successMsg} />
    </main>
  );
}
