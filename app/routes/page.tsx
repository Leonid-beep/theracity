// app/(app)/routes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./styles.module.css";
import RouteModal from "./_components/RouteModal";

function useRoutesBreakpoint() {
  const [pageSize, setPageSize] = useState(32);
  useEffect(() => {
    const w = window.innerWidth;
    if (w <= 480) setPageSize(8);
    else if (w <= 700) setPageSize(16);
    else if (w <= 1024) setPageSize(25);
    else if (w <= 1440) setPageSize(32);
    else setPageSize(28);
    const onResize = () => {
      const nw = window.innerWidth;
      if (nw <= 480) setPageSize(8);
      else if (nw <= 700) setPageSize(16);
      else if (nw <= 1024) setPageSize(25);
      else if (nw <= 1440) setPageSize(32);
      else setPageSize(28);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return pageSize;
}

const baseTitles = ["Прогулка по центру", "Песня", "Дворы и колодцы", "За поворотом", "Красиво"];
const baseMetro = ["Василеостровская", "Чернышевская", "Сенная площадь", "Удельная", "Горный институт"];

const allRoutes = Array.from({ length: 56 }).map((_, i) => {
  const id = i + 1;
  const title = baseTitles[i % 5];
  return {
    id,
    src: `/images/city/city-${(i % 7) + 1}.jpg`,
    title,
    desc: "Маршрут для любителей дворов, плохой погоды, Невского проспекта, узких улочек и многого другого",
    metro: baseMetro[i % 5],
    address: `59.${936000 + i}35, 30.${271000 + i}04`,
    photos: Array.from({ length: 5 }).map((__, k) => ({
      src: `/images/city/city-${((i + k) % 7) + 1}.jpg`,
      alt: `${title} — фото ${k + 1}`,
    })),
  };
});

export default function RoutesPage() {
  const pageSize = useRoutesBreakpoint();
  const totalPages = Math.max(1, Math.ceil(allRoutes.length / pageSize));
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
  const [liked, setLiked] = useState<Set<number>>(() => new Set());

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allRoutes.slice(start, start + pageSize);
  }, [page]);

  const pagesToShow = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: (number | "dots")[] = [];
    out.push(1);
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    if (left > 2) out.push("dots");
    for (let p = left; p <= right; p++) out.push(p);
    if (right < totalPages - 1) out.push("dots");
    out.push(totalPages);
    return out;
  }, [page, totalPages]);

  const go = (p: number) => setPage(Math.min(totalPages, Math.max(1, p)));

  const activeRoute = useMemo(() => allRoutes.find((r) => r.id === activeRouteId) ?? null, [activeRouteId]);

  const openRoute = (id: number) => {
    setActiveRouteId(id);
    setOpen(true);
  };

  const toggleLike = (id: number) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main className={styles.root}>
      <h1 className={styles.h1}>
        <span className={styles.mark}>Посмотрите</span> маршруты пользователей
      </h1>

      <div className={styles.wrap}>
        <section className={styles.gallery}>
          <div className={styles.grid}>
            {pageItems.map((r) => {
              const isLiked = liked.has(r.id);
              return (
                <figure key={r.id} className={styles.card} onClick={() => openRoute(r.id)} role="button" tabIndex={0}>
                  <div className={styles.thumb}>
                    <Image src={r.src} alt={r.title} fill className={styles.img} />
                    {isLiked ? (
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
                  <figcaption className={styles.cap}>{r.title}</figcaption>
                </figure>
              );
            })}
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
              <span className={styles.mark}>Фильтр</span> для маршрутов
            </h2>

            <div className={styles.filterFields}>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>тип пространства</div>
              <select className={styles.select} defaultValue="Дворы">
                <option>Дворы</option>
                <option>Улицы</option>
                <option>Брандмауэры</option>
              </select>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabel}>эмоциональный фон</div>
              <select className={styles.select} defaultValue="Надежда + тоска">
                <option>Надежда + тоска</option>
                <option>Спокойно</option>
                <option>Тревожно</option>
              </select>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabel}>станция метро</div>
              <select className={styles.select} defaultValue="Удельная">
                <option>Удельная</option>
                <option>Сенная площадь</option>
                <option>Чернышевская</option>
              </select>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabel}>атмосфера</div>
              <select className={styles.select} defaultValue="Солнечно">
                <option>Солнечно</option>
                <option>Пасмурно</option>
                <option>Дождь</option>
              </select>
            </div>
            </div>

            <button className={styles.apply}>ПРИМЕНИТЬ</button>
          </div>
        </aside>
      </div>

      <RouteModal
        open={open}
        route={activeRoute}
        liked={activeRoute ? liked.has(activeRoute.id) : false}
        onToggleLike={() => activeRoute && toggleLike(activeRoute.id)}
        onClose={() => setOpen(false)}
      />
    </main>
  );
}
