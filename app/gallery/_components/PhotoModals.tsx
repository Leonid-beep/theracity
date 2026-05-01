"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import styles from "./photoModals.module.css";
import type { PhotoItem } from "../page";
import ConfirmDeleteModal from "@/app/cabinet/_components/ConfirmDeleteModal";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import { getOptimizedPhotoUrl, preloadOptimizedPhoto } from "@/app/ui/optimizedPhotoUrl";
import { formatMultiValue } from "@/app/lib/photoMetadata";
import { buildYandexMapsUrl, copyPhotoShareLink } from "@/app/lib/locationLinks";
import { invalidateFilterOptionsCache } from "@/app/lib/clientFilters";
import {
  fetchRouteOptions,
  invalidateRouteOptionsCache,
  type RouteOption,
} from "@/app/lib/clientRouteOptions";

type Step = "photo" | "routeChoice" | "pickRoute" | "createRoute";

const MODAL_PHOTO_WIDTH = 640;
const MODAL_PHOTO_QUALITY = 78;
const LANDSCAPE_MODAL_PHOTO_WIDTH = 960;
const LANDSCAPE_MODAL_PHOTO_QUALITY = 86;
const UploadPhotoModal = dynamic(() => import("./UploadPhotoModal"), {
  ssr: false,
});

