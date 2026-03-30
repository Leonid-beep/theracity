"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./routeModal.module.css";
import ConfirmDeleteModal from "@/app/cabinet/_components/ConfirmDeleteModal";

type RouteItem = {
  id: string;
  title: string;
  desc: string;
  authorUsername?: string;
  metro: string;
  address: string;
  photos: { src: string; alt: string; metro?: string; address?: string }[];
};

export default function RouteModal({
  open,
  route,
  liked,
  onToggleLike,
  onClose,
  isAdmin,
  onRouteDeleted,
}: {
  open: boolean;
  route: RouteItem | null;
  liked: boolean;
  onToggleLike: () => void;
  onClose: () => void;
  isAdmin?: boolean;
  onRouteDeleted?: (routeId: string) => void;
}) {
  const photos = route?.photos ?? [];
  const totalPages = Math.max(1, photos.length);
  const [page, setPage] = useState(1);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open, route?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirmDeleteOpen(false);
        onClose();
      }
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

  const handleClose = () => {
    setConfirmDeleteOpen(false);
    onClose();
  };

  const performDelete = async () => {
    if (!route || deleteSubmitting) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/routes/${route.id}`, { method: "DELETE" });
      if (!res.ok) {
        setConfirmDeleteOpen(false);
        return;
      }
      onRouteDeleted?.(route.id);
      setConfirmDeleteOpen(false);
      handleClose();
    } catch {
      setConfirmDeleteOpen(false);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (!open || !route) return null;

  const idx = page - 1;
  const main = photos[idx] ?? photos[0];
  const prev = idx - 1 >= 0 ? photos[idx - 1] : null;
  const next = idx + 1 < photos.length ? photos[idx + 1] : null;
  const authorNick = route.authorUsername?.trim() ?? "";
  const routeTitleFull =
    authorNick.length > 0 ? `${route.title} от ${authorNick}` : route.title;

  return (
    <>
    <div className={styles.overlay} onClick={handleClose} role="presentation">
      <div className={`${styles.modal} ${styles.modalRoute}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={handleClose} />

        <div className={styles.routeTitle} title={routeTitleFull}>
          <span className={styles.routeTitleMain}>{route.title}</span>
          {authorNick ? (
            <span className={styles.routeTitleAuthor}>
              {" "}
              от <span className={styles.routeTitleNick}>{authorNick}</span>
            </span>
          ) : null}
        </div>

        <div className={styles.routeDesc}>{route.desc}</div>

        <div className={styles.photoRow}>
          {prev ? (
            <button type="button" className={styles.sideThumb} aria-label="Предыдущее фото" onClick={() => go(page - 1)}>
              <Image src={prev.src} alt={prev.alt} width={88} height={111} className={styles.sideImg} unoptimized />
            </button>
          ) : (
            <div className={`${styles.sideThumb} ${styles.sideThumbEmpty}`} aria-hidden="true" />
          )}

          <div className={styles.mainPhoto}>
            {main ? (
              <Image src={main.src} alt={main.alt} width={300} height={375} className={styles.mainImg} unoptimized />
            ) : null}
            {isAdmin ? (
              <button
                type="button"
                className={styles.deleteRouteBtn}
                aria-label="Удалить маршрут"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteOpen(true);
                }}
              >
                <svg className={styles.deleteRouteIcon} width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
            {liked ? (
              <Image
                src="/images/city/heart_red.png"
                alt=""
                width={23}
                height={23}
                className={styles.likeIcon}
                aria-hidden="true"
              />
            ) : null}
          </div>

          {next ? (
            <button type="button" className={styles.sideThumb} aria-label="Следующее фото" onClick={() => go(page + 1)}>
              <Image src={next.src} alt={next.alt} width={88} height={111} className={styles.sideImg} unoptimized />
            </button>
          ) : (
            <div className={`${styles.sideThumb} ${styles.sideThumbEmpty}`} aria-hidden="true" />
          )}
        </div>

        <div className={styles.meta}>
          <div>Метро: {main?.metro ?? route.metro}</div>
          <div>Адрес: {main?.address ?? route.address}</div>
        </div>

        <div className={styles.pagination}>
          <button className={`${styles.pagBtn} ${!canPrev ? styles.pagBtnDisabled : ""}`} disabled={!canPrev} onClick={() => go(page - 1)} aria-label="Назад">
            ←
          </button>

          <div className={styles.pages}>
            {pagesToShow.map((p, i) =>
              p === "dots" ? (
                <span key={`d-${i}`} className={styles.dots}>
                  …
                </span>
              ) : (
                <button key={p} className={`${styles.page} ${p === page ? styles.pageActive : ""}`} onClick={() => go(p)} aria-current={p === page ? "page" : undefined}>
                  {p}
                </button>
              )
            )}
          </div>

          <button className={`${styles.pagBtn} ${!canNext ? styles.pagBtnDisabled : ""}`} disabled={!canNext} onClick={() => go(page + 1)} aria-label="Вперёд">
            →
          </button>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.bigBtn} onClick={onToggleLike}>
            <Image
              src={liked ? "/images/city/heart_red.png" : "/images/city/heart_black.png"}
              alt=""
              width={23}
              height={23}
              className={styles.btnImg}
              aria-hidden="true"
            />
            {liked ? "УДАЛИТЬ ИЗ ИЗБРАННОГО" : "ДОБАВИТЬ В ИЗБРАННОЕ"}
          </button>

          <button type="button" className={styles.bigBtn} onClick={() => {}}>
            <Image src="/images/city/share.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
            ПОДЕЛИТЬСЯ МАРШРУТОМ
          </button>
        </div>
      </div>
    </div>
    {isAdmin ? (
      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        onClose={() => {
          if (!deleteSubmitting) setConfirmDeleteOpen(false);
        }}
        onYes={() => void performDelete()}
      />
    ) : null}
    </>
  );
}
