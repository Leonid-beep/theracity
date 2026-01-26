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

  useEffect(() => {
    if (!open) return;
    setStep("email");
    setEmail("");
    setCode("");
    setP1("");
    setP2("");
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

  const sendCode = () => setStep("code");
  const goNewPass = () => setStep("newpass");
  const changePass = () => onClose();

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
          <div className={styles.body200}>
            <div className={styles.block200}>
              <div className={styles.title}>ВВЕДИТЕ ПОЧТУ ДЛЯ ВОССТАНОВЛЕНИЯ ПАРОЛЯ</div>
              <input
                className={styles.input}
                placeholder="Value"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="button" className={styles.btn} onClick={sendCode}>
              ОТПРАВИТЬ КОД
            </button>
          </div>
        )}

        {step === "code" && (
          <div className={styles.body200}>
            <div className={styles.block200}>
              <div className={styles.title}>ВВЕДИТЕ КОД, ВЫСЛАННЫЙ НА ПОЧТУ</div>
              <input
                className={styles.input}
                placeholder="Value"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <button type="button" className={styles.btn} onClick={goNewPass}>
              ВОССТАНОВИТЬ ПАРОЛЬ
            </button>
          </div>
        )}

        {step === "newpass" && (
          <div className={styles.body300}>
            <div className={styles.field300}>
              <div className={styles.title}>ВВЕДИТЕ НОВЫЙ ПАРОЛЬ</div>
              <input
                className={styles.input}
                placeholder="Value"
                type="password"
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
                value={p2}
                onChange={(e) => setP2(e.target.value)}
              />
            </div>

            <button type="button" className={styles.btn} onClick={changePass}>
              СМЕНИТЬ ПАРОЛЬ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
