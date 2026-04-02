"use client";

import { useEffect, useState } from "react";
import styles from "@/app/gallery/_components/photoModals.module.css";

type RouteFormValues = {
  title: string;
  description: string;
};

export default function RouteFormModal({
  open,
  mode,
  initialTitle,
  initialDescription,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialTitle?: string;
  initialDescription?: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: RouteFormValues) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle ?? "");
    setDescription(initialDescription ?? "");
  }, [open, initialTitle, initialDescription]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${styles.modal} ${styles.modalCreate}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Закрыть"
        />

        <div className={styles.createTitle}>
          {mode === "edit" ? "Редактирование маршрута" : "Создание маршрута"}
        </div>

        <div className={styles.createBody}>
          <div className={styles.createField}>
            <div className={styles.createLabel}>ПРИДУМАЙТЕ НАЗВАНИЕ</div>
            <input
              className={styles.createInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className={styles.createField}>
            <div className={styles.createLabel}>ПРИДУМАЙТЕ ОПИСАНИЕ</div>
            <textarea
              className={styles.createTextarea}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.createConfirm}
            onClick={() => void onSubmit({ title, description })}
            disabled={submitting}
          >
            {submitting
              ? mode === "edit"
                ? "СОХРАНЕНИЕ..."
                : "СОЗДАНИЕ..."
              : mode === "edit"
                ? "СОХРАНИТЬ ИЗМЕНЕНИЯ"
                : "СОЗДАТЬ НОВЫЙ МАРШРУТ"}
          </button>
        </div>
      </div>
    </div>
  );
}
