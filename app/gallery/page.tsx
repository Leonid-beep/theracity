// app/(app)/gallery/page.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import styles from "./styles.module.css";
import PhotoModals from "../_components/PhotoModals";

export type PhotoItem = {
  id: number;
  src: string;
  title: string;
};

const titlePool = ["Жёлтый двор-колодец", "Тихий переулок", "Солнечная арка", "Кирпичный двор"];

const allPhotos: PhotoItem[] = Array.from({ length: 56 }).map((_, i) => ({
  id: i + 1,
  src: `/images/city/city-${(i % 7) + 1}.jpg`,
  title: titlePool[i % titlePool.length],
}));

export default function GalleryPage() {
  const pageSize = 28;

  const totalPages = Math.max(1, Math.ceil(allPhotos.length / pageSize));
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<PhotoItem | null>(null);
  const [liked, setLiked] = useState<Set<number>>(() => new Set());

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allPhotos.slice(start, start + pageSize);
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

  const isLiked = (id: number) => liked.has(id);
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
        <span className={styles.mark}>Выберите</span> место, которое откликается
      </h1>

      <div className={styles.wrap}>
        <section className={styles.gallery}>
          <div className={styles.grid}>
            {pageItems.map((p) => (
              <figure key={p.id} className={styles.card} onClick={() => setSelected(p)} role="button" tabIndex={0}>
                <div className={styles.thumb}>
                  <Image src={p.src} alt={p.title} fill className={styles.img} />
                  {isLiked(p.id) ? <span className={styles.cardLike} aria-hidden="true" /> : null}
                </div>
                <figcaption className={styles.cap}>{p.title}</figcaption>
              </figure>
            ))}
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

            <button className={styles.apply}>ПРИМЕНИТЬ</button>
          </div>
        </aside>
      </div>

      <PhotoModals
        photo={selected}
        onClose={() => setSelected(null)}
        liked={liked}
        onToggleLike={toggleLike}
      />
    </main>
  );
}
