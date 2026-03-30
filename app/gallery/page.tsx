"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./styles.module.css";
import { useAuth } from "@/app/providers/AuthProvider";
import { SuccessToast, useSuccessToast } from "@/app/ui/SuccessToast";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

const PhotoModals = dynamic(() => import("./_components/PhotoModals"), { ssr: false });
const UploadPhotoModal = dynamic(() => import("./_components/UploadPhotoModal"), { ssr: false });

const ADMIN_EMAIL = "leonidusachev04@yandex.ru";

function useGalleryBreakpoint() {
  const [pageSize, setPageSize] = useState(32);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w <= 480) setPageSize(8);
      else if (w <= 700) setPageSize(16);
      else if (w <= 1024) setPageSize(25);
      else if (w <= 1440) setPageSize(32);
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
  metro: string;
  coords: string;
  lat: number;
  lng: number;
  spaceType: string;
  mood: string;
  atmosphere: string;
};

type Filters = {
  metro: string[];
  spaceType: string[];
  mood: string[];
  atmosphere: string[];
};

export default function GalleryPage() {
  const pageSize = useGalleryBreakpoint();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const returnToGallery = "/gallery";

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
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

  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const [selected, setSelected] = useState<PhotoItem | null>(null);
  const { message: successMsg, showSuccess } = useSuccessToast();

  const filterRef = useRef<HTMLElement>(null);
  useCloseDetailsOnOutsideClick(filterRef, "gallery-filters");

  const openPhoto = useCallback(
    (p: PhotoItem) => {
      if (authLoading) return;
      if (!user) {
        router.push(`/auth/login?returnTo=${encodeURIComponent(returnToGallery)}`);
        return;
      }
      setSelected(p);
    },
    [authLoading, user, router],
  );

  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then((d) => setFilterOptions(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/photos/favorites/ids")
      .then((r) => r.json())
      .then((d) => setLiked(new Set(d.ids ?? [])))
      .catch(() => {});
  }, []);

  const fetchPhotos = useCallback(
    async (p: number, filters: Record<string, string>) => {
      setLoading(true);
      const sp = new URLSearchParams({
        page: String(p),
        pageSize: String(pageSize),
        ...filters,
      });
      try {
        const res = await fetch(`/api/photos?${sp}`);
        const data = await res.json();
        setPhotos(data.photos ?? []);
        setTotal(data.total ?? 0);
      } catch {
        setPhotos([]);
        setTotal(0);
      }
      setLoading(false);
    },
    [pageSize],
  );

  useEffect(() => {
    fetchPhotos(page, appliedFilters);
  }, [page, appliedFilters, fetchPhotos]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const go = (p: number) => setPage(Math.min(totalPages, Math.max(1, p)));

  const pagesToShow = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: (number | "dots")[] = [1];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    if (left > 2) out.push("dots");
    for (let p = left; p <= right; p++) out.push(p);
    if (right < totalPages - 1) out.push("dots");
    out.push(totalPages);
    return out;
  }, [page, totalPages]);

  const handleApplyFilters = () => {
    const f: Record<string, string> = {};
    if (selMetro.length) f.metro = selMetro.join(",");
    if (selSpace.length) f.spaceType = selSpace.join(",");
    if (selMood.length) f.mood = selMood.join(",");
    if (selAtmo.length) f.atmosphere = selAtmo.join(",");
    setAppliedFilters(f);
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

  const toggleValue = (value: string, setter: (updater: (prev: string[]) => string[]) => void) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handlePhotoDeleted = useCallback((id: string) => {
    setPhotos((p) => p.filter((x) => x.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setLiked((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    setSelected(null);
  }, []);

  const toggleLike = async (photoId: string) => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?returnTo=${encodeURIComponent(returnToGallery)}`);
      return;
    }
    const was = liked.has(photoId);
    setLiked((prev) => {
      const next = new Set(prev);
      if (was) next.delete(photoId);
      else next.add(photoId);
      return next;
    });

    try {
      const res = await fetch("/api/photos/favorites", {
        method: was ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      if (res.ok) {
        showSuccess(was ? "Удалено из избранного" : "Добавлено в избранное");
      } else {
        setLiked((prev) => {
          const next = new Set(prev);
          if (was) next.add(photoId);
          else next.delete(photoId);
          return next;
        });
      }
    } catch {
      setLiked((prev) => {
        const next = new Set(prev);
        if (was) next.add(photoId);
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

      {isAdmin && (
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={() => setUploadOpen(true)}
        >
          ЗАГРУЗИТЬ ФОТО
        </button>
      )}

      <div className={styles.wrap}>
        <section className={styles.gallery}>
          <div className={styles.grid}>
            {loading && photos.length === 0 ? (
              <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#fff" }}>Загрузка...</p>
            ) : (
              photos.map((p) => (
                <figure
                  key={p.id}
                  className={styles.card}
                  onClick={() => openPhoto(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openPhoto(p);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.thumb}>
                    <Image src={p.src} alt={p.title} fill className={styles.img} unoptimized />
                    {liked.has(p.id) ? (
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
                  <figcaption className={styles.cap}>{p.title}</figcaption>
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
              {pagesToShow.map((p, idx) =>
                p === "dots" ? (
                  <span key={`d-${idx}`} className={styles.dots}>
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`${styles.page} ${p === page ? styles.pageActive : ""}`}
                    onClick={() => go(p)}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </button>
                )
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
                <div className={styles.fieldLabel}>тип пространства</div>
                <details className={styles.multi} name="gallery-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {selSpace.length ? selSpace.join(", ") : "Все"}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.spaceType.map((v) => (
                      <label key={v} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selSpace.includes(v)}
                          onChange={() => toggleValue(v, setSelSpace)}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>эмоциональный фон</div>
                <details className={styles.multi} name="gallery-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {selMood.length ? selMood.join(", ") : "Все"}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.mood.map((v) => (
                      <label key={v} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selMood.includes(v)}
                          onChange={() => toggleValue(v, setSelMood)}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>станция метро</div>
                <details className={styles.multi} name="gallery-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {selMetro.length ? selMetro.join(", ") : "Все"}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.metro.map((v) => (
                      <label key={v} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selMetro.includes(v)}
                          onChange={() => toggleValue(v, setSelMetro)}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>атмосфера</div>
                <details className={styles.multi} name="gallery-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {selAtmo.length ? selAtmo.join(", ") : "Все"}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.atmosphere.map((v) => (
                      <label key={v} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selAtmo.includes(v)}
                          onChange={() => toggleValue(v, setSelAtmo)}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            <button
              className={styles.apply}
              onClick={hasAppliedFilters ? handleResetFilters : handleApplyFilters}
            >
              {hasAppliedFilters ? "СБРОСИТЬ" : "ПРИМЕНИТЬ"}
            </button>
          </div>
        </aside>
      </div>

      {selected ? (
        <PhotoModals
          photo={selected}
          photos={photos}
          onClose={() => setSelected(null)}
          liked={liked}
          onToggleLike={toggleLike}
          isAdmin={isAdmin}
          onPhotoDeleted={handlePhotoDeleted}
          onActionSuccess={showSuccess}
        />
      ) : null}

      {uploadOpen && (
        <UploadPhotoModal
          open
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            void fetchPhotos(page, appliedFilters);
            showSuccess("Фото загружено");
          }}
        />
      )}

      <SuccessToast message={successMsg} />
    </main>
  );
}
