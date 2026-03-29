"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./styles.module.css";
import ForgotPasswordModal from "./_components/ForgotPasswordModal";
import { useAuth } from "@/app/providers/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setErrors([]);
    setSubmitting(true);
    const errs = await login(loginVal, password);
    if (errs) setErrors(errs);
    setSubmitting(false);
  };

  return (
    <main className={styles.root}>
      <h1 className={styles.h1}>Вход в личный кабинет</h1>

      <section className={styles.stage} aria-label="Форма входа">
        <div className={styles.cardLogin}>
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <label className={styles.label}>
              EMAIL/ЛОГИН
              <input
                className={styles.input}
                placeholder="Value"
                value={loginVal}
                onChange={(e) => setLoginVal(e.target.value)}
              />
            </label>

            <label className={styles.label}>
              ПАРОЛЬ
              <input
                className={styles.input}
                placeholder="Value"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {errors.length > 0 && (
              <div className={styles.errors}>
                {errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}

            <button type="submit" className={styles.primaryBtn} disabled={submitting}>
              {submitting ? "ВХОД..." : "ВОЙТИ"}
            </button>

            <button
              type="button"
              className={styles.forgotBtn}
              onClick={() => setForgotOpen(true)}
            >
              Забыли пароль?
            </button>
          </form>
        </div>
      </section>

      <p className={styles.switch}>
        Нет аккаунта?{" "}
        <Link href="/auth/register" className={styles.switchLink}>
          <span className={styles.mark}>Зарегистрироваться</span>
        </Link>
      </p>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </main>
  );
}
