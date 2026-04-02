"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./styles.module.css";
import { useAuth } from "@/app/providers/AuthProvider";

type Item = { label: string; href: string; onClick?: () => void };

export default function BurgerMenu() {
  const pathname = usePathname();
  const isStart = pathname === "/start";
  const { user, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const authEntryHref = useMemo(() => {
    if (!pathname || pathname.startsWith("/auth")) return "/auth/login";
    return `/auth/login?returnTo=${encodeURIComponent(pathname)}`;
  }, [pathname]);

  const items: Item[] = useMemo(
    () => [
      { label: "ГАЛЕРЕЯ", href: "/gallery" },
      { label: "МАРШРУТЫ", href: "/routes" },
      { label: "ЛИЧНЫЙ КАБИНЕТ", href: "/cabinet" },
      ...(user
        ? [{ label: "ВЫЙТИ", href: "#", onClick: () => logout() }]
        : [{ label: "ВОЙТИ/РЕГИСТРАЦИЯ", href: authEntryHref }]),
      { label: "О ПРОЕКТЕ", href: "/about" },
    ],
    [user, logout, authEntryHref],
  );

  const activeIndex = useMemo(() => {
    const index = items.findIndex((item) => {
      if (item.href.startsWith("/auth/login")) return pathname?.startsWith("/auth");
      if (item.href === "#") return false;
      return pathname === item.href || pathname?.startsWith(`${item.href}/`);
    });
    return index >= 0 ? index : 0;
  }, [items, pathname]);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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

  useEffect(() => {
    const syncModalState = () => {
      const modals = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]'));
      const hasExternalModal = modals.some((modal) => {
        if (panelRef.current?.contains(modal)) return false;

        const style = window.getComputedStyle(modal);
        if (style.display === "none" || style.visibility === "hidden") return false;

        const rect = modal.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      setModalOpen(hasExternalModal);
    };

    syncModalState();

    const observer = new MutationObserver(() => {
      syncModalState();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-modal"],
    });

    return () => observer.disconnect();
  }, []);

  if (isStart) return null;

  return (
    <>
      <button
        type="button"
        className={`${styles.burgerBtn} ${open ? styles.hidden : ""} ${!open && modalOpen ? styles.blocked : ""}`}
        aria-label="Открыть меню"
        aria-expanded={open}
        disabled={!open && modalOpen}
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
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label="Меню"
          onClick={(event) => event.stopPropagation()}
        >
          <header className={styles.header}>
            <div className={styles.topLeft}>
              <span className={styles.brand}>TheraCity</span>
              <Image
                src="/images/city/icons8-bed-100.png"
                alt=""
                width={27}
                height={27}
                className={styles.brandMark}
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
          </header>

          <nav className={styles.nav} aria-label="Разделы">
            <ul className={styles.list} style={{ ["--active" as any]: activeIndex }}>
              {items.map((item, index) => {
                const isActive = index === activeIndex;

                if (item.onClick) {
                  return (
                    <li key={item.label} className={styles.item}>
                      <button
                        type="button"
                        className={`${styles.link} ${styles.linkBtn}`}
                        onClick={() => {
                          setOpen(false);
                          item.onClick?.();
                        }}
                      >
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={item.href} className={styles.item}>
                    <Link
                      href={item.href}
                      className={`${styles.link} ${isActive ? styles.active : ""}`}
                      onClick={() => setOpen(false)}
                    >
                      <span className={isActive ? styles.mark : ""}>{item.label}</span>
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
