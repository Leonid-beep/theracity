"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./styles.module.css";
import { useAuth } from "@/app/providers/AuthProvider";

const ForgotPasswordModal = dynamic(() => import("./_components/ForgotPasswordModal"), {
  ssr: false,
});

function LoginPageContent() {
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const returnTo = searchParams.get("returnTo");

  const handleLogin = async () => {
    setErrors([]);
    setSubmitting(true);
    const errs = await login(loginVal, password, returnTo);
    if (errs) setErrors(errs);
    setSubmitting(false);
  };

  const registerHref =
    returnTo != null && returnTo !== ""
      ? `/auth/register?returnTo=${encodeURIComponent(returnTo)}`
      : "/auth/register";

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
        <Link href={registerHref} className={styles.switchLink}>
          <span className={styles.mark}>Зарегистрироваться</span>
        </Link>
      </p>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className={styles.root} />}>
      <LoginPageContent />
    </Suspense>
  );
}
