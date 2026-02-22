// app/(app)/cabinet/_components/CabinetPhotoModals.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./cabinetPhotoModals.module.css";

export type CabinetPhotoItem = {
  id: number;
  src: string;
  title: string;
  metro: string;
  coords: string;
};

type RouteItem = { id: number; title: string; src: string };
type Step = "photo" | "choice" | "pick" | "create";

export default function CabinetPhotoModals({
  open,
  photo,
  photos,
  favIds,
  onToggleFav,
  onRemoveFav,
  onClose,
}: {
  open: boolean;
  photo: CabinetPhotoItem | null;
  photos: CabinetPhotoItem[];
  favIds: Set<number>;
  onToggleFav: (photoId: number) => void;
  onRemoveFav: (photoId: number) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("photo");

  const [routes, setRoutes] = useState<RouteItem[]>(() =>
    Array.from({ length: 28 }).map((_, i) => ({
      id: i + 1,
      title: ["Прогулка по центру", "Песня", "Дворы и колодцы", "За поворотом", "Красиво"][i % 5],
      src: `/images/city/city-${(i % 7) + 1}.jpg`,
    }))
  );

  const [pickPage, setPickPage] = useState(1);
  const [pickedRouteId, setPickedRouteId] = useState<number | null>(null);
  const [photoPage, setPhotoPage] = useState(1);

  const [newTitle, setNewTitle] = useState("Арт-терапия");
  const [newDesc, setNewDesc] = useState(
    "Маршрут для любителей дворов, тихих улиц, Невского проспекта, уюта, узких улочек и многого другого"
  );
  const [newSpace, setNewSpace] = useState("Дворы");
  const [newMood, setNewMood] = useState("Надежда");
  const [newMetro, setNewMetro] = useState("Удельная");
  const [newWeather, setNewWeather] = useState("Солнечно");

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
  const isFavNow = !!activePhoto && favIds.has(activePhoto.id);

  const pickTotalPages = useMemo(() => {
    if (!isOpen) return 1;
    return Math.max(1, Math.ceil(routes.length / pickPageSize));
  }, [isOpen, routes.length]);

  const canPrev = useMemo(() => (isOpen ? pickPage > 1 : false), [isOpen, pickPage]);
  const canNext = useMemo(() => (isOpen ? pickPage < pickTotalPages : false), [isOpen, pickPage, pickTotalPages]);

  const pickItems = useMemo(() => {
    if (!isOpen) return [] as RouteItem[];
    const start = (pickPage - 1) * pickPageSize;
    return routes.slice(start, start + pickPageSize);
  }, [isOpen, routes, pickPage]);

  const pagesToShow = useMemo(() => {
    if (!isOpen) return [1] as (number | "dots")[];

    const total = pickTotalPages;
    const current = pickPage;

    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const out: (number | "dots")[] = [];
    out.push(1);

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

  const createConfirm = () => {
    if (!activePhoto) return;
    const id = routes.length ? Math.max(...routes.map((r) => r.id)) + 1 : 1;
    const created: RouteItem = {
      id,
      title: newTitle.trim() || "Новый маршрут",
      src: activePhoto.src,
    };
    setRoutes((prev) => [created, ...prev]);
    closeAll();
  };

  const pickConfirm = () => {
    if (!pickedRouteId) return;
    closeAll();
  };

  if (!isOpen || !photo || !activePhoto) return null;

  return (
    <div className={styles.overlay} onClick={closeAll} role="presentation">
      {step === "photo" ? (
        <div className={`${styles.modal} ${styles.modalPhoto}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={closeAll} />

          <div className={styles.photoTitle} title={activePhoto.title}>
            {activePhoto.title}
          </div>

          <div className={styles.photoWrap}>
            <Image src={activePhoto.src} alt={activePhoto.title} width={300} height={375} className={styles.photoImg} />
            {isFavNow ? (
              <Image src="/images/city/heart_red.png" alt="" width={23} height={23} className={styles.likeIcon} aria-hidden="true" />
            ) : null}
          </div>

          <div className={styles.meta}>
            <div>Метро: {activePhoto.metro}</div>
            <div>Адрес: {activePhoto.coords}</div>
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
                  <span key={`d-${idx}`} className={styles.dots}>
                    …
                  </span>
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
            <button type="button" className={styles.bigBtn} onClick={() => setStep("choice")}>
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

            <button type="button" className={`${styles.choiceBtn} ${styles.choiceBtn2}`} onClick={() => setStep("pick")}>
              <Image src="/images/city/plus.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
              ДОБАВИТЬ В СОЗДАННЫЙ МАРШРУТ
            </button>
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
                  <div className={styles.pickThumb}>
                    <Image src={r.src} alt={r.title} width={150} height={200} className={styles.pickImg} />
                  </div>
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
                  <span key={`d-${idx}`} className={styles.dots}>
                    …
                  </span>
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

            <div className={styles.createSelectField}>
              <div className={styles.createLabel}>ТИП ПРОСТРАНСТВА</div>
              <select className={styles.createSelect} value={newSpace} onChange={(e) => setNewSpace(e.target.value)}>
                <option>Дворы</option>
                <option>Улицы</option>
                <option>Брандмауэры</option>
              </select>
            </div>

            <div className={styles.createSelectField}>
              <div className={styles.createLabel}>ЭМОЦИОНАЛЬНЫЙ ФОН</div>
              <select className={styles.createSelect} value={newMood} onChange={(e) => setNewMood(e.target.value)}>
                <option>Надежда</option>
                <option>Спокойствие</option>
                <option>Тревога</option>
              </select>
            </div>

            <div className={styles.createSelectField}>
              <div className={styles.createLabel}>СТАНЦИЯ МЕТРО</div>
              <select className={styles.createSelect} value={newMetro} onChange={(e) => setNewMetro(e.target.value)}>
                <option>Удельная</option>
                <option>Сенная площадь</option>
                <option>Чернышевская</option>
              </select>
            </div>

            <div className={styles.createSelectField}>
              <div className={styles.createLabel}>АТМОСФЕРА</div>
              <select className={styles.createSelect} value={newWeather} onChange={(e) => setNewWeather(e.target.value)}>
                <option>Солнечно</option>
                <option>Пасмурно</option>
                <option>Дождь</option>
              </select>
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
