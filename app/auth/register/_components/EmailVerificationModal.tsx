"use client";

import { useEffect, useState } from "react";
import styles from "../../login/_components/forgotPasswordModal.module.css";

export default function EmailVerificationModal({
  open,
  onClose,
  onVerify,
}: {
  open: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<string[] | null>;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setError("");
    setSubmitting(false);
  }, [open]);

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

  if (!open) return null;

  const verify = async () => {
    setError("");
    setSubmitting(true);
    try {
      const errors = await onVerify(code.trim());
      if (errors) {
        setError(errors[0] ?? "Ошибка подтверждения email");
        return;
      }
      onClose();
    } catch {
      setError("Ошибка сервера");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${styles.modal} ${styles.modal200}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose} />

        <form
          className={styles.body200}
          onSubmit={(event) => {
            event.preventDefault();
            if (!submitting) void verify();
          }}
        >
          <div className={styles.block200}>
            <div className={styles.title}>ВВЕДИТЕ КОД, ВЫСЛАННЫЙ НА ПОЧТУ</div>
            <input
              className={styles.input}
              placeholder="Value"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={submitting}>
            {submitting ? "ПОДТВЕРЖДЕНИЕ..." : "ПОДТВЕРДИТЬ EMAIL"}
          </button>
        </form>
      </div>
    </div>
  );
}
