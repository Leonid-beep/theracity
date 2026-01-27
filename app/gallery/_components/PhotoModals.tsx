// app/(app)/gallery/_components/PhotoModals.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import styles from "./photoModals.module.css";
import type { PhotoItem } from "../page";

type RouteItem = { id: number; title: string; src: string };
type Step = "photo" | "routeChoice" | "pickRoute" | "createRoute";

export default function PhotoModals(props: {
  photo: PhotoItem | null;
  onClose: () => void;
  liked: Set<number>;
  onToggleLike: (photoId: number) => void;
}) {
  const { photo, onClose, liked, onToggleLike } = props;

  const [step, setStep] = useState<Step>("photo");

  const [routes, setRoutes] = useState<RouteItem[]>(() =>
    Array.from({ length: 12 }).map((_, i) => ({
      id: i + 1,
      title: ["Прогулка по центру", "Песня", "Дворы и колодцы", "За поворотом", "Красиво"][i % 5],
      src: `/images/city/city-${(i % 7) + 1}.jpg`,
    }))
  );

  const [pickPage, setPickPage] = useState(1);
  const [pickedRouteId, setPickedRouteId] = useState<number | null>(null);

  const [newTitle, setNewTitle] = useState("Арт-терапия");
  const [newDesc, setNewDesc] = useState(
    "Маршрут для любителей дворов, тихих улиц, Невского проспекта, уюта, узких улочек и многого другого"
  );
  const [newSpace, setNewSpace] = useState("Дворы");
  const [newMood, setNewMood] = useState("Надежда");
  const [newMetro, setNewMetro] = useState("Удельная");
  const [newWeather, setNewWeather] = useState("Солнечно");

  const likedNow = !!photo && liked.has(photo.id);

  const closeAll = () => {
    setStep("photo");
    setPickPage(1);
    setPickedRouteId(null);
    onClose();
  };

  const open = !!photo;

  const pickPageSize = 4;
  const pickTotalPages = Math.max(1, Math.ceil(routes.length / pickPageSize));
  const canPrev = pickPage > 1;
  const canNext = pickPage < pickTotalPages;

  const pickItems = useMemo(() => {
    const start = (pickPage - 1) * pickPageSize;
    return routes.slice(start, start + pickPageSize);
  }, [routes, pickPage]);

  const pagesToShow = useMemo(() => {
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
  }, [pickPage, pickTotalPages]);

  const goPick = (p: number) => setPickPage(Math.min(pickTotalPages, Math.max(1, p)));

  const handleOverlay = () => closeAll();
  const handleX = () => closeAll();

  const handleAddToRoute = () => setStep("routeChoice");
  const handleCreateRoute = () => setStep("createRoute");
  const handlePickRoute = () => setStep("pickRoute");

  const handleConfirmPick = () => {
    if (!pickedRouteId) return;
    closeAll();
  };

  const handleCreateConfirm = () => {
    const id = routes.length ? Math.max(...routes.map((r) => r.id)) + 1 : 1;
    const created: RouteItem = {
      id,
      title: newTitle.trim() || "Новый маршрут",
      src: photo ? photo.src : `/images/city/city-1.jpg`,
    };
    setRoutes((prev) => [created, ...prev]);
    closeAll();
  };

  if (!open || !photo) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlay} role="presentation">
      {step === "photo" ? (
        <div className={`${styles.modal} ${styles.modalPhoto}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button className={styles.closeBtn} onClick={handleX} aria-label="Закрыть" type="button" />
          <div className={styles.photoTitle}>{photo.title}</div>

          <div className={styles.photoWrap}>
            <Image src={photo.src} alt={photo.title} width={300} height={375} className={styles.photoImg} />
            {likedNow ? (
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

          <div className={styles.meta}>
            <div>Метро: Василеостровская</div>
            <div>Адрес: 59.936435, 30.210504</div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.bigBtn} onClick={() => onToggleLike(photo.id)}>
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

            <button type="button" className={styles.bigBtn} onClick={handleAddToRoute}>
              <Image src="/images/city/plus.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
              ДОБАВИТЬ В МАРШРУТ
            </button>
          </div>
        </div>
      ) : null}

      {step === "routeChoice" ? (
        <div className={`${styles.modal} ${styles.modalChoice}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button className={styles.closeBtn} onClick={handleX} aria-label="Закрыть" type="button" />
          <div className={styles.choiceBtns}>
            <button type="button" className={`${styles.choiceBtn} ${styles.choiceBtn1}`} onClick={handleCreateRoute}>
              <Image src="/images/city/plus.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
              СОЗДАТЬ НОВЫЙ МАРШРУТ
            </button>
            <button type="button" className={`${styles.choiceBtn} ${styles.choiceBtn2}`} onClick={handlePickRoute}>
              <Image src="/images/city/plus.png" alt="" width={23} height={23} className={styles.btnImg} aria-hidden="true" />
              ДОБАВИТЬ В СОЗДАННЫЙ МАРШРУТ
            </button>
          </div>
        </div>
      ) : null}

      {step === "pickRoute" ? (
        <div className={`${styles.modal} ${styles.modalPick}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button className={styles.closeBtn} onClick={handleX} aria-label="Закрыть" type="button" />

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
              className={`${styles.pagBtn} ${!canPrev ? styles.pagBtnDisabled : ""}`}
              disabled={!canPrev}
              onClick={() => goPick(pickPage - 1)}
              aria-label="Назад"
              type="button"
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
                    className={`${styles.page} ${p === pickPage ? styles.pageActive : ""}`}
                    onClick={() => goPick(p)}
                    type="button"
                  >
                    {p}
                  </button>
                )
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
        <div className={`${styles.modal} ${styles.modalCreate}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button className={styles.closeBtn} onClick={handleX} aria-label="Закрыть" type="button" />

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

            <button type="button" className={styles.createConfirm} onClick={handleCreateConfirm}>
              СОЗДАТЬ НОВЫЙ МАРШРУТ
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
