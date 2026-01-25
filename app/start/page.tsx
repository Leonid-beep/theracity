"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./styles.module.css";

export default function LoginPage() {
  return (
    <main className={styles.root}>

      <div className={styles.collage} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoText}>TheraCity</span>
          <span className={styles.logoIcon} aria-hidden="true">
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