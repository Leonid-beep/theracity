"use client";

import { useEffect } from "react";
import styles from "./confirmDeleteModal.module.css";

export default function ConfirmDeleteModal({
  open,
  onClose,
  onYes,
}: {
  open: boolean;
  onClose: () => void;
  onYes: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose} />
        <div className={styles.title}>ТОЧНО УДАЛИТЬ?</div>

        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onClose}>
            НЕТ
          </button>
          <button type="button" className={styles.btn} onClick={onYes}>
            ДА
          </button>
        </div>
      </div>
    </div>
  );
}
