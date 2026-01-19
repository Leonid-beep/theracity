"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./styles.module.css";

export default function LoginPage() {
  return (
    <main className={styles.root}>
      {/* Фон-карта */}
      <div className={styles.mapBg} aria-hidden="true" />

      {/* Линии (как отдельная картинка поверх фона) */}
      <div className={styles.lines} aria-hidden="true" />

      {/* Лого справа сверху */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoText}>TheraCity</span>
          <span className={styles.logoIcon} aria-hidden="true">
            {/* Заглушка под иконку, заменишь на svg */}
            <Image
              src="/icons/logo-mark.svg"
              alt=""
              width={70}
              height={70}
              className={styles.logoIconImg}
              priority
            />
          </span>
        </div>
      </header>

      {/* Фотки вокруг (пока заглушки путей) */}
      <section className={styles.photos} aria-label="Городские фотографии">
        <div className={`${styles.photo} ${styles.p1}`}>
          <Image
            src="/images/city/city-1.jpg"
            alt="Фотография города"
            fill
            className={styles.photoImg}
          />
        </div>

        <div className={`${styles.photo} ${styles.p2}`}>
          <Image
            src="/images/city/city-2.jpg"
            alt="Фотография города"
            fill
            className={styles.photoImg}
          />
        </div>

        <div className={`${styles.photo} ${styles.p3}`}>
          <Image
            src="/images/city/city-3.jpg"
            alt="Фотография города"
            fill
            className={styles.photoImg}
          />
        </div>

        <div className={`${styles.photo} ${styles.p4}`}>
          <Image
            src="/images/city/city-4.jpg"
            alt="Фотография города"
            fill
            className={styles.photoImg}
          />
        </div>

        <div className={`${styles.photo} ${styles.p5}`}>
          <Image
            src="/images/city/city-5.jpg"
            alt="Фотография города"
            fill
            className={styles.photoImg}
          />
        </div>

        <div className={`${styles.photo} ${styles.p6}`}>
          <Image
            src="/images/city/city-6.jpg"
            alt="Фотография города"
            fill
            className={styles.photoImg}
          />
        </div>

        <div className={`${styles.photo} ${styles.p7}`}>
          <Image
            src="/images/city/city-7.jpg"
            alt="Фотография города"
            fill
            className={styles.photoImg}
          />
        </div>
      </section>

      <h1 className={styles.title}>
        Пространство, где <br />
        <span className={styles.mark}>Петербург</span> становится <br />
        частью терапии
      </h1>


      <Link href="/gallery" className={styles.cta} aria-label="Перейти к галерее">
        ПЕРЕЙТИ&nbsp;К&nbsp;ГАЛЕРЕЕ
      </Link>

      <p className={styles.subtitle}>
        <span className={styles.mark}>Исследуйте</span> городские дворики, <br />
        брандмауэры и тихие улицы, <br />
        <span className={styles.mark}>создавайте</span> визуальные маршруты и <br />
        <span className={styles.mark}>находите</span> отражение своих чувств <br />
        в образах города
      </p>

    </main>
  );
}