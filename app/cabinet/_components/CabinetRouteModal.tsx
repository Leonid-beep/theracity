"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "../../routes/_components/routeModal.module.css";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import { getOptimizedPhotoUrl, preloadOptimizedPhoto } from "@/app/ui/optimizedPhotoUrl";
import { formatMultiValue } from "@/app/lib/photoMetadata";
import {
  buildYandexMapsRouteUrlFromStrings,
  buildYandexMapsUrlFromString,
} from "@/app/lib/locationLinks";

const ROUTE_MODAL_PHOTO_WIDTH = 640;
const ROUTE_MODAL_PHOTO_QUALITY = 78;

export type CabinetRouteItem = {
  id: string;
  title: string;
  desc: string;
  isPublished?: boolean;
  metro: string[];
  address: string;
  photos: { id: string; src: string; alt: string; metro?: string[]; address?: string }[];
  canEdit?: boolean;
};

export default function CabinetRouteModal({
  open,
  route,
  showPublish,
  onPublish,
  onShare,
  onEdit,
  onClose,
  actionLabel,
  onDelete,
}: {
  open: boolean;
  route: CabinetRouteItem | null;
  showPublish?: boolean;
  onPublish?: () => void;
  onShare?: () => void;
  onEdit?: (route: CabinetRouteItem) => void;
  onClose: () => void;
  actionLabel: string;
  onDelete: () => void;
}) {
  const photos = route?.photos ?? [];
  const hasPhotos = photos.length > 0;
  const totalPages = photos.length;
  const [page, setPage] = useState(1);
  const index = hasPhotos ? page - 1 : 0;
  const main = hasPhotos ? (photos[index] ?? photos[0]) : undefined;
  const prev = hasPhotos && index - 1 >= 0 ? photos[index - 1] : null;
  const next = hasPhotos && index + 1 < photos.length ? photos[index + 1] : null;

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open, route?.id]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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

  const go = (nextPage: number) => {
    if (!hasPhotos) return;
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
  };

  const pagesToShow = useMemo(() => {
    if (!hasPhotos || totalPages === 0) return [];
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const result: (number | "dots")[] = [1];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);

    if (left > 2) result.push("dots");
    for (let nextPage = left; nextPage <= right; nextPage += 1) result.push(nextPage);
    if (right < totalPages - 1) result.push("dots");
    result.push(totalPages);

    return result;
  }, [page, totalPages, hasPhotos]);

  if (!open || !route) return null;
  const mapsUrl = buildYandexMapsUrlFromString(main?.address ?? route.address);
  const routeMapsUrl = buildYandexMapsRouteUrlFromStrings(
    photos.map((photo) => photo.address),
  );
  const canEdit = Boolean(route.canEdit);
  const mainPhotoUrl = main
    ? getOptimizedPhotoUrl(main.src, ROUTE_MODAL_PHOTO_WIDTH, ROUTE_MODAL_PHOTO_QUALITY)
    : null;

  useEffect(() => {
    if (!open) return;

    if (prev?.src) {
      preloadOptimizedPhoto(prev.src, ROUTE_MODAL_PHOTO_WIDTH, ROUTE_MODAL_PHOTO_QUALITY);
    }

    if (next?.src) {
      preloadOptimizedPhoto(next.src, ROUTE_MODAL_PHOTO_WIDTH, ROUTE_MODAL_PHOTO_QUALITY);
    }
  }, [next?.src, open, prev?.src]);

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${styles.modal} ${styles.modalRoute}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Закрыть"
          onClick={onClose}
        />

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
            {hasPhotos && main && mainPhotoUrl ? (
              <Image
                src={mainPhotoUrl}
                alt={main.alt}
                width={300}
                height={375}
                sizes="300px"
                className={styles.mainImg}
                unoptimized
                loading="eager"
              />
            ) : (
              <p className={styles.emptyRoutePhotos}>В этом маршруте пока нет фотографий</p>
            )}

            {canEdit ? (
              <button
                type="button"
                className={styles.editRouteBtn}
                aria-label="Редактировать маршрут"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit?.(route);
                }}
              >
                <svg
                  className={styles.editRouteIcon}
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  aria-hidden
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 20h9" strokeLinecap="round" />
                  <path
                    d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}

            {totalPages > 1 ? (
              <div className={`${styles.pagination} ${styles.photoPagination}`}>
                <button
                  className={`${styles.pagBtn} ${!canPrev ? styles.pagBtnDisabled : ""}`}
                  disabled={!canPrev}
                  onClick={() => go(page - 1)}
                  aria-label="Назад"
                >
                  ←
                </button>

                <div className={`${styles.pages} ${styles.photoPages}`}>
                  {pagesToShow.map((pageNumber, indexValue) =>
                    pageNumber === "dots" ? (
                      <span key={`d-${indexValue}`} className={styles.dots}>
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNumber}
                        className={`${styles.page} ${pageNumber === page ? styles.pageActive : ""}`}
                        onClick={() => go(pageNumber)}
                        aria-current={pageNumber === page ? "page" : undefined}
                      >
                        {pageNumber}
                      </button>
                    ),
                  )}
                </div>

                <button
                  className={`${styles.pagBtn} ${!canNext ? styles.pagBtnDisabled : ""}`}
                  disabled={!canNext}
                  onClick={() => go(page + 1)}
                  aria-label="Вперёд"
                >
                  →
                </button>
              </div>
            ) : null}
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
          <div>
            Адрес:{" "}
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.metaLink}
              >
                {(main?.address ?? route.address) || "—"}
              </a>
            ) : (
              (main?.address ?? route.address) || "—"
            )}
          </div>
        </div>

        <div className={styles.actions}>
          {showPublish && !route.isPublished ? (
            <button type="button" className={styles.bigBtn} onClick={onPublish}>
              <Image
                src="/images/city/share.png"
                alt=""
                width={23}
                height={23}
                className={styles.btnImg}
                aria-hidden="true"
              />
              ОПУБЛИКОВАТЬ МАРШРУТ
            </button>
          ) : (
            <button type="button" className={styles.bigBtn} onClick={onShare}>
              <Image
                src="/images/city/share.png"
                alt=""
                width={23}
                height={23}
                className={styles.btnImg}
                aria-hidden="true"
              />
              ПОДЕЛИТЬСЯ МАРШРУТОМ
            </button>
          )}

          {routeMapsUrl ? (
            <a
              href={routeMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.bigBtn} ${styles.yandexRouteBtn}`}
              aria-label={"\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u042F\u043D\u0434\u0435\u043A\u0441 \u041A\u0430\u0440\u0442\u0430\u0445"}
            >
              РћРўРљР Р«РўР¬ Р’ РЇРќР”Р•РљРЎ РљРђР РўРђРҐ
            </a>
          ) : null}

          <button
            type="button"
            className={`${styles.bigBtn} ${styles.bigBtnDanger}`}
            onClick={onDelete}
          >
            <Image
              src="/images/city/trash.png"
              alt=""
              width={23}
              height={23}
              className={styles.btnImg}
              aria-hidden="true"
            />
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
