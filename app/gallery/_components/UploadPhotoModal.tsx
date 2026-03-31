"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./uploadPhotoModal.module.css";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_FILE_BYTES, MAX_UPLOAD_FILE_LABEL } from "@/app/lib/upload";

type Filters = {
  metro: string[];
  spaceType: string[];
  mood: string[];
  atmosphere: string[];
};

export default function UploadPhotoModal({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [metro, setMetro] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [mood, setMood] = useState("");
  const [atmosphere, setAtmosphere] = useState("");

  const [filters, setFilters] = useState<Filters>({ metro: [], spaceType: [], mood: [], atmosphere: [] });
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || filtersLoaded) return;
    fetch("/api/filters")
      .then((r) => r.json())
      .then((d) => {
        setFilters(d);
        setFiltersLoaded(true);
      })
      .catch(() => setFiltersLoaded(true));
  }, [open, filtersLoaded]);

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

  const resetForm = useCallback(() => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setMetro("");
    setLat("");
    setLng("");
    setSpaceType("");
    setMood("");
    setAtmosphere("");
    setError("");
    setProgress(0);
    setUploading(false);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  const handleFile = (f: File) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(f.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
      setError("Допустимые форматы: JPEG, PNG, WebP");
      return;
    }
    if (f.size > MAX_UPLOAD_FILE_BYTES) {
      setError(`Максимальный размер файла: ${MAX_UPLOAD_FILE_LABEL}`);
      return;
    }
    setError("");
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const canSubmit =
    !!file && !!title.trim() && !!metro && !!lat.trim() && !!lng.trim() && !!spaceType && !!mood && !!atmosphere && !uploading;

  const handleSubmit = async () => {
    if (!canSubmit || !file) return;
    setUploading(true);
    setError("");
    setProgress(0);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    fd.append("metro", metro);
    fd.append("lat", lat.trim());
    fd.append("lng", lng.trim());
    fd.append("spaceType", spaceType);
    fd.append("mood", mood);
    fd.append("atmosphere", atmosphere);

    try {
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error || "Ошибка загрузки"));
            } catch {
              reject(new Error("Ошибка загрузки"));
            }
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Ошибка сети")));
        xhr.open("POST", "/api/photos");
        xhr.send(fd);
      });
      setProgress(100);
      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose} />

        <div className={styles.title}>Загрузка фотографии</div>

        <div className={styles.body}>
          {!file ? (
            <div
              className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <div className={styles.dropzoneHint}>
                Перетащите фото сюда или нажмите для выбора
              </div>
              <div className={styles.dropzoneFormats}>
                JPEG, PNG, WebP — до {MAX_UPLOAD_FILE_LABEL}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={styles.hiddenInput}
                onChange={handleInputChange}
              />
            </div>
          ) : (
            <div className={styles.previewWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview!} alt="Превью" className={styles.previewImg} />
              <button
                type="button"
                className={styles.removePreview}
                onClick={() => {
                  setFile(null);
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(null);
                }}
                aria-label="Удалить фото"
              >
                ✕
              </button>
            </div>
          )}

          <div className={styles.field}>
            <div className={styles.label}>Название</div>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Жёлтый двор-колодец"
            />
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Станция метро</div>
            <select className={styles.select} value={metro} onChange={(e) => setMetro(e.target.value)}>
              <option value="">Выберите…</option>
              {filters.metro.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Координаты</div>
            <div className={styles.coordsRow}>
              <input
                className={styles.input}
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="Широта (59.936)"
                type="number"
                step="any"
              />
              <input
                className={styles.input}
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="Долгота (30.270)"
                type="number"
                step="any"
              />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Тип пространства</div>
            <select className={styles.select} value={spaceType} onChange={(e) => setSpaceType(e.target.value)}>
              <option value="">Выберите…</option>
              {filters.spaceType.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Эмоциональный фон</div>
            <select className={styles.select} value={mood} onChange={(e) => setMood(e.target.value)}>
              <option value="">Выберите…</option>
              {filters.mood.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Атмосфера</div>
            <select className={styles.select} value={atmosphere} onChange={(e) => setAtmosphere(e.target.value)}>
              <option value="">Выберите…</option>
              {filters.atmosphere.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {uploading && (
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="button"
            className={styles.submitBtn}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {uploading ? `ЗАГРУЗКА… ${progress}%` : "ЗАГРУЗИТЬ"}
          </button>
        </div>
      </div>
    </div>
  );
}
