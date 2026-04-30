"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./styles.module.css";
import { useAuth } from "@/app/providers/AuthProvider";
import { MAX_USERNAME_LENGTH } from "@/app/lib/userValidation";
import EmailVerificationModal from "./_components/EmailVerificationModal";

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const { register, verifyEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; username?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const returnTo = searchParams.get("returnTo");

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
      if ("verificationRequired" in fail) {
        setVerificationEmail(fail.email);
        setVerificationOpen(true);
      } else {
        setErrors(fail.errors.filter(Boolean));
        if (fail.fieldErrors) setFieldErrors(fail.fieldErrors);
      }
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
                maxLength={MAX_USERNAME_LENGTH}
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

      <EmailVerificationModal
        open={verificationOpen}
        onClose={() => setVerificationOpen(false)}
        onVerify={(code) => verifyEmail(verificationEmail, code, returnTo)}
      />
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className={styles.root} />}>
      <RegisterPageContent />
    </Suspense>
  );
}
