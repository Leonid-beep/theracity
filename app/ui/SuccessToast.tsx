"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./successToast.module.css";

export function SuccessToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className={styles.wrap} aria-hidden={false}>
      <div className={styles.toast} role="status" aria-live="polite">
        {message}
      </div>
    </div>
  );
}

export function useSuccessToast(durationMs = 3800) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = useCallback(
    (text: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(text);
      timerRef.current = setTimeout(() => {
        setMessage(null);
        timerRef.current = null;
      }, durationMs);
    },
    [durationMs],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { message, showSuccess };
}
