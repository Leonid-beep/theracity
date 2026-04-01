// app/(app)/cabinet/_components/CabinetRouteModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "../../routes/_components/routeModal.module.css";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import { formatMultiValue } from "@/app/lib/photoMetadata";

export type CabinetRouteItem = {
  id: string;
  title: string;
  desc: string;
  isPublished?: boolean;
  metro: string[];
  address: string;
  photos: { src: string; alt: string; metro?: string[]; address?: string }[];
};

export default function CabinetRouteModal({
  open,
  route,
  showPublish,
  onPublish,
  onClose,
  actionLabel,
  onDelete,
}: {
  open: boolean;
  route: CabinetRouteItem | null;
  showPublish?: boolean;
  onPublish?: () => void;
  onClose: () => void;
  actionLabel: string;
  onDelete: () => void;
}) {
  const photos = route?.photos ?? [];
  const hasPhotos = photos.length > 0;
  const totalPages = photos.length;
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

  const canPrev = hasPhotos && page > 1;
  const canNext = hasPhotos && page < totalPages;
  const go = (p: number) => {
    if (!hasPhotos) return;
    setPage(Math.min(totalPages, Math.max(1, p)));
  };

  const pagesToShow = useMemo(() => {
    if (!hasPhotos || totalPages === 0) return [];
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: (number | "dots")[] = [1];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    if (left > 2) out.push("dots");
    for (let p = left; p <= right; p++) out.push(p);
    if (right < totalPages - 1) out.push("dots");
    out.push(totalPages);
    return out;
  }, [page, totalPages, hasPhotos]);

  if (!open || !route) return null;

  const idx = hasPhotos ? page - 1 : 0;
  const main = hasPhotos ? (photos[idx] ?? photos[0]) : undefined;
  const prev = hasPhotos && idx - 1 >= 0 ? photos[idx - 1] : null;
  const next = hasPhotos && idx + 1 < photos.length ? photos[idx + 1] : null;

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
              <OptimizedPhoto
                src={prev.src}
                alt={prev.alt}
                width={88}
                height={111}
                sizes="88px"
                className={styles.sideImg}
                quality={68}
              />
            </button>
          ) : (
            <div className={`${styles.sideThumb} ${styles.sideThumbEmpty}`} aria-hidden="true" />
          )}

          <div className={styles.mainPhoto}>
            {hasPhotos && main ? (
              <OptimizedPhoto
                src={main.src}
                alt={main.alt}
                width={300}
                height={375}
                sizes="300px"
                className={styles.mainImg}
                quality={78}
              />
            ) : (
              <p className={styles.emptyRoutePhotos}>В этом маршруте пока нет фотографий</p>
            )}
          </div>

          {next ? (
            <button
              type="button"
              className={styles.sideThumb}
              aria-label="Следующее фото"
              onClick={() => go(page + 1)}
            >
              <OptimizedPhoto
                src={next.src}
                alt={next.alt}
                width={88}
                height={111}
                sizes="88px"
                className={styles.sideImg}
                quality={68}
              />
            </button>
          ) : (
            <div className={`${styles.sideThumb} ${styles.sideThumbEmpty}`} aria-hidden="true" />
          )}
        </div>

        <div className={styles.meta}>
          <div>Метро: {formatMultiValue(main?.metro ?? route.metro) || "—"}</div>
          <div>Адрес: {(main?.address ?? route.address) || "—"}</div>
        </div>

        {hasPhotos ? (
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
        ) : null}

        <div className={styles.actions}>
          {showPublish && !route.isPublished ? (
            <button type="button" className={styles.bigBtn} onClick={onPublish}>
              <Image src="/images/city/share.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
              ОПУБЛИКОВАТЬ МАРШРУТ
            </button>
          ) : (
            <button type="button" className={styles.bigBtn} onClick={() => {}}>
              <Image src="/images/city/share.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
              ПОДЕЛИТЬСЯ МАРШРУТОМ
            </button>
          )}

          <button type="button" className={`${styles.bigBtn} ${styles.bigBtnDanger}`} onClick={onDelete}>
            <Image src="/images/city/trash.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
