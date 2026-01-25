"use client";

import Link from "next/link";
import styles from "./styles.module.css";

export default function RegisterPage() {
  return (
    <main className={styles.root}>
      <h1 className={styles.h1}>Регистрация</h1>

      <section className={styles.stage} aria-label="Форма регистрации">
        <div className={styles.cardRegister}>
          <form className={styles.form}>
            <label className={styles.label}>
              EMAIL
              <input className={styles.input} placeholder="Value" />
            </label>

            <label className={styles.label}>
              ЛОГИН
              <input className={styles.input} placeholder="Value" />
            </label>

            <label className={styles.label}>
              ПАРОЛЬ
              <input className={styles.input} placeholder="Value" type="password" />
            </label>

            <label className={styles.label}>
              ПОВТОРИТЬ ПАРОЛЬ
              <input className={styles.input} placeholder="Value" type="password" />
            </label>

            <button type="button" className={styles.primaryBtn}>
              СОЗДАТЬ АККАУНТ
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
