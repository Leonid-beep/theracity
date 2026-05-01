"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./cabinetPhotoModals.module.css";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import { getOptimizedPhotoUrl, preloadOptimizedPhoto } from "@/app/ui/optimizedPhotoUrl";
import { formatMultiValue } from "@/app/lib/photoMetadata";
import {
  buildYandexMapsUrlFromString,
  copyPhotoShareLink,
} from "@/app/lib/locationLinks";
import {
  fetchRouteOptions,
  invalidateRouteOptionsCache,
  type RouteOption,
} from "@/app/lib/clientRouteOptions";

export type CabinetPhotoItem = {
  id: string;
  src: string;
  title: string;
  metro: string[];
  coords: string;
  lat?: number;
  lng?: number;
  uploaderUsername?: string;
  favoriteCount?: number;
  viewCount?: number;
};

type Step = "photo" | "choice" | "pick" | "create";

const MODAL_PHOTO_WIDTH = 640;
const MODAL_PHOTO_QUALITY = 78;
const LANDSCAPE_MODAL_PHOTO_WIDTH = 960;
const LANDSCAPE_MODAL_PHOTO_QUALITY = 86;

export default function CabinetPhotoModals({
  open,
  photo,
  photos,
  favIds,
  onToggleFav,
  onRemoveFav,
  onClose,
  onRouteCreated,
  onActionSuccess,
}: {
  open: boolean;
  photo: CabinetPhotoItem | null;
  photos: CabinetPhotoItem[];
  favIds: Set<string>;
  onToggleFav: (photoId: string) => void;
  onRemoveFav: (photoId: string) => void;
  onClose: () => void;
  onRouteCreated?: () => void;
  onActionSuccess?: (message: string) => void;
}) {
  const [step, setStep] = useState<Step>("photo");

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [routesLoaded, setRoutesLoaded] = useState(false);

  const [pickPage, setPickPage] = useState(1);
  const [pickedRouteId, setPickedRouteId] = useState<string | null>(null);
  const [photoPage, setPhotoPage] = useState(1);
  const [landscapePhotoIds, setLandscapePhotoIds] = useState<Record<string, boolean>>({});

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const isOpen = open && !!photo;
  const pickPageSize = 4;
  const totalPhotoPages = Math.max(1, photos.length);

  const initialPhotoPage = useMemo(() => {
    if (!photo) return 1;
    const idx = photos.findIndex((p) => p.id === photo.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [photo, photos]);

  useEffect(() => {
    setPhotoPage(initialPhotoPage);
  }, [initialPhotoPage]);

  useEffect(() => {
    if (!isOpen || routesLoaded) return;
    fetchRouteOptions()
      .then((data) => {
        setRoutes(data);
        setRoutesLoaded(true);
      })
      .catch(() => setRoutesLoaded(true));
  }, [isOpen, routesLoaded]);

  const goPhoto = (p: number) => setPhotoPage(Math.min(totalPhotoPages, Math.max(1, p)));
  const canPhotoPrev = photoPage > 1;
  const canPhotoNext = photoPage < totalPhotoPages;

  const photoPagesToShow = useMemo(() => {
    if (totalPhotoPages <= 7) return Array.from({ length: totalPhotoPages }, (_, i) => i + 1);
    const out: (number | "dots")[] = [1];
    const left = Math.max(2, photoPage - 1);
    const right = Math.min(totalPhotoPages - 1, photoPage + 1);
    if (left > 2) out.push("dots");
    for (let p = left; p <= right; p++) out.push(p);
    if (right < totalPhotoPages - 1) out.push("dots");
    out.push(totalPhotoPages);
    return out;
  }, [photoPage, totalPhotoPages]);

  const activePhoto = photos[photoPage - 1] ?? photo;
  const prevPhoto = photoPage > 1 ? photos[photoPage - 2] ?? null : null;
  const nextPhoto = photoPage < totalPhotoPages ? photos[photoPage] ?? null : null;
  const isFavNow = !!activePhoto && favIds.has(activePhoto.id);
  const hasUserRoutes = routes.length > 0;

  useEffect(() => {
    if (!isOpen) return;

    if (prevPhoto?.src) {
      preloadOptimizedPhoto(prevPhoto.src, MODAL_PHOTO_WIDTH, MODAL_PHOTO_QUALITY);
    }

    if (nextPhoto?.src) {
      preloadOptimizedPhoto(nextPhoto.src, MODAL_PHOTO_WIDTH, MODAL_PHOTO_QUALITY);
    }
  }, [isOpen, nextPhoto?.src, prevPhoto?.src]);

  const openAddToRoute = () => {
    if (routesLoaded && !hasUserRoutes) {
      setStep("create");
      return;
    }
    setStep("choice");
  };

  const pickTotalPages = useMemo(() => {
    if (!isOpen) return 1;
    return Math.max(1, Math.ceil(routes.length / pickPageSize));
  }, [isOpen, routes.length]);

  const canPrev = useMemo(() => (isOpen ? pickPage > 1 : false), [isOpen, pickPage]);
  const canNext = useMemo(() => (isOpen ? pickPage < pickTotalPages : false), [isOpen, pickPage, pickTotalPages]);

  const pickItems = useMemo(() => {
    if (!isOpen) return [] as RouteOption[];
    const start = (pickPage - 1) * pickPageSize;
    return routes.slice(start, start + pickPageSize);
  }, [isOpen, routes, pickPage]);

  const pagesToShow = useMemo(() => {
    if (!isOpen) return [1] as (number | "dots")[];
    const total = pickTotalPages;
    const current = pickPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out: (number | "dots")[] = [1];
    const left = Math.max(2, current - 1);
    const right = Math.min(total - 1, current + 1);
    if (left > 2) out.push("dots");
    for (let p = left; p <= right; p++) out.push(p);
    if (right < total - 1) out.push("dots");
    out.push(total);
    return out;
  }, [isOpen, pickPage, pickTotalPages]);

  const goPick = (p: number) => setPickPage(Math.min(pickTotalPages, Math.max(1, p)));

  const closeAll = () => {
    if (step === "create" || step === "pick") {
      invalidateRouteOptionsCache();
    }
    setStep("photo");
    setPickPage(1);
    setPickedRouteId(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    setStep("photo");
    setPickPage(1);
    setPickedRouteId(null);
  }, [isOpen, photo?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  const createConfirm = async () => {
    if (!activePhoto) return;
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim() || "Новый маршрут",
          description: newDesc.trim(),
          photoIds: [activePhoto.id],
        }),
      });
      if (res.ok) {
        onActionSuccess?.("Маршрут создан, фото добавлено");
        onRouteCreated?.();
      }
    } catch { /* ignore */ }
    closeAll();
  };

  const pickConfirm = async () => {
    if (!pickedRouteId || !activePhoto) return;
    try {
      const res = await fetch(`/api/routes/${pickedRouteId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: activePhoto.id }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        const dup = typeof data.message === "string" && data.message.includes("уже");
        onActionSuccess?.(dup ? "Фото уже в этом маршруте" : "Фото добавлено в маршрут");
      }
    } catch { /* ignore */ }
    closeAll();
  };

  if (!isOpen || !photo || !activePhoto) return null;

  const mapsUrl = buildYandexMapsUrlFromString(activePhoto.coords);
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
    try {
      await copyPhotoShareLink(activePhoto.id);
      onActionSuccess?.("\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u0444\u043e\u0442\u043e \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0430");
    } catch {
      onActionSuccess?.("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443");
    }
  };

  return (
    <div className={styles.overlay} onClick={closeAll} role="presentation">
      {step === "photo" ? (
        <div className={`${styles.modal} ${styles.modalPhoto}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={closeAll} />

          <div className={styles.photoTitle} title={activePhoto.title}>
            {activePhoto.title}
          </div>
          {activePhoto.uploaderUsername ? (
            <div className={styles.photoAuthor} title={`Фото добавил ${activePhoto.uploaderUsername}`}>
              от <span>{activePhoto.uploaderUsername}</span>
            </div>
          ) : null}

          <div className={`${styles.photoWrap} ${isActivePhotoLandscape ? styles.photoWrapLandscape : ""}`}>
            <Image
              src={activePhotoUrl}
              alt={activePhoto.title}
              width={300}
              height={375}
              sizes={isActivePhotoLandscape ? "(max-width: 768px) calc(100vw - 48px), 420px" : "300px"}
              className={styles.photoImg}
              unoptimized
              loading="eager"
              onLoad={(event) => rememberPhotoOrientation(activePhoto.id, event.currentTarget)}
            />
            <div className={styles.likeCountBadge}>
              <Image
                src={isFavNow ? "/images/city/heart_red.png" : "/images/city/heart_black.png"}
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
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
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
              {photoPagesToShow.map((p, idx) =>
                p === "dots" ? (
                  <span key={`d-${idx}`} className={styles.dots}>…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.page} ${p === photoPage ? styles.pageActive : ""}`}
                    onClick={() => goPhoto(p)}
                    aria-current={p === photoPage ? "page" : undefined}
                  >
                    {p}
                  </button>
                )
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
            <button type="button" className={styles.bigBtn} onClick={openAddToRoute}>
              <Image src="/images/city/plus.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
              ДОБАВИТЬ В МАРШРУТ
            </button>

            <button
              type="button"
              className={`${styles.bigBtn} ${styles.bigBtnDanger}`}
              onClick={() => {
                if (!isFavNow) onToggleFav(activePhoto.id);
                else onRemoveFav(activePhoto.id);
              }}
            >
              <Image src={isFavNow ? "/images/city/heart_red.png" : "/images/city/heart_black.png"} alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
              {isFavNow ? "УДАЛИТЬ ИЗ ИЗБРАННОГО" : "ДОБАВИТЬ В ИЗБРАННОЕ"}
            </button>

            <button type="button" className={styles.bigBtn} onClick={() => void handleSharePhoto()}>
              <Image src="/images/city/share.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
              {"\u041f\u041e\u0414\u0415\u041b\u0418\u0422\u042c\u0421\u042f \u0424\u041e\u0422\u041e"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "choice" ? (
        <div className={`${styles.modal} ${styles.modalChoice}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={closeAll} />
          <div className={styles.choiceBtns}>
            <button type="button" className={`${styles.choiceBtn} ${styles.choiceBtn1}`} onClick={() => setStep("create")}>
              <Image src="/images/city/plus.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
              СОЗДАТЬ НОВЫЙ МАРШРУТ
            </button>
            {hasUserRoutes ? (
              <button type="button" className={`${styles.choiceBtn} ${styles.choiceBtn2}`} onClick={() => setStep("pick")}>
                <Image src="/images/city/plus.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
                ДОБАВИТЬ В СОЗДАННЫЙ МАРШРУТ
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === "pick" ? (
        <div className={`${styles.modal} ${styles.modalPick}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={closeAll} />

          <div className={styles.pickTitle}>
            <span className={styles.pickMark}>Выберите</span> маршрут для добавления
          </div>

          <div className={styles.pickGrid}>
            {pickItems.map((r) => {
              const active = r.id === pickedRouteId;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`${styles.pickCard} ${active ? styles.pickCardActive : ""}`}
                  onClick={() => setPickedRouteId(r.id)}
                >
                  {r.isEmpty ? (
                    <div className={`${styles.pickThumb} ${styles.pickThumbEmpty}`}>
                      <span className={styles.pickThumbEmptyLabel}>РџСѓСЃС‚РѕР№ РјР°СЂС€СЂСѓС‚</span>
                    </div>
                  ) : (
                    <div className={styles.pickThumb}>
                      <OptimizedPhoto
                        src={r.src}
                        alt={r.title}
                        width={150}
                        height={200}
                        sizes="150px"
                        className={styles.pickImg}
                        quality={70}
                      />
                    </div>
                  )}
                  <div className={styles.pickCap}>{r.title}</div>
                </button>
              );
            })}
          </div>

          <div className={styles.pickPagination}>
            <button
              type="button"
              className={`${styles.pagBtn} ${!canPrev ? styles.pagBtnDisabled : ""}`}
              disabled={!canPrev}
              onClick={() => goPick(pickPage - 1)}
              aria-label="Назад"
            >
              ←
            </button>

            <div className={styles.pages}>
              {pagesToShow.map((p, idx) =>
                p === "dots" ? (
                  <span key={`d-${idx}`} className={styles.dots}>…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.page} ${p === pickPage ? styles.pageActive : ""}`}
                    onClick={() => goPick(p)}
                    aria-current={p === pickPage ? "page" : undefined}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              className={`${styles.pagBtn} ${!canNext ? styles.pagBtnDisabled : ""}`}
              disabled={!canNext}
              onClick={() => goPick(pickPage + 1)}
              aria-label="Вперёд"
            >
              →
            </button>
          </div>

          <button type="button" className={styles.pickConfirm} onClick={pickConfirm}>
            ДОБАВИТЬ В ВЫБРАННЫЙ МАРШРУТ
          </button>
        </div>
      ) : null}

      {step === "create" ? (
        <div className={`${styles.modal} ${styles.modalCreate}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={closeAll} />

          <div className={styles.createTitle}>Создание маршрута</div>

          <div className={styles.createBody}>
            <div className={styles.createField}>
              <div className={styles.createLabel}>ПРИДУМАЙТЕ НАЗВАНИЕ</div>
              <input className={styles.createInput} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>

            <div className={styles.createField}>
              <div className={styles.createLabel}>ПРИДУМАЙТЕ ОПИСАНИЕ</div>
              <textarea className={styles.createTextarea} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>

            <button type="button" className={styles.createConfirm} onClick={createConfirm}>
              СОЗДАТЬ НОВЫЙ МАРШРУТ
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
