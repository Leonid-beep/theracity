// app/(app)/routes/page.tsx
"use client";

import Image from "next/image";
import styles from "./styles.module.css";

const routes = Array.from({ length: 28 }).map((_, i) => ({
  id: i + 1,
  src: `/images/city/city-${(i % 7) + 1}.jpg`,
  title: ["Прогулка по центру", "Песня", "Дворы и колодцы", "За поворотом", "Красиво"][i % 5],
}));

export default function RoutesPage() {
  return (
    <main className={styles.root}>
      <div className={styles.wrap}>
        <section className={styles.gallery}>
          <h1 className={styles.h1}>
            <span className={styles.mark}>Посмотрите</span> маршруты пользователей
          </h1>

          <div className={styles.grid}>
            {routes.map((p) => (
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

        <aside className={styles.filter}>
          <h2 className={styles.filterTitle}>
            <span className={styles.mark}>Фильтр</span> для маршрутов
          </h2>

          <div className={styles.filterBox}>
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
    </main>
  );
}
