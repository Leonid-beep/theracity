// app/(app)/cabinet/_components/CabinetRouteModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./cabinetRouteModal.module.css";

export type CabinetRouteItem = {
  id: number;
  title: string;
  desc: string;
  metro: string;
  address: string;
  photos: { src: string; alt: string }[];
};

export default function CabinetRouteModal({
  open,
  route,
  onClose,
  actionLabel,
  onDelete,
}: {
  open: boolean;
  route: CabinetRouteItem | null;
  onClose: () => void;
  actionLabel: string;
  onDelete: () => void;
}) {
  const photos = route?.photos ?? [];
  const totalPages = Math.max(1, photos.length);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open, route?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, onClose]);

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

  if (!open || !route) return null;

  const idx = page - 1;
  const main = photos[idx] ?? photos[0];
  const prev = idx - 1 >= 0 ? photos[idx - 1] : null;
  const next = idx + 1 < photos.length ? photos[idx + 1] : null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${styles.modal} ${styles.modalRoute}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose} />

        <div className={styles.routeTitle} title={route.title}>
          {route.title}
        </div>

        <div className={styles.routeDesc}>{route.desc}</div>

        <div className={styles.photoRow}>
          {prev ? (
            <button
              type="button"
              className={styles.sideThumb}
              aria-label="Предыдущее фото"
              onClick={() => go(page - 1)}
            >
              <Image src={prev.src} alt={prev.alt} width={112} height={141} className={styles.sideImg} />
            </button>
          ) : (
            <div className={`${styles.sideThumb} ${styles.sideThumbEmpty}`} aria-hidden="true" />
          )}

          <div className={styles.mainPhoto}>
            <Image src={main.src} alt={main.alt} width={225} height={280} className={styles.mainImg} />
          </div>

          {next ? (
            <button
              type="button"
              className={styles.sideThumb}
              aria-label="Следующее фото"
              onClick={() => go(page + 1)}
            >
              <Image src={next.src} alt={next.alt} width={112} height={141} className={styles.sideImg} />
            </button>
          ) : (
            <div className={`${styles.sideThumb} ${styles.sideThumbEmpty}`} aria-hidden="true" />
          )}
        </div>

        <div className={styles.meta}>
          <div>Метро: {route.metro}</div>
          <div>Адрес: {route.address}</div>
        </div>

        <div className={styles.pagination}>
          <button
            className={`${styles.pagBtn} ${!canPrev ? styles.pagBtnDisabled : ""}`}
            disabled={!canPrev}
            onClick={() => go(page - 1)}
          >
            ←
          </button>

          <div className={styles.pages}>
            {pagesToShow.map((p, i) =>
              p === "dots" ? (
                <span key={`d-${i}`} className={styles.dots}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`${styles.page} ${p === page ? styles.pageActive : ""}`}
                  onClick={() => go(p)}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            className={`${styles.pagBtn} ${!canNext ? styles.pagBtnDisabled : ""}`}
            disabled={!canNext}
            onClick={() => go(page + 1)}
          >
            →
          </button>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.bigBtn} onClick={() => {}}>
            <Image src="/images/city/share.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
            ПОДЕЛИТЬСЯ МАРШРУТОМ
          </button>

          <button type="button" className={`${styles.bigBtn} ${styles.bigBtnDanger}`} onClick={onDelete}>
            <Image src="/images/city/trash.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
