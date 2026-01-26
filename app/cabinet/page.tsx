// app/(app)/cabinet/page.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import styles from "./styles.module.css";

type Item = { id: number; src: string; title: string };

const makeItems = (n: number): Item[] =>
  Array.from({ length: n }).map((_, i) => ({
    id: i + 1,
    src: `/images/city/city-${(i % 7) + 1}.jpg`,
    title: ["Прогулка по центру", "Песня", "Дворы и колодцы", "За поворотом", "Красиво"][i % 5],
  }));

const sections = [
  { key: "my_routes", title: "Мои маршруты", items: makeItems(56) },
  { key: "fav_photos", title: "Избранные фотографии", items: makeItems(56) },
  { key: "fav_routes", title: "Избранные маршруты", items: makeItems(56) },
] as const;

function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pagesToShow = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const out: (number | "dots")[] = [];
    const push = (v: number | "dots") => out.push(v);

    push(1);

    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);

    if (left > 2) push("dots");
    for (let p = left; p <= right; p++) push(p);
    if (right < totalPages - 1) push("dots");

    push(totalPages);
    return out;
  }, [page, totalPages]);

  const go = (p: number) => onChange(Math.min(totalPages, Math.max(1, p)));

  return (
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
  );
}

export default function CabinetPage() {
  const pageSize = 10;

  const [pages, setPages] = useState<Record<string, number>>({
    my_routes: 1,
    fav_photos: 1,
    fav_routes: 1,
  });

  const getPage = (key: string) => pages[key] ?? 1;
  const setPage = (key: string, p: number) => setPages((prev) => ({ ...prev, [key]: p }));

  return (
    <main className={styles.root}>
      <h1 className={styles.userName}>leo1406</h1>

      <div className={styles.sections}>
        {sections.map((s) => {
          const totalPages = Math.max(1, Math.ceil(s.items.length / pageSize));
          const page = Math.min(getPage(s.key), totalPages);

          const pageItems = useMemo(() => {
            const start = (page - 1) * pageSize;
            return s.items.slice(start, start + pageSize);
          }, [page, s.items]);

          return (
            <section key={s.key} className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.mark}>{s.title}</span>
              </h2>

              <div className={styles.row}>
                {pageItems.map((p) => (
                  <figure key={p.id} className={styles.card}>
                    <div className={styles.thumb}>
                      <Image src={p.src} alt={p.title} fill className={styles.img} />
                    </div>
                    <figcaption className={styles.cap}>{p.title}</figcaption>
                  </figure>
                ))}
              </div>

              <Pager page={page} totalPages={totalPages} onChange={(p) => setPage(s.key, p)} />
            </section>
          );
        })}
      </div>
    </main>
  );
}
