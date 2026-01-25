// app/(app)/cabinet/page.tsx
"use client";

import Image from "next/image";
import styles from "./styles.module.css";

const makeItems = (n: number) =>
  Array.from({ length: n }).map((_, i) => ({
    id: i + 1,
    src: `/images/city/city-${(i % 7) + 1}.jpg`,
    title: ["Прогулка по центру", "Песня", "Дворы и колодцы", "За поворотом", "Красиво"][i % 5],
  }));

const sections = [
  { key: "my_routes", title: "Мои маршруты", items: makeItems(10) },
  { key: "fav_photos", title: "Избранные фотографии", items: makeItems(10) },
  { key: "fav_routes", title: "Избранные маршруты", items: makeItems(10) },
] as const;

export default function CabinetPage() {
  return (
    <main className={styles.root}>
      <h1 className={styles.userName}>leo1406</h1>

      <div className={styles.sections}>
        {sections.map((s) => (
          <section key={s.key} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.mark}>{s.title}</span>
            </h2>

            <div className={styles.row}>
              {s.items.map((p) => (
                <figure key={p.id} className={styles.card}>
                  <div className={styles.thumb}>
                    <Image src={p.src} alt={p.title} fill className={styles.img} />
                  </div>
                  <figcaption className={styles.cap}>{p.title}</figcaption>
                </figure>
              ))}
            </div>

            <div className={styles.pagination}>
              <button className={styles.pagBtn} aria-label="Назад">
                ←
              </button>
              <div className={styles.pages}>
                <button className={`${styles.page} ${styles.pageActive}`}>1</button>
                <button className={styles.page}>2</button>
                <button className={styles.page}>3</button>
                <span className={styles.dots}>…</span>
                <button className={styles.page}>67</button>
                <button className={styles.page}>68</button>
              </div>
              <button className={styles.pagBtn} aria-label="Вперёд">
                →
              </button>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
