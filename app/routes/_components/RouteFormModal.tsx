"use client";

import { useEffect, useState } from "react";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import styles from "@/app/gallery/_components/photoModals.module.css";

export type EditableRoutePhoto = {
  id: string;
  src: string;
  alt: string;
};

type RouteFormValues = {
  title: string;
  description: string;
  photoIds: string[];
};

export default function RouteFormModal({
  open,
  mode,
  initialTitle,
  initialDescription,
  initialPhotos,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialTitle?: string;
  initialDescription?: string;
  initialPhotos?: EditableRoutePhoto[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: RouteFormValues) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<EditableRoutePhoto[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle ?? "");
    setDescription(initialDescription ?? "");
    setPhotos(initialPhotos ?? []);
  }, [open, initialDescription, initialPhotos, initialTitle]);

  const movePhoto = (index: number, shift: -1 | 1) => {
    setPhotos((prev) => {
      const nextIndex = index + shift;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      const currentPhoto = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = currentPhoto;
      return next;
    });
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${styles.modal} ${styles.modalCreate} ${mode === "edit" ? styles.routeFormModal : ""}`}
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
            <div className={styles.createLabel}>
              {mode === "edit" ? "Название маршрута" : "ПРИДУМАЙТЕ НАЗВАНИЕ"}
            </div>
            <input
              className={styles.createInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className={styles.createField}>
            <div className={styles.createLabel}>
              {mode === "edit" ? "Описание маршрута" : "ПРИДУМАЙТЕ ОПИСАНИЕ"}
            </div>
            <textarea
              className={styles.createTextarea}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {mode === "edit" ? (
            <div className={styles.routeEditorSection}>
              <div className={styles.routeEditorHeader}>
                <div className={styles.createLabel}>ФОТО В МАРШРУТЕ</div>
                <span className={styles.routeEditorCount}>{photos.length}</span>
              </div>

              <div className={styles.routeEditorHint}>
                Меняйте порядок фото и удаляйте лишние из маршрута.
              </div>

              {photos.length > 0 ? (
                <div className={styles.routePhotoList}>
                  {photos.map((photo, index) => (
                    <div key={photo.id} className={styles.routePhotoItem}>
                      <div className={styles.routePhotoThumb}>
                        <OptimizedPhoto
                          src={photo.src}
                          alt={photo.alt}
                          width={84}
                          height={112}
                          sizes="84px"
                          className={styles.routePhotoImg}
                          quality={70}
                        />
                      </div>

                      <div className={styles.routePhotoMeta}>
                        <div className={styles.routePhotoIndex}>Фото {index + 1}</div>
                        <div className={styles.routePhotoTitle}>{photo.alt}</div>

                        <div className={styles.routePhotoActions}>
                          <button
                            type="button"
                            className={styles.routePhotoAction}
                            onClick={() => movePhoto(index, -1)}
                            disabled={index === 0 || submitting}
                            aria-label="Поднять фото выше"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className={styles.routePhotoAction}
                            onClick={() => movePhoto(index, 1)}
                            disabled={index === photos.length - 1 || submitting}
                            aria-label="Опустить фото ниже"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className={`${styles.routePhotoAction} ${styles.routePhotoActionDanger}`}
                            onClick={() => removePhoto(photo.id)}
                            disabled={submitting}
                            aria-label="Удалить фото из маршрута"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.routePhotoEmpty}>В маршруте пока нет фото.</div>
              )}
            </div>
          ) : null}

          <button
            type="button"
            className={styles.createConfirm}
            onClick={() => void onSubmit({ title, description, photoIds: photos.map((photo) => photo.id) })}
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
