"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./routeModal.module.css";
import ConfirmDeleteModal from "@/app/cabinet/_components/ConfirmDeleteModal";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import { formatMultiValue } from "@/app/lib/photoMetadata";
import { buildYandexMapsUrlFromString } from "@/app/lib/locationLinks";

type RouteItem = {
  id: string;
  title: string;
  desc: string;
  authorUsername?: string;
  metro: string[];
  address: string;
  photos: { src: string; alt: string; metro?: string[]; address?: string }[];
};

export default function RouteModal({
  open,
  route,
  liked,
  onToggleLike,
  onClose,
  isAdmin,
  isAuthenticated,
  onRequireAuth,
  onShare,
  onRouteDeleted,
}: {
  open: boolean;
  route: RouteItem | null;
  liked: boolean;
  onToggleLike: () => void;
  onClose: () => void;
  isAdmin?: boolean;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
  onShare?: () => void;
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
  const go = (nextPage: number) => setPage(Math.min(totalPages, Math.max(1, nextPage)));

  const pagesToShow = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const result: (number | "dots")[] = [1];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    if (left > 2) result.push("dots");
    for (let nextPage = left; nextPage <= right; nextPage += 1) result.push(nextPage);
    if (right < totalPages - 1) result.push("dots");
    result.push(totalPages);
    return result;
  }, [page, totalPages]);

  const handleClose = () => {
    setConfirmDeleteOpen(false);
    onClose();
  };

  const performDelete = async () => {
    if (!route || deleteSubmitting) return;
    setDeleteSubmitting(true);
    try {
      const response = await fetch(`/api/routes/${route.id}`, { method: "DELETE" });
      if (!response.ok) {
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

  const index = page - 1;
  const main = photos[index] ?? photos[0];
  const prev = index - 1 >= 0 ? photos[index - 1] : null;
  const next = index + 1 < photos.length ? photos[index + 1] : null;
  const authorNick = route.authorUsername?.trim() ?? "";
  const routeTitleFull =
    authorNick.length > 0 ? `${route.title} от ${authorNick}` : route.title;
  const mapsUrl = buildYandexMapsUrlFromString(main?.address ?? route.address);

  return (
    <>
      <div className={styles.overlay} onClick={handleClose} role="presentation">
        <div className={`${styles.modal} ${styles.modalRoute}`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
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
              {main ? (
                <OptimizedPhoto
                  src={main.src}
                  alt={main.alt}
                  width={300}
                  height={375}
                  sizes="300px"
                  className={styles.mainImg}
                  quality={78}
                />
              ) : null}
              {isAdmin ? (
                <button
                  type="button"
                  className={styles.deleteRouteBtn}
                  aria-label="Удалить маршрут"
                  onClick={(event) => {
                    event.stopPropagation();
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
            <div>Метро: {formatMultiValue(main?.metro ?? route.metro)}</div>
            <div>
              Адрес:{" "}
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
                  {main?.address ?? route.address}
                </a>
              ) : (
                main?.address ?? route.address
              )}
            </div>
          </div>

          <div className={styles.pagination}>
            <button className={`${styles.pagBtn} ${!canPrev ? styles.pagBtnDisabled : ""}`} disabled={!canPrev} onClick={() => go(page - 1)} aria-label="Назад">
              ←
            </button>

            <div className={styles.pages}>
              {pagesToShow.map((pageNumber, indexValue) =>
                pageNumber === "dots" ? (
                  <span key={`d-${indexValue}`} className={styles.dots}>
                    ...
                  </span>
                ) : (
                  <button key={pageNumber} className={`${styles.page} ${pageNumber === page ? styles.pageActive : ""}`} onClick={() => go(pageNumber)} aria-current={pageNumber === page ? "page" : undefined}>
                    {pageNumber}
                  </button>
                ),
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

            <button
              type="button"
              className={styles.bigBtn}
              onClick={() => {
                if (!isAuthenticated) {
                  onRequireAuth?.();
                  return;
                }
                onShare?.();
              }}
            >
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
