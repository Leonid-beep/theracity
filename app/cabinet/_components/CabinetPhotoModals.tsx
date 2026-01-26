"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./cabinetPhotoModals.module.css";

export type CabinetPhotoItem = {
  id: number;
  src: string;
  title: string;
  metro: string;
  coords: string;
};

export default function CabinetPhotoModals({
  open,
  photo,
  isFav,
  onToggleFav,
  onRemoveFav,
  onClose,
}: {
  open: boolean;
  photo: CabinetPhotoItem | null;
  isFav: boolean;
  onToggleFav: () => void;
  onRemoveFav: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"photo" | "choice" | "pick" | "create">("photo");

  useEffect(() => {
    if (!open) return;
    setStep("photo");
  }, [open, photo?.id]);

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

  if (!open || !photo) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={`${styles.modal} ${styles.modalPhoto}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose} />

        <div className={styles.photoTitle} title={photo.title}>
          {photo.title}
        </div>

        <div className={styles.photoWrap}>
          <Image src={photo.src} alt={photo.title} width={300} height={375} className={styles.photoImg} />
          {isFav ? <span className={styles.likeDot} aria-hidden="true" /> : null}
        </div>

        <div className={styles.meta}>
          <div>Метро: {photo.metro}</div>
          <div>Адрес: {photo.coords}</div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.bigBtn} onClick={() => setStep("choice")}>
            <span className={styles.btnPlus} aria-hidden="true" />
            ДОБАВИТЬ В МАРШРУТ
          </button>

          <button
            type="button"
            className={`${styles.bigBtn} ${styles.bigBtnDanger}`}
            onClick={() => {
              if (!isFav) onToggleFav();
              else onRemoveFav();
            }}
          >
            <span className={styles.btnTrash} aria-hidden="true" />
            УДАЛИТЬ ИЗ ИЗБРАННОГО
          </button>
        </div>

        {step !== "photo" ? (
          <div className={styles.stepStub} aria-hidden="true">
            {/* Заглушка следующих шагов (choice/pick/create) — ты уже делал в галерее; сюда можно вставить 1-в-1 */}
          </div>
        ) : null}
      </div>
    </div>
  );
}
