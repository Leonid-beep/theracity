"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./forgotPasswordModal.module.css";

type Step = "email" | "code" | "newpass";

export default function ForgotPasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("email");
    setEmail("");
    setCode("");
    setP1("");
    setP2("");
    setError("");
  }, [open]);

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

  const modalClass = useMemo(() => {
    return step === "newpass" ? styles.modal300 : styles.modal200;
  }, [step]);

  if (!open) return null;

  const sendCode = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        setError("Не удалось отправить код");
        return;
      }
      setStep("code");
    } catch {
      setError("Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  const goNewPass = () => {
    setError("");
    setStep("newpass");
  };

  const changePass = async () => {
    setError("");
    if (p1 !== p2) {
      setError("Пароли не совпадают");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          newPassword: p1,
          confirmPassword: p2,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.errors?.[0] ?? "Ошибка");
      } else {
        onClose();
      }
    } catch {
      setError("Ошибка сервера");
    }
    setSubmitting(false);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${styles.modal} ${modalClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose} />

        {step === "email" && (
          <form
            className={styles.body200}
            onSubmit={(e) => {
              e.preventDefault();
              if (!submitting) void sendCode();
            }}
          >
            <div className={styles.block200}>
              <div className={styles.title}>ВВЕДИТЕ ПОЧТУ ДЛЯ ВОССТАНОВЛЕНИЯ ПАРОЛЯ</div>
              <input
                className={styles.input}
                placeholder="Value"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btn} disabled={submitting}>
              {submitting ? "ОТПРАВКА..." : "ОТПРАВИТЬ КОД"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form
            className={styles.body200}
            onSubmit={(e) => {
              e.preventDefault();
              goNewPass();
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
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btn}>
              ВОССТАНОВИТЬ ПАРОЛЬ
            </button>
          </form>
        )}

        {step === "newpass" && (
          <form
            className={styles.body300}
            onSubmit={(e) => {
              e.preventDefault();
              if (!submitting) void changePass();
            }}
          >
            <div className={styles.field300}>
              <div className={styles.title}>ВВЕДИТЕ НОВЫЙ ПАРОЛЬ</div>
              <input
                className={styles.input}
                placeholder="Value"
                type="password"
                autoComplete="new-password"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
              />
            </div>

            <div className={styles.field300}>
              <div className={styles.title}>ПОВТОРИТЕ НОВЫЙ ПАРОЛЬ</div>
              <input
                className={styles.input}
                placeholder="Value"
                type="password"
                autoComplete="new-password"
                value={p2}
                onChange={(e) => setP2(e.target.value)}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btn} disabled={submitting}>
              {submitting ? "СМЕНА..." : "СМЕНИТЬ ПАРОЛЬ"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
