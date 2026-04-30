"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
import {
  fetchFilterOptions,
  getEmptyFilterOptions,
  invalidateFilterOptionsCache,
  type FilterOptions,
} from "@/app/lib/clientFilters";
import { findNearestMetroStations } from "@/app/lib/photoMetadata";
import exifr from "exifr";

type SavedPhoto = {
  id: string;
  src: string;
  title: string;
  metro: string[];
  coords: string;
  lat: number;
  lng: number;
  spaceType: string[];
  mood: string[];
  atmosphere: string[];
};

export type EditablePhoto = {
  id: string;
  title: string;
  metro: string[];
  lat: number;
  lng: number;
  spaceType: string[];
  mood: string[];
  atmosphere: string[];
};

type PhotoDraft = {
  id: string;
  file: File;
  preview: string;
  title: string;
  metro: string[];
  lat: string;
  lng: string;
  spaceType: string[];
  mood: string[];
  atmosphere: string[];
  exifLoading: boolean;
};

type MultiValueKey = "metro" | "spaceType" | "mood" | "atmosphere";
type DraftPatch = Partial<
  Pick<PhotoDraft, "title" | "metro" | "lat" | "lng" | "spaceType" | "mood" | "atmosphere" | "exifLoading">
>;
type MultiSetter = Dispatch<SetStateAction<string[]>>;

const MAX_BATCH_UPLOAD_FILES = 10;

function summarizeSelected(values: string[]): string {
  if (!values.length) return "Выберите...";
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

function createDraftId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function getDefaultTitle(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").trim() || "Новое фото";
}

function createPhotoDraft(file: File): PhotoDraft {
  return {
    id: createDraftId(),
    file,
    preview: URL.createObjectURL(file),
    title: getDefaultTitle(file),
    metro: [],
    lat: "",
    lng: "",
    spaceType: [],
    mood: [],
    atmosphere: [],
    exifLoading: true,
  };
}

function getFileValidationError(file: File): string | null {
  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
    )
  ) {
    return `${file.name}: допустимые форматы JPEG, PNG, WebP`;
  }

  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    return `${file.name}: максимум ${MAX_UPLOAD_FILE_LABEL}`;
  }

  return null;
}

function hasDraftRequiredValues(draft: PhotoDraft): boolean {
  return (
    !!draft.title.trim() &&
    draft.metro.length > 0 &&
    !!draft.lat.trim() &&
    !!draft.lng.trim() &&
    draft.spaceType.length > 0 &&
    draft.mood.length > 0 &&
    draft.atmosphere.length > 0
  );
}

function resolveNextArrayValue(
  nextValue: SetStateAction<string[]>,
  currentValue: string[],
): string[] {
  return typeof nextValue === "function" ? nextValue(currentValue) : nextValue;
}

function appendMultiValues(formData: FormData, key: string, values: string[]) {
  values.forEach((value) => formData.append(key, value));
}