export default function PhotoModals(props: {
  photo: PhotoItem | null;
  photos: PhotoItem[];
  onClose: () => void;
  liked: Set<string>;
  onToggleLike: (photoId: string) => void;
  isAdmin?: boolean;
  isAuthenticated?: boolean;
  onRequireAuth?: (photoId?: string | null) => void;
  onPhotoDeleted?: (photoId: string) => void;
  onPhotoUpdated?: (photo: PhotoItem) => void;
  onActionSuccess?: (message: string) => void;
  onBreakShareLink?: (photoToKeep?: PhotoItem | null) => void;
}) {
  const {
    photo,
    photos,
    onClose,
    liked,
    onToggleLike,
    isAdmin,
    isAuthenticated,
    onRequireAuth,
    onPhotoDeleted,
    onPhotoUpdated,
    onActionSuccess,
    onBreakShareLink,
  } = props;

  const [step, setStep] = useState<Step>("photo");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [landscapePhotoIds, setLandscapePhotoIds] = useState<Record<string, boolean>>({});

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [routesLoaded, setRoutesLoaded] = useState(false);

  const [pickPage, setPickPage] = useState(1);
  const [pickedRouteId, setPickedRouteId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const totalPhotoPages = Math.max(1, photos.length);
  const activePhotoIndex = useMemo(() => {
    if (!photo) return -1;
    return photos.findIndex((item) => item.id === photo.id);
  }, [photo, photos]);
  const photoPage = activePhotoIndex >= 0 ? activePhotoIndex + 1 : 1;

  useEffect(() => {
    if (!photo) return;

    if (!isAuthenticated) {
      setRoutes([]);
      setRoutesLoaded(true);
      return;
    }

    if (routesLoaded) return;
    fetchRouteOptions()
      .then((data) => {
        setRoutes(data);
        setRoutesLoaded(true);
      })
      .catch(() => setRoutesLoaded(true));
  }, [photo, routesLoaded, isAuthenticated]);

  useEffect(() => {
    if (!photo) {
      setEditOpen(false);
      setRoutes([]);
      setRoutesLoaded(false);
    }
  }, [photo]);

  const breakShareLink = (photoToKeep?: PhotoItem | null) => {
    onBreakShareLink?.(photoToKeep);
  };

  const goPhoto = (nextPage: number) => {
    const nextPhotoItem = photos[nextPage - 1] ?? photo;
    breakShareLink(nextPhotoItem);
  };
  const canPhotoPrev = activePhotoIndex > 0;
  const canPhotoNext = activePhotoIndex >= 0 && activePhotoIndex < totalPhotoPages - 1;

  const photoPagesToShow = useMemo(() => {
    if (totalPhotoPages <= 7) return Array.from({ length: totalPhotoPages }, (_, index) => index + 1);
    const result: (number | "dots")[] = [1];
    const left = Math.max(2, photoPage - 1);
    const right = Math.min(totalPhotoPages - 1, photoPage + 1);
    if (left > 2) result.push("dots");
    for (let nextPage = left; nextPage <= right; nextPage += 1) result.push(nextPage);
    if (right < totalPhotoPages - 1) result.push("dots");
    result.push(totalPhotoPages);
    return result;
  }, [photoPage, totalPhotoPages]);

  const open = !!photo;
  const activePhoto = photo;
  const prevPhoto = activePhotoIndex > 0 ? photos[activePhotoIndex - 1] ?? null : null;
  const nextPhoto =
    activePhotoIndex >= 0 && activePhotoIndex < totalPhotoPages - 1
      ? photos[activePhotoIndex + 1] ?? null
      : null;
  const likedNow = !!activePhoto && liked.has(activePhoto.id);
  const hasUserRoutes = routes.length > 0;

  useEffect(() => {
    if (!open) return;

    if (prevPhoto?.src) {
      preloadOptimizedPhoto(prevPhoto.src, MODAL_PHOTO_WIDTH, MODAL_PHOTO_QUALITY);
    }

    if (nextPhoto?.src) {
      preloadOptimizedPhoto(nextPhoto.src, MODAL_PHOTO_WIDTH, MODAL_PHOTO_QUALITY);
    }
  }, [nextPhoto?.src, open, prevPhoto?.src]);

  const openAddToRoute = () => {
    breakShareLink(activePhoto);

    if (!isAuthenticated) {
      onRequireAuth?.(activePhoto?.id);
      return;
    }

    if (routesLoaded && !hasUserRoutes) {
      setStep("createRoute");
      return;
    }
    setStep("routeChoice");
  };

  const closeAll = () => {
    breakShareLink();
    if (step === "createRoute") {
      invalidateRouteOptionsCache();
    }
    setStep("photo");
    setPickPage(1);
    setPickedRouteId(null);
    setConfirmDeleteOpen(false);
    setEditOpen(false);
    onClose();
  };

  const performDelete = async () => {
    if (!activePhoto || deleteSubmitting) return;
    breakShareLink();
    setDeleteSubmitting(true);
    try {
      const response = await fetch(`/api/photos/${activePhoto.id}`, { method: "DELETE" });
      if (!response.ok) {
        setConfirmDeleteOpen(false);
        return;
      }
      onActionSuccess?.("Фото удалено");
      invalidateFilterOptionsCache();
      invalidateRouteOptionsCache();
      onPhotoDeleted?.(activePhoto.id);
      setConfirmDeleteOpen(false);
      closeAll();
    } catch {
      setConfirmDeleteOpen(false);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const pickPageSize = 4;
  const pickTotalPages = Math.max(1, Math.ceil(routes.length / pickPageSize));
  const canPrev = pickPage > 1;
  const canNext = pickPage < pickTotalPages;

  const pickItems = useMemo(() => {
    const start = (pickPage - 1) * pickPageSize;
    return routes.slice(start, start + pickPageSize);
  }, [routes, pickPage]);

  const pagesToShow = useMemo(() => {
    if (pickTotalPages <= 7) return Array.from({ length: pickTotalPages }, (_, index) => index + 1);
    const result: (number | "dots")[] = [1];
    const left = Math.max(2, pickPage - 1);
    const right = Math.min(pickTotalPages - 1, pickPage + 1);
    if (left > 2) result.push("dots");
    for (let nextPage = left; nextPage <= right; nextPage += 1) result.push(nextPage);
    if (right < pickTotalPages - 1) result.push("dots");
    result.push(pickTotalPages);
    return result;
  }, [pickPage, pickTotalPages]);

  const goPick = (nextPage: number) => setPickPage(Math.min(pickTotalPages, Math.max(1, nextPage)));

  const handleConfirmPick = async () => {
    if (!pickedRouteId || !activePhoto) return;
    breakShareLink(activePhoto);
    if (!isAuthenticated) {
      onRequireAuth?.(activePhoto.id);
      return;
    }

    try {
      const response = await fetch(`/api/routes/${pickedRouteId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: activePhoto.id }),
      });
      if (response.ok) {
        invalidateRouteOptionsCache();
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        const duplicate = typeof data.message === "string" && data.message.includes("уже");
        onActionSuccess?.(duplicate ? "Фото уже в этом маршруте" : "Фото добавлено в маршрут");
      }
    } catch {
      /* ignore */
    }
    closeAll();
  };

  const handleCreateConfirm = async () => {
    if (!activePhoto) return;
    breakShareLink(activePhoto);
    if (!isAuthenticated) {
      onRequireAuth?.(activePhoto.id);
      return;
    }

    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim() || "Новый маршрут",
          description: newDesc.trim(),
          photoIds: [activePhoto.id],
        }),
      });
      if (response.ok) {
        onActionSuccess?.("Маршрут создан, фото добавлено");
      }
    } catch {
      /* ignore */
    }
    closeAll();
  };

  if (!open || !photo || !activePhoto) return null;

  const mapsUrl = buildYandexMapsUrl({ lat: activePhoto.lat, lng: activePhoto.lng });
  const isActivePhotoLandscape = landscapePhotoIds[activePhoto.id] === true;
  const activePhotoUrl = getOptimizedPhotoUrl(
    activePhoto.src,
    isActivePhotoLandscape ? LANDSCAPE_MODAL_PHOTO_WIDTH : MODAL_PHOTO_WIDTH,
    isActivePhotoLandscape ? LANDSCAPE_MODAL_PHOTO_QUALITY : MODAL_PHOTO_QUALITY,
  );
  const rememberPhotoOrientation = (photoId: string, image: HTMLImageElement) => {
    const isLandscape = image.naturalWidth > image.naturalHeight;
    setLandscapePhotoIds((prev) =>
      prev[photoId] === isLandscape ? prev : { ...prev, [photoId]: isLandscape },
    );
  };

  const handleSharePhoto = async () => {
    breakShareLink(activePhoto);

    try {
      await copyPhotoShareLink(activePhoto.id);
      onActionSuccess?.("\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u0444\u043e\u0442\u043e \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0430");
    } catch {
      onActionSuccess?.("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443");
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={closeAll} role="presentation">
        {step === "photo" ? (
          <div className={`${styles.modal} ${styles.modalPhoto}`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <button className={styles.closeBtn} onClick={closeAll} aria-label="Закрыть" type="button" />
            <div className={styles.photoTitle}>{activePhoto.title}</div>
            {activePhoto.uploaderUsername ? (
              <div className={styles.photoAuthor} title={`Фото добавил ${activePhoto.uploaderUsername}`}>
                от <span>{activePhoto.uploaderUsername}</span>
              </div>
            ) : null}

            <div className={`${styles.photoWrap} ${isActivePhotoLandscape ? styles.photoWrapLandscape : ""}`}>
              <Image
                key={activePhoto.id}
                src={activePhotoUrl}
                alt={activePhoto.title}
                width={300}
                height={375}
                sizes={isActivePhotoLandscape ? "(max-width: 768px) calc(100vw - 48px), 420px" : "300px"}
                className={styles.photoImg}
                unoptimized
                loading="eager"
                priority
                onLoad={(event) => rememberPhotoOrientation(activePhoto.id, event.currentTarget)}
              />
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    className={styles.deletePhotoBtn}
                    aria-label="Удалить фото"
                    onClick={(event) => {
                      event.stopPropagation();
                      breakShareLink(activePhoto);
                      setConfirmDeleteOpen(true);
                    }}
                  >
                    <svg className={styles.deletePhotoIcon} width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={styles.editPhotoBtn}
                    aria-label="Редактировать фото"
                    onClick={(event) => {
                      event.stopPropagation();
                      breakShareLink(activePhoto);
                      setEditOpen(true);
                    }}
                  >
                    <svg className={styles.editPhotoIcon} width="17" height="17" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" strokeLinecap="round" />
                      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              ) : null}
              <div className={styles.likeCountBadge}>
                <Image
                  src={likedNow ? "/images/city/heart_red.png" : "/images/city/heart_black.png"}
                  alt=""
                  width={16}
                  height={16}
                  className={styles.likeCountIcon}
                  aria-hidden="true"
                />
                <span>{activePhoto.favoriteCount ?? 0}</span>
              </div>
            </div>

            <div className={styles.meta}>
              <div>Метро: {formatMultiValue(activePhoto.metro)}</div>
              <div>
                Адрес:{" "}
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "underline" }}
                    onClick={() => breakShareLink(activePhoto)}
                  >
                    {activePhoto.coords}
                  </a>
                ) : (
                  activePhoto.coords
                )}
              </div>
            </div>

            <div className={styles.photoPagination}>
              <button
                className={`${styles.pagBtn} ${!canPhotoPrev ? styles.pagBtnDisabled : ""}`}
                disabled={!canPhotoPrev}
                onClick={() => goPhoto(photoPage - 1)}
                aria-label="Назад"
                type="button"
              >
                ←
              </button>

              <div className={styles.pages}>
                {photoPagesToShow.map((pageNumber, index) =>
                  pageNumber === "dots" ? (
                    <span key={`d-${index}`} className={styles.dots}>...</span>
                  ) : (
                    <button
                      key={pageNumber}
                      className={`${styles.page} ${pageNumber === photoPage ? styles.pageActive : ""}`}
                      onClick={() => goPhoto(pageNumber)}
                      aria-current={pageNumber === photoPage ? "page" : undefined}
                      type="button"
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
                type="button"
              >
                →
              </button>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.bigBtn}
                onClick={() => {
                  breakShareLink(activePhoto);
                  onToggleLike(activePhoto.id);
                }}
              >
                <Image
                  src={likedNow ? "/images/city/heart_red.png" : "/images/city/heart_black.png"}
                  alt=""
                  width={23}
                  height={23}
                  className={styles.btnImg}
                  aria-hidden="true"
                />
                {likedNow ? "УДАЛИТЬ ИЗ ИЗБРАННОГО" : "ДОБАВИТЬ В ИЗБРАННОЕ"}
              </button>

              <button type="button" className={styles.bigBtn} onClick={openAddToRoute}>
                <Image src="/images/city/plus.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
                ДОБАВИТЬ В МАРШРУТ
              </button>

              <button type="button" className={styles.bigBtn} onClick={() => void handleSharePhoto()}>
                <Image src="/images/city/share.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
                {"\u041f\u041e\u0414\u0415\u041b\u0418\u0422\u042c\u0421\u042f \u0424\u041e\u0422\u041e"}
              </button>
            </div>
          </div>
        ) : null}

        {step === "routeChoice" ? (
          <div className={`${styles.modal} ${styles.modalChoice}`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <button className={styles.closeBtn} onClick={closeAll} aria-label="Закрыть" type="button" />
            <div className={styles.choiceBtns}>
              <button type="button" className={`${styles.choiceBtn} ${styles.choiceBtn1}`} onClick={() => setStep("createRoute")}>
                <Image src="/images/city/plus.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
                СОЗДАТЬ НОВЫЙ МАРШРУТ
              </button>
              {hasUserRoutes ? (
                <button type="button" className={`${styles.choiceBtn} ${styles.choiceBtn2}`} onClick={() => setStep("pickRoute")}>
                  <Image src="/images/city/plus.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
                  ДОБАВИТЬ В СОЗДАННЫЙ МАРШРУТ
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === "pickRoute" ? (
          <div className={`${styles.modal} ${styles.modalPick}`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <button className={styles.closeBtn} onClick={closeAll} aria-label="Закрыть" type="button" />

            <div className={styles.pickTitle}>
              <span className={styles.pickMark}>Выберите</span> маршрут для добавления
            </div>

            <div className={styles.pickGrid}>
              {pickItems.map((route) => {
                const active = route.id === pickedRouteId;
                return (
                  <button
                    key={route.id}
                    type="button"
                    className={`${styles.pickCard} ${active ? styles.pickCardActive : ""}`}
                    onClick={() => setPickedRouteId(route.id)}
                  >
                    {route.isEmpty ? (
                      <div className={`${styles.pickThumb} ${styles.pickThumbEmpty}`}>
                        <span className={styles.pickThumbEmptyLabel}>Пустой маршрут</span>
                      </div>
                    ) : (
                      <div className={styles.pickThumb}>
                        <OptimizedPhoto
                          src={route.src}
                          alt={route.title}
                          width={150}
                          height={200}
                          sizes="150px"
                          className={styles.pickImg}
                          quality={70}
                        />
                      </div>
                    )}
                    <div className={styles.pickCap}>{route.title}</div>
                  </button>
                );
              })}
            </div>

            <div className={styles.pickPagination}>
              <button
                className={`${styles.pagBtn} ${!canPrev ? styles.pagBtnDisabled : ""}`}
                disabled={!canPrev}
                onClick={() => goPick(pickPage - 1)}
                aria-label="Назад"
                type="button"
              >
                ←
              </button>

              <div className={styles.pages}>
                {pagesToShow.map((pageNumber, index) =>
                  pageNumber === "dots" ? (
                    <span key={`d-${index}`} className={styles.dots}>...</span>
                  ) : (
                    <button
                      key={pageNumber}
                      className={`${styles.page} ${pageNumber === pickPage ? styles.pageActive : ""}`}
                      onClick={() => goPick(pageNumber)}
                      type="button"
                    >
                      {pageNumber}
                    </button>
                  ),
                )}
              </div>

              <button
                className={`${styles.pagBtn} ${!canNext ? styles.pagBtnDisabled : ""}`}
                disabled={!canNext}
                onClick={() => goPick(pickPage + 1)}
                aria-label="Вперёд"
                type="button"
              >
                →
              </button>
            </div>

            <button type="button" className={styles.pickConfirm} onClick={handleConfirmPick}>
              ДОБАВИТЬ В ВЫБРАННЫЙ МАРШРУТ
            </button>
          </div>
        ) : null}

        {step === "createRoute" ? (
          <div className={`${styles.modal} ${styles.modalCreate}`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <button className={styles.closeBtn} onClick={closeAll} aria-label="Закрыть" type="button" />

            <div className={styles.createTitle}>Создание маршрута</div>

            <div className={styles.createBody}>
              <div className={styles.createField}>
                <div className={styles.createLabel}>ПРИДУМАЙТЕ НАЗВАНИЕ</div>
                <input className={styles.createInput} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
              </div>

              <div className={styles.createField}>
                <div className={styles.createLabel}>ПРИДУМАЙТЕ ОПИСАНИЕ</div>
                <textarea className={styles.createTextarea} value={newDesc} onChange={(event) => setNewDesc(event.target.value)} />
              </div>

              <button type="button" className={styles.createConfirm} onClick={handleCreateConfirm}>
                СОЗДАТЬ НОВЫЙ МАРШРУТ
              </button>
            </div>
          </div>
        ) : null}
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
      {isAdmin && activePhoto ? (
        <UploadPhotoModal
          open={editOpen}
          mode="edit"
          initialPhoto={{
            id: activePhoto.id,
            title: activePhoto.title,
            metro: activePhoto.metro,
            lat: activePhoto.lat,
            lng: activePhoto.lng,
            spaceType: activePhoto.spaceType,
            mood: activePhoto.mood,
            atmosphere: activePhoto.atmosphere,
          }}
          onClose={() => setEditOpen(false)}
          onUploaded={(updatedPhoto) => {
            if (updatedPhoto) {
              onPhotoUpdated?.(updatedPhoto);
              onActionSuccess?.("Фото обновлено");
            }
          }}
        />
      ) : null}
    </>
  );
}
