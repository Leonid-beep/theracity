"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import styles from "./uploadPhotoModal.module.css";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_FILE_BYTES,
  MAX_UPLOAD_FILE_LABEL,
} from "@/app/lib/upload";

type Filters = {
  metro: string[];
  spaceType: string[];
  mood: string[];
  atmosphere: string[];
};

type MultiSetter = Dispatch<SetStateAction<string[]>>;

function summarizeSelected(values: string[]): string {
  if (!values.length) return "Выберите…";
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

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
  const [metro, setMetro] = useState<string[]>([]);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [spaceType, setSpaceType] = useState<string[]>([]);
  const [mood, setMood] = useState<string[]>([]);
  const [atmosphere, setAtmosphere] = useState<string[]>([]);

  const [filters, setFilters] = useState<Filters>({
    metro: [],
    spaceType: [],
    mood: [],
    atmosphere: [],
  });
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useCloseDetailsOnOutsideClick(modalRef, "upload-photo-filters");

  const replacePreview = useCallback((nextPreview: string | null) => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextPreview;
    });
  }, []);

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
    replacePreview(null);
    setTitle("");
    setMetro([]);
    setLat("");
    setLng("");
    setSpaceType([]);
    setMood([]);
    setAtmosphere([]);
    setError("");
    setProgress(0);
    setUploading(false);
  }, [replacePreview]);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const toggleMultiValue = useCallback((value: string, setter: MultiSetter) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  }, []);

  const handleFile = useCallback(
    (nextFile: File) => {
      if (
        !ALLOWED_IMAGE_MIME_TYPES.includes(
          nextFile.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
        )
      ) {
        setError("Допустимые форматы: JPEG, PNG, WebP");
        return;
      }
      if (nextFile.size > MAX_UPLOAD_FILE_BYTES) {
        setError(`Максимальный размер файла: ${MAX_UPLOAD_FILE_LABEL}`);
        return;
      }

      setError("");
      setFile(nextFile);
      replacePreview(URL.createObjectURL(nextFile));
    },
    [replacePreview],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const nextFile = e.dataTransfer.files[0];
    if (nextFile) handleFile(nextFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0];
    if (nextFile) handleFile(nextFile);
  };

  const canSubmit =
    !!file &&
    !!title.trim() &&
    metro.length > 0 &&
    !!lat.trim() &&
    !!lng.trim() &&
    spaceType.length > 0 &&
    mood.length > 0 &&
    atmosphere.length > 0 &&
    !uploading;

  const handleSubmit = async () => {
    if (!canSubmit || !file) return;
    setUploading(true);
    setError("");
    setProgress(0);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    metro.forEach((value) => fd.append("metro", value));
    fd.append("lat", lat.trim());
    fd.append("lng", lng.trim());
    spaceType.forEach((value) => fd.append("spaceType", value));
    mood.forEach((value) => fd.append("mood", value));
    atmosphere.forEach((value) => fd.append("atmosphere", value));

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
            return;
          }
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error || "Ошибка загрузки"));
          } catch {
            reject(new Error("Ошибка загрузки"));
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

  const renderMultiSelect = (
    label: string,
    options: string[],
    selectedValues: string[],
    setter: MultiSetter,
  ) => (
    <div className={styles.field}>
      <div className={styles.label}>{label}</div>
      <details className={styles.multi} name="upload-photo-filters">
        <summary className={styles.select}>
          <span className={styles.selectValue}>{summarizeSelected(selectedValues)}</span>
        </summary>
        <div className={styles.multiMenu}>
          {options.map((value) => (
            <label key={value} className={styles.multiItem}>
              <input
                type="checkbox"
                checked={selectedValues.includes(value)}
                onChange={() => toggleMultiValue(value, setter)}
              />
              <span>{value}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
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
              <div className={styles.dropzoneFormats}>JPEG, PNG, WebP до {MAX_UPLOAD_FILE_LABEL}</div>
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
              <img src={preview ?? ""} alt="Превью" className={styles.previewImg} />
              <button
                type="button"
                className={styles.removePreview}
                onClick={() => {
                  setFile(null);
                  replacePreview(null);
                }}
                aria-label="Удалить фото"
              >
                ×
              </button>
            </div>
          )}

          <div className={styles.formFields}>
            <div className={styles.field}>
              <div className={styles.label}>Название</div>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Жёлтый двор-колодец"
              />
            </div>

            {renderMultiSelect("Станция метро", filters.metro, metro, setMetro)}

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

            {renderMultiSelect("Тип пространства", filters.spaceType, spaceType, setSpaceType)}
            {renderMultiSelect("Эмоциональный фон", filters.mood, mood, setMood)}
            {renderMultiSelect("Атмосфера", filters.atmosphere, atmosphere, setAtmosphere)}
          </div>

          <div className={styles.submitBar}>
            {uploading ? (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            ) : null}

            {error ? <div className={styles.error}>{error}</div> : null}

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
    </div>
  );
}
