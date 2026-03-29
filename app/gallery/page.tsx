"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import styles from "./styles.module.css";
import { useAuth } from "@/app/providers/AuthProvider";

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
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

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
  const [selMetro, setSelMetro] = useState("");
  const [selSpace, setSelSpace] = useState("");
  const [selMood, setSelMood] = useState("");
  const [selAtmo, setSelAtmo] = useState("");

  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const [selected, setSelected] = useState<PhotoItem | null>(null);

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
    if (selMetro) f.metro = selMetro;
    if (selSpace) f.spaceType = selSpace;
    if (selMood) f.mood = selMood;
    if (selAtmo) f.atmosphere = selAtmo;
    setAppliedFilters(f);
    setPage(1);
  };

  const toggleLike = async (photoId: string) => {
    const was = liked.has(photoId);
    setLiked((prev) => {
      const next = new Set(prev);
      if (was) next.delete(photoId);
      else next.add(photoId);
      return next;
    });

    try {
      await fetch("/api/photos/favorites", {
        method: was ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
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
                <figure key={p.id} className={styles.card} onClick={() => setSelected(p)} role="button" tabIndex={0}>
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

        <aside className={styles.filter}>
          <div className={styles.filterBox}>
            <h2 className={styles.filterTitle}>
              <span className={styles.mark}>Фильтр</span> для фотографий
            </h2>

            <div className={styles.filterFields}>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>тип пространства</div>
                <select className={styles.select} value={selSpace} onChange={(e) => setSelSpace(e.target.value)}>
                  <option value="">Все</option>
                  {filterOptions.spaceType.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>эмоциональный фон</div>
                <select className={styles.select} value={selMood} onChange={(e) => setSelMood(e.target.value)}>
                  <option value="">Все</option>
                  {filterOptions.mood.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>станция метро</div>
                <select className={styles.select} value={selMetro} onChange={(e) => setSelMetro(e.target.value)}>
                  <option value="">Все</option>
                  {filterOptions.metro.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>атмосфера</div>
                <select className={styles.select} value={selAtmo} onChange={(e) => setSelAtmo(e.target.value)}>
                  <option value="">Все</option>
                  {filterOptions.atmosphere.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className={styles.apply} onClick={handleApplyFilters}>ПРИМЕНИТЬ</button>
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
        />
      ) : null}

      {uploadOpen && (
        <UploadPhotoModal
          open
          onClose={() => setUploadOpen(false)}
          onUploaded={() => fetchPhotos(page, appliedFilters)}
        />
      )}
    </main>
  );
}
