"use client";

import { useState } from "react";
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
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    setErrors([]);
    setSubmitting(true);
    const errs = await register(username, email, password, confirmPassword);
    if (errs) setErrors(errs);
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
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className={styles.label}>
              ЛОГИН
              <input
                className={styles.input}
                placeholder="Value"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
        <Link href="/auth/login" className={styles.switchLink}>
          <span className={styles.mark}>Войти</span>
        </Link>
      </p>
    </main>
  );
}