export default function UploadPhotoModal({
  open,
  onClose,
  onUploaded,
  mode = "create",
  initialPhoto = null,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (photo?: SavedPhoto, photos?: SavedPhoto[]) => void;
  mode?: "create" | "edit";
  initialPhoto?: EditablePhoto | null;
}) {
  const isEditMode = mode === "edit";

  const [drafts, setDrafts] = useState<PhotoDraft[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [title, setTitle] = useState("");
  const [metro, setMetro] = useState<string[]>([]);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [spaceType, setSpaceType] = useState<string[]>([]);
  const [mood, setMood] = useState<string[]>([]);
  const [atmosphere, setAtmosphere] = useState<string[]>([]);

  const [filters, setFilters] = useState<FilterOptions>(getEmptyFilterOptions);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const draftsRef = useRef<PhotoDraft[]>([]);

  useCloseDetailsOnOutsideClick(modalRef, "upload-photo-filters");

  const activeDraft = drafts[activeIndex] ?? null;
  const exifLoadingCount = useMemo(
    () => drafts.filter((draft) => draft.exifLoading).length,
    [drafts],
  );
  const incompleteDraftCount = useMemo(
    () => drafts.filter((draft) => !hasDraftRequiredValues(draft)).length,
    [drafts],
  );
  const allDraftsReady = drafts.length > 0 && incompleteDraftCount === 0;

  const revokeDraftPreviews = useCallback((items: PhotoDraft[]) => {
    items.forEach((draft) => URL.revokeObjectURL(draft.preview));
  }, []);

  const resetCreateDrafts = useCallback(() => {
    setDrafts((prev) => {
      revokeDraftPreviews(prev);
      return [];
    });
    setActiveIndex(0);
  }, [revokeDraftPreviews]);

  const resetForm = useCallback(() => {
    resetCreateDrafts();
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
    setDragActive(false);
  }, [resetCreateDrafts]);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    return () => {
      revokeDraftPreviews(draftsRef.current);
    };
  }, [revokeDraftPreviews]);

  useEffect(() => {
    if (!open || filtersLoaded) return;
    fetchFilterOptions()
      .then((data) => {
        setFilters(data);
        setFiltersLoaded(true);
      })
      .catch(() => setFiltersLoaded(true));
  }, [open, filtersLoaded]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploading) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, onClose, uploading]);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    setError("");
    setProgress(0);
    setUploading(false);
    setDragActive(false);

    if (isEditMode && initialPhoto) {
      resetCreateDrafts();
      setTitle(initialPhoto.title);
      setMetro(initialPhoto.metro);
      setLat(String(initialPhoto.lat));
      setLng(String(initialPhoto.lng));
      setSpaceType(initialPhoto.spaceType);
      setMood(initialPhoto.mood);
      setAtmosphere(initialPhoto.atmosphere);
      return;
    }

    resetForm();
  }, [open, isEditMode, initialPhoto, resetForm, resetCreateDrafts]);

  useEffect(() => {
    if (!error) return;
    const timeoutId = window.setTimeout(() => setError(""), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  useEffect(() => {
    if (activeIndex < drafts.length || drafts.length === 0) return;
    setActiveIndex(drafts.length - 1);
  }, [activeIndex, drafts.length]);

  const patchDraft = useCallback((draftId: string, patch: DraftPatch) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft)),
    );
  }, []);

  const patchActiveDraft = useCallback(
    (patch: DraftPatch) => {
      const draftId = drafts[activeIndex]?.id;
      if (!draftId) return;
      patchDraft(draftId, patch);
    },
    [activeIndex, drafts, patchDraft],
  );

  const createActiveMultiSetter = useCallback(
    (key: MultiValueKey): MultiSetter =>
      (nextValue) => {
        const draftId = drafts[activeIndex]?.id;
        if (!draftId) return;

        setDrafts((prev) =>
          prev.map((draft) =>
            draft.id === draftId
              ? { ...draft, [key]: resolveNextArrayValue(nextValue, draft[key]) }
              : draft,
          ),
        );
      },
    [activeIndex, drafts],
  );

  const toggleMultiValue = useCallback((value: string, setter: MultiSetter) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  }, []);

  const readPhotoMetadata = useCallback(
    async (draftId: string, file: File) => {
      try {
        const coords = await exifr.gps(file);
        if (
          typeof coords?.latitude === "number" &&
          typeof coords?.longitude === "number"
        ) {
          const nearestMetro = findNearestMetroStations(
            coords.latitude,
            coords.longitude,
          );

          patchDraft(draftId, {
            lat: coords.latitude.toFixed(7),
            lng: coords.longitude.toFixed(7),
            metro: nearestMetro.length > 0 ? nearestMetro : [],
          });
        }
      } catch {
        // EXIF GPS может отсутствовать: тогда координаты и метро заполняются вручную.
      } finally {
        patchDraft(draftId, { exifLoading: false });
      }
    },
    [patchDraft],
  );

  const handleFiles = useCallback(
    (selectedFiles: File[]) => {
      if (isEditMode || selectedFiles.length === 0) return;

      const freeSlots = MAX_BATCH_UPLOAD_FILES - drafts.length;
      if (freeSlots <= 0) {
        setError(`Можно выбрать не больше ${MAX_BATCH_UPLOAD_FILES} фото за раз`);
        return;
      }

      const filesForUpload = selectedFiles.slice(0, freeSlots);
      const nextDrafts: PhotoDraft[] = [];
      const nextErrors: string[] = [];

      filesForUpload.forEach((file) => {
        const validationError = getFileValidationError(file);
        if (validationError) {
          nextErrors.push(validationError);
          return;
        }

        nextDrafts.push(createPhotoDraft(file));
      });

      if (selectedFiles.length > freeSlots) {
        nextErrors.push(
          `Добавлены первые ${freeSlots} фото из ${selectedFiles.length}: максимум ${MAX_BATCH_UPLOAD_FILES}`,
        );
      }

      if (nextDrafts.length > 0) {
        setDrafts((prev) => [...prev, ...nextDrafts]);
        if (drafts.length === 0) setActiveIndex(0);
        nextDrafts.forEach((draft) => {
          void readPhotoMetadata(draft.id, draft.file);
        });
      }

      setError(nextErrors.join(". "));
    },
    [drafts.length, isEditMode, readPhotoMetadata],
  );

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    handleFiles(Array.from(event.dataTransfer.files));
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(Array.from(event.target.files ?? []));
    event.currentTarget.value = "";
  };

  const handleRemoveDraft = useCallback(
    (draftId: string) => {
      const removedIndex = drafts.findIndex((draft) => draft.id === draftId);
      if (removedIndex < 0) return;

      setDrafts((prev) => {
        const draftToRemove = prev.find((draft) => draft.id === draftId);
        if (draftToRemove) URL.revokeObjectURL(draftToRemove.preview);
        return prev.filter((draft) => draft.id !== draftId);
      });

      setActiveIndex((current) => {
        const nextLength = Math.max(0, drafts.length - 1);
        if (nextLength === 0) return 0;
        if (current > removedIndex) return current - 1;
        return Math.min(current, nextLength - 1);
      });
      setError("");
    },
    [drafts],
  );

  const hasRequiredValues = isEditMode
    ? !!title.trim() &&
      metro.length > 0 &&
      !!lat.trim() &&
      !!lng.trim() &&
      spaceType.length > 0 &&
      mood.length > 0 &&
      atmosphere.length > 0
    : allDraftsReady;

  const canSubmit =
    hasRequiredValues &&
    !uploading &&
    (isEditMode || (drafts.length > 0 && exifLoadingCount === 0));

  const uploadDraft = useCallback(
    (draft: PhotoDraft, index: number, total: number) =>
      new Promise<SavedPhoto>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", draft.file);
        formData.append("title", draft.title.trim());
        appendMultiValues(formData, "metro", draft.metro);
        formData.append("lat", draft.lat.trim());
        formData.append("lng", draft.lng.trim());
        appendMultiValues(formData, "spaceType", draft.spaceType);
        appendMultiValues(formData, "mood", draft.mood);
        appendMultiValues(formData, "atmosphere", draft.atmosphere);

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (!event.lengthComputable) return;
          const currentFileProgress = event.loaded / event.total;
          setProgress(
            Math.min(99, Math.round(((index + currentFileProgress) / total) * 100)),
          );
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText) as { photo?: SavedPhoto };
              if (!data.photo) {
                reject(new Error("Ответ сервера не содержит фотографию"));
                return;
              }
              resolve(data.photo);
            } catch {
              reject(new Error("Ошибка обработки ответа"));
            }
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
        xhr.send(formData);
      }),
    [],
  );

  const handleCreateSubmit = async () => {
    if (!allDraftsReady || drafts.length === 0) return [];

    const savedPhotos: SavedPhoto[] = [];
    for (let index = 0; index < drafts.length; index += 1) {
      const draft = drafts[index];
      setActiveIndex(index);
      const savedPhoto = await uploadDraft(draft, index, drafts.length);
      savedPhotos.push(savedPhoto);
      setProgress(Math.min(99, Math.round(((index + 1) / drafts.length) * 100)));
    }

    return savedPhotos;
  };

  const handleEditSubmit = async () => {
    if (!initialPhoto || !hasRequiredValues) return;

    const response = await fetch(`/api/photos/${initialPhoto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        metro,
        lat: Number(lat),
        lng: Number(lng),
        spaceType,
        mood,
        atmosphere,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      photo?: SavedPhoto;
    };

    if (!response.ok || !data.photo) {
      throw new Error(data.error || "Ошибка сохранения");
    }

    return data.photo;
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setUploading(true);
    setError("");
    setProgress(0);

    try {
      if (isEditMode) {
        const savedPhoto = await handleEditSubmit();
        setProgress(100);
        invalidateFilterOptionsCache();
        setFiltersLoaded(false);
        onUploaded(savedPhoto);
        onClose();
        return;
      }

      const savedPhotos = await handleCreateSubmit();
      if (savedPhotos.length === 0) {
        setUploading(false);
        return;
      }

      setProgress(100);
      invalidateFilterOptionsCache();
      setFiltersLoaded(false);
      onUploaded(savedPhotos[0], savedPhotos);
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

  const batchStatus =
    drafts.length === 0
      ? "Выберите фото"
      : incompleteDraftCount > 0
        ? `Нужно заполнить ${incompleteDraftCount} из ${drafts.length}`
        : `${drafts.length} фото готово к загрузке`;
  const submitText = uploading
    ? isEditMode
      ? "СОХРАНЕНИЕ..."
      : `ЗАГРУЗКА... ${progress}%`
    : isEditMode
      ? "СОХРАНИТЬ"
      : drafts.length > 1
        ? `ЗАГРУЗИТЬ ${drafts.length} ФОТО`
        : "ЗАГРУЗИТЬ";

  return (
    <div
      className={styles.overlay}
      onClick={() => {
        if (!uploading) onClose();
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Закрыть"
          onClick={onClose}
          disabled={uploading}
        />

        <div className={styles.title}>
          {isEditMode ? "Редактирование фотографии" : "Загрузка фотографий"}
        </div>

        <div className={styles.body}>
          {!isEditMode ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={styles.hiddenInput}
                onChange={handleInputChange}
                multiple
              />

              {drafts.length === 0 ? (
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
                    Перетащите до {MAX_BATCH_UPLOAD_FILES} фото сюда или нажмите для выбора
                  </div>
                  <div className={styles.dropzoneFormats}>
                    JPEG, PNG, WebP до {MAX_UPLOAD_FILE_LABEL} каждое
                  </div>
                </div>
              ) : activeDraft ? (
                <div className={styles.batchArea}>
                  <div className={styles.previewWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeDraft.preview} alt="Превью" className={styles.previewImg} />
                    <button
                      type="button"
                      className={styles.removePreview}
                      onClick={() => handleRemoveDraft(activeDraft.id)}
                      aria-label="Удалить фото"
                    >
                      x
                    </button>
                  </div>

                  <div className={styles.batchHeader}>
                    <div className={styles.batchCount}>
                      Фото {activeIndex + 1} из {drafts.length}
                    </div>
                    <button
                      type="button"
                      className={styles.addMoreBtn}
                      onClick={() => inputRef.current?.click()}
                      disabled={uploading || drafts.length >= MAX_BATCH_UPLOAD_FILES}
                    >
                      Добавить
                    </button>
                  </div>

                  <div className={styles.draftPager} aria-label="Страницы выбранных фото">
                    {drafts.map((draft, index) => (
                      <button
                        key={draft.id}
                        type="button"
                        className={`${styles.draftPage} ${
                          index === activeIndex ? styles.draftPageActive : ""
                        } ${
                          hasDraftRequiredValues(draft)
                            ? styles.draftPageReady
                            : styles.draftPagePending
                        }`}
                        onClick={() => setActiveIndex(index)}
                        aria-current={index === activeIndex ? "page" : undefined}
                        aria-label={`Фото ${index + 1}`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {!isEditMode && exifLoadingCount > 0 ? (
            <div className={styles.exifHint}>
              Определяем координаты и метро: {exifLoadingCount} фото
            </div>
          ) : null}

          {isEditMode || activeDraft ? (
            <div className={styles.formFields}>
              <div className={styles.field}>
                <div className={styles.label}>Название</div>
                <input
                  className={styles.input}
                  value={isEditMode ? title : activeDraft?.title ?? ""}
                  onChange={(event) =>
                    isEditMode
                      ? setTitle(event.target.value)
                      : patchActiveDraft({ title: event.target.value })
                  }
                  placeholder="Жёлтый двор-колодец"
                />
              </div>

              {isEditMode
                ? renderMultiSelect("Станция метро", filters.metro, metro, setMetro)
                : renderMultiSelect(
                    "Станция метро",
                    filters.metro,
                    activeDraft?.metro ?? [],
                    createActiveMultiSetter("metro"),
                  )}

              <div className={styles.field}>
                <div className={styles.label}>Координаты</div>
                <div className={styles.coordsRow}>
                  <input
                    className={styles.input}
                    value={isEditMode ? lat : activeDraft?.lat ?? ""}
                    onChange={(event) =>
                      isEditMode
                        ? setLat(event.target.value)
                        : patchActiveDraft({ lat: event.target.value })
                    }
                    placeholder="Широта (59.936)"
                    type="number"
                    step="any"
                  />
                  <input
                    className={styles.input}
                    value={isEditMode ? lng : activeDraft?.lng ?? ""}
                    onChange={(event) =>
                      isEditMode
                        ? setLng(event.target.value)
                        : patchActiveDraft({ lng: event.target.value })
                    }
                    placeholder="Долгота (30.270)"
                    type="number"
                    step="any"
                  />
                </div>
              </div>

              {isEditMode
                ? renderMultiSelect("Тип пространства", filters.spaceType, spaceType, setSpaceType)
                : renderMultiSelect(
                    "Тип пространства",
                    filters.spaceType,
                    activeDraft?.spaceType ?? [],
                    createActiveMultiSetter("spaceType"),
                  )}
              {isEditMode
                ? renderMultiSelect("Эмоциональный фон", filters.mood, mood, setMood)
                : renderMultiSelect(
                    "Эмоциональный фон",
                    filters.mood,
                    activeDraft?.mood ?? [],
                    createActiveMultiSetter("mood"),
                  )}
              {isEditMode
                ? renderMultiSelect("Атмосфера", filters.atmosphere, atmosphere, setAtmosphere)
                : renderMultiSelect(
                    "Атмосфера",
                    filters.atmosphere,
                    activeDraft?.atmosphere ?? [],
                    createActiveMultiSetter("atmosphere"),
                  )}
            </div>
          ) : null}

          <div className={styles.submitBar}>
            {uploading && !isEditMode ? (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            ) : null}

            {!isEditMode && drafts.length > 0 && !uploading ? (
              <div className={styles.batchStatus}>{batchStatus}</div>
            ) : null}

            {error ? <div className={styles.error}>{error}</div> : null}

            <button
              type="button"
              className={styles.submitBtn}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {submitText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
