"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./styles.module.css";
import { useAuth } from "@/app/providers/AuthProvider";

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; username?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    setReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
  }, []);

  const loginHref =
    returnTo != null && returnTo !== ""
      ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : "/auth/login";

  const handleRegister = async () => {
    setErrors([]);
    setFieldErrors({});
    setSubmitting(true);
    const fail = await register(username, email, password, confirmPassword, returnTo);
    if (fail) {
      setErrors(fail.errors.filter(Boolean));
      if (fail.fieldErrors) setFieldErrors(fail.fieldErrors);
    }
    setSubmitting(false);
  };

  return (
    <main className={styles.root}>
      <h1 className={styles.h1}>Регистрация</h1>

      <section className={styles.stage} aria-label="Форма регистрации">
        <div className={styles.cardRegister}>
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
            <label className={styles.label}>
              EMAIL
              <input
                className={styles.input}
                placeholder="Value"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((f) => ({ ...f, email: undefined }));
                }}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email ? (
                <span className={styles.fieldError}>{fieldErrors.email}</span>
              ) : null}
            </label>

            <label className={styles.label}>
              ЛОГИН
              <input
                className={styles.input}
                placeholder="Value"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setFieldErrors((f) => ({ ...f, username: undefined }));
                }}
                aria-invalid={!!fieldErrors.username}
              />
              {fieldErrors.username ? (
                <span className={styles.fieldError}>{fieldErrors.username}</span>
              ) : null}
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

            <label className={styles.label}>
              ПОВТОРИТЬ ПАРОЛЬ
              <input
                className={styles.input}
                placeholder="Value"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {submitting ? "СОЗДАНИЕ..." : "СОЗДАТЬ АККАУНТ"}
            </button>
          </form>
        </div>
      </section>

      <p className={styles.switch}>
        Есть аккаунт?{" "}
        <Link href={loginHref} className={styles.switchLink}>
          <span className={styles.mark}>Войти</span>
        </Link>
      </p>
    </main>
  );
}
