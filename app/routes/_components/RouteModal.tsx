"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./routeModal.module.css";
import ConfirmDeleteModal from "@/app/cabinet/_components/ConfirmDeleteModal";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import { getOptimizedPhotoUrl, preloadOptimizedPhoto } from "@/app/ui/optimizedPhotoUrl";
import { formatMultiValue } from "@/app/lib/photoMetadata";
import {
  buildYandexMapsRouteUrlFromStrings,
  buildYandexMapsUrlFromString,
} from "@/app/lib/locationLinks";

type RoutePhoto = {
  src: string;
  alt: string;
  metro?: string[];
  address?: string;
};

const ROUTE_MODAL_PHOTO_WIDTH = 640;
const ROUTE_MODAL_PHOTO_QUALITY = 78;

type RouteItem = {
  id: string;
  title: string;
  desc: string;
  authorUsername?: string;
  metro: string[];
  address: string;
  photos: RoutePhoto[];
  canEdit?: boolean;
};

export default function RouteModal({
  open,
  route,
  likedRouteIds,
  onToggleLike,
  onClose,
  isAdmin,
  isAuthenticated,
  onRequireAuth,
  onShare,
  onEdit,
  onRouteDeleted,
}: {
  open: boolean;
  route: RouteItem | null;
  likedRouteIds: Set<string>;
  onToggleLike: (routeId: string) => void;
  onClose: () => void;
  isAdmin?: boolean;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
  onShare?: (routeId: string) => void;
  onEdit?: (route: RouteItem) => void;
  onRouteDeleted?: (routeId: string) => void;
}) {
  const [photoPage, setPhotoPage] = useState(1);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const activeRoute = route;
  const photos = activeRoute?.photos ?? [];
  const totalPhotos = photos.length;
  const photoIndex = totalPhotos > 0 ? photoPage - 1 : 0;
  const mainPhoto = totalPhotos > 0 ? (photos[photoIndex] ?? photos[0]) : undefined;
  const prevPhoto = totalPhotos > 0 && photoIndex - 1 >= 0 ? photos[photoIndex - 1] : null;
  const nextPhoto = totalPhotos > 0 && photoIndex + 1 < photos.length ? photos[photoIndex + 1] : null;

  useEffect(() => {
    if (!open) return;
    setPhotoPage(1);
    setConfirmDeleteOpen(false);
  }, [open, activeRoute?.id]);

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

  const goPhoto = (nextPage: number) => {
    if (totalPhotos === 0) return;
    setPhotoPage(Math.min(totalPhotos, Math.max(1, nextPage)));
  };

  const canPhotoPrev = totalPhotos > 1 && photoPage > 1;
  const canPhotoNext = totalPhotos > 1 && photoPage < totalPhotos;

  const photoPagesToShow = useMemo(() => {
    if (totalPhotos <= 7) {
      return Array.from({ length: totalPhotos }, (_, index) => index + 1);
    }

    const result: (number | "dots")[] = [1];
    const left = Math.max(2, photoPage - 1);
    const right = Math.min(totalPhotos - 1, photoPage + 1);

    if (left > 2) result.push("dots");
    for (let nextPage = left; nextPage <= right; nextPage += 1) {
      result.push(nextPage);
    }
    if (right < totalPhotos - 1) result.push("dots");
    result.push(totalPhotos);

    return result;
  }, [photoPage, totalPhotos]);

  const handleClose = () => {
    setConfirmDeleteOpen(false);
    onClose();
  };

  const performDelete = async () => {
    if (!activeRoute || deleteSubmitting) return;

    setDeleteSubmitting(true);

    try {
      const response = await fetch(`/api/routes/${activeRoute.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setConfirmDeleteOpen(false);
        return;
      }

      onRouteDeleted?.(activeRoute.id);
      setConfirmDeleteOpen(false);
      handleClose();
    } catch {
      setConfirmDeleteOpen(false);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (!open || !activeRoute) return null;
  const authorNick = activeRoute.authorUsername?.trim() ?? "";
  const routeTitleFull =
    authorNick.length > 0 ? `${activeRoute.title} от ${authorNick}` : activeRoute.title;
  const mapsUrl = buildYandexMapsUrlFromString(mainPhoto?.address ?? activeRoute.address);
  const routeMapsUrl = buildYandexMapsRouteUrlFromStrings(
    photos.map((photo) => photo.address),
  );
  const liked = likedRouteIds.has(activeRoute.id);
  const canEdit = Boolean(activeRoute.canEdit);
  const mainPhotoUrl = mainPhoto
    ? getOptimizedPhotoUrl(mainPhoto.src, ROUTE_MODAL_PHOTO_WIDTH, ROUTE_MODAL_PHOTO_QUALITY)
    : null;

  useEffect(() => {
    if (!open) return;

    if (prevPhoto?.src) {
      preloadOptimizedPhoto(prevPhoto.src, ROUTE_MODAL_PHOTO_WIDTH, ROUTE_MODAL_PHOTO_QUALITY);
    }

    if (nextPhoto?.src) {
      preloadOptimizedPhoto(nextPhoto.src, ROUTE_MODAL_PHOTO_WIDTH, ROUTE_MODAL_PHOTO_QUALITY);
    }
  }, [nextPhoto?.src, open, prevPhoto?.src]);

  return (
    <>
      <div className={styles.overlay} onClick={handleClose} role="presentation">
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
            onClick={handleClose}
          />

          <div className={styles.routeTitle} title={routeTitleFull}>
            <span className={styles.routeTitleMain}>{activeRoute.title}</span>
            {authorNick ? (
              <span className={styles.routeTitleAuthor}>
                {" "}
                от <span className={styles.routeTitleNick}>{authorNick}</span>
              </span>
            ) : null}
          </div>

          <div className={styles.routeDesc}>{activeRoute.desc}</div>

          <div className={styles.photoRow}>
            {prevPhoto ? (
              <button
                type="button"
                className={styles.sideThumb}
                aria-label="Предыдущее фото"
                onClick={() => goPhoto(photoPage - 1)}
              >
                <OptimizedPhoto
                  src={prevPhoto.src}
                  alt={prevPhoto.alt}
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
              {mainPhoto && mainPhotoUrl ? (
                <Image
                  src={mainPhotoUrl}
                  alt={mainPhoto.alt}
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
                  <svg
                    className={styles.deleteRouteIcon}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    aria-hidden
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              ) : null}

              {canEdit ? (
                <button
                  type="button"
                  className={`${styles.editRouteBtn} ${isAdmin ? styles.editRouteBtnOffset : ""}`}
                  aria-label="Редактировать маршрут"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit?.(activeRoute);
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

              {totalPhotos > 1 ? (
                <div className={`${styles.pagination} ${styles.photoPagination}`}>
                  <button
                    className={`${styles.pagBtn} ${!canPhotoPrev ? styles.pagBtnDisabled : ""}`}
                    disabled={!canPhotoPrev}
                    onClick={() => goPhoto(photoPage - 1)}
                    aria-label="Назад"
                  >
                    ←
                  </button>

                  <div className={`${styles.pages} ${styles.photoPages}`}>
                    {photoPagesToShow.map((pageNumber, indexValue) =>
                      pageNumber === "dots" ? (
                        <span key={`d-${indexValue}`} className={styles.dots}>
                          ...
                        </span>
                      ) : (
                        <button
                          key={pageNumber}
                          className={`${styles.page} ${pageNumber === photoPage ? styles.pageActive : ""}`}
                          onClick={() => goPhoto(pageNumber)}
                          aria-current={pageNumber === photoPage ? "page" : undefined}
                        >
                          {pageNumber}
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    className={`${styles.pagBtn} ${!canPhotoNext ? styles.pagBtnDisabled : ""}`}
                    disabled={!canPhotoNext}
                    onClick={() => goPhoto(photoPage + 1)}
                    aria-label="Вперёд"
                  >
                    →
                  </button>
                </div>
              ) : null}
            </div>

            {nextPhoto ? (
              <button
                type="button"
                className={styles.sideThumb}
                aria-label="Следующее фото"
                onClick={() => goPhoto(photoPage + 1)}
              >
                <OptimizedPhoto
                  src={nextPhoto.src}
                  alt={nextPhoto.alt}
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
            <div>Метро: {formatMultiValue(mainPhoto?.metro ?? activeRoute.metro)}</div>
            <div>
              Адрес:{" "}
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.metaLink}
                >
                  {mainPhoto?.address ?? activeRoute.address}
                </a>
              ) : (
                mainPhoto?.address ?? activeRoute.address
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.bigBtn}
              onClick={() => onToggleLike(activeRoute.id)}
            >
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
                onShare?.(activeRoute.id);
              }}
            >
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
