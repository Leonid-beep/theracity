"use client";

import Link from "next/link";
import styles from "./styles.module.css";

export default function LoginPage() {
  return (
    <main className={styles.root}>
      <h1 className={styles.h1}>Вход в личный кабинет</h1>

      <section className={styles.stage} aria-label="Форма входа">
        <div className={styles.cardLogin}>
          <form className={styles.form}>
            <label className={styles.label}>
              EMAIL/ЛОГИН
              <input className={styles.input} placeholder="Value" />
            </label>

            <label className={styles.label}>
              ПАРОЛЬ
              <input className={styles.input} placeholder="Value" type="password" />
            </label>

            <button type="button" className={styles.primaryBtn}>
              ВОЙТИ
            </button>

            <button type="button" className={styles.forgotBtn}>
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
    </main>
  );
}
