"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./styles.module.css";

type Item = { label: string; href: string };

export default function BurgerMenu() {
  const pathname = usePathname();
  const isStart = pathname === "/start";

  const items: Item[] = useMemo(
    () => [
      { label: "ГАЛЕРЕЯ", href: "/gallery" },
      { label: "МАРШРУТЫ", href: "/routes" },
      { label: "ЛИЧНЫЙ КАБИНЕТ", href: "/cabinet" },
      { label: "ВОЙТИ/РЕГИСТРАЦИЯ", href: "/auth/login" },
      { label: "О ПРОЕКТЕ", href: "/about" },
    ],
    []
  );

  const activeIndex = useMemo(() => {
    const idx = items.findIndex((i) => {
      if (i.href === "/auth/login") return pathname?.startsWith("/auth");
      return pathname === i.href || pathname?.startsWith(i.href + "/");
    });
    return idx >= 0 ? idx : 0;
  }, [items, pathname]);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (isStart) setOpen(false);
  }, [isStart]);

  if (isStart) return null;

  return (
    <>
      <button
        type="button"
        className={`${styles.burgerBtn} ${open ? styles.hidden : ""}`}
        aria-label="Открыть меню"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className={styles.burgerIcon} aria-hidden="true" />
      </button>

      <div
        className={`${styles.overlay} ${open ? styles.open : ""}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        <div
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label="Меню"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.topLeft}>
            <span className={styles.brand}>TheraCity</span>
            <Image
              src="/images/city/icons8-bed-100.png"
              alt=""
              width={15}
              height={15}
              className={styles.brandMark}
              priority
            />
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          >
            <span className={styles.closeIcon} aria-hidden="true" />
          </button>

          <nav className={styles.nav} aria-label="Разделы">
            <ul className={styles.list} style={{ ["--active" as any]: activeIndex }}>
              {items.map((it, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <li key={it.href} className={styles.item}>
                    <Link
                      href={it.href}
                      className={`${styles.link} ${isActive ? styles.active : ""}`}
                      onClick={() => setOpen(false)}
                    >
                      <span className={isActive ? styles.mark : ""}>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
