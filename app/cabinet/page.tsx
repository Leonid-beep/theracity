// app/(app)/cabinet/page.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import styles from "./styles.module.css";
import type { CabinetRouteItem } from "./_components/CabinetRouteModal";
import type { CabinetPhotoItem } from "./_components/CabinetPhotoModals";
import ConfirmDeleteModal from "./_components/ConfirmDeleteModal";

const CabinetRouteModal = dynamic(() => import("./_components/CabinetRouteModal"), { ssr: false });
const CabinetPhotoModals = dynamic(() => import("./_components/CabinetPhotoModals"), { ssr: false });

const makePhotoItems = (n: number): CabinetPhotoItem[] =>
  Array.from({ length: n }).map((_, i) => ({
    id: i + 1,
    src: `/images/city/city-${(i % 7) + 1}.jpg`,
    title: ["Жёлтый двор-колодец", "Тихая арка", "Сырая улица", "Светлый двор"][i % 4],
    metro: ["Василеостровская", "Сенная площадь", "Чернышевская", "Удельная"][i % 4],
    coords: ["59.936435, 30.270504", "59.931120, 30.360210", "59.944010, 30.312800", "59.999020, 30.300100"][i % 4],
  }));

const makeRouteItems = (n: number): CabinetRouteItem[] =>
  Array.from({ length: n }).map((_, i) => {
    const photos = Array.from({ length: 6 }).map((__, k) => ({
      src: `/images/city/city-${((i + k) % 7) + 1}.jpg`,
      alt: "route photo",
    }));
    return {
      id: i + 1,
      title: ["По дворам-колодцам", "Прогулка по центру", "За поворотом", "Песня", "Красиво"][i % 5],
      desc: "Маршрут для любителей дворов, плохой погоды, Невского проспекта, узких улочек и многого другого",
      metro: ["Василеостровская", "Сенная площадь", "Чернышевская", "Удельная"][i % 4],
      address: ["59.936435, 30.270504", "59.931120, 30.360210", "59.944010, 30.312800", "59.999020, 30.300100"][i % 4],
      photos,
    };
  });

const favPhotoItems = makePhotoItems(56);

const sections = [
  { key: "my_routes", title: "Мои маршруты", kind: "routes" as const, items: makeRouteItems(56) },
  { key: "fav_photos", title: "Избранные фотографии", kind: "photos" as const, items: favPhotoItems },
  { key: "fav_routes", title: "Избранные маршруты", kind: "routes" as const, items: makeRouteItems(56) },
] as const;

function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pagesToShow = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: (number | "dots")[] = [1];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    if (left > 2) out.push("dots");
    for (let p = left; p <= right; p++) out.push(p);
    if (right < totalPages - 1) out.push("dots");
    out.push(totalPages);
    return out;
  })();

  const go = (p: number) => onChange(Math.min(totalPages, Math.max(1, p)));

  return (
    <div className={styles.pagination}>
      <button
        className={`${styles.pagBtn} ${!canPrev ? styles.pagBtnDisabled : ""}`}
        aria-label="Назад"
        disabled={!canPrev}
        onClick={() => go(page - 1)}
        type="button"
      >
        ←
      </button>

      <div className={styles.pages}>
        {pagesToShow.map((p, idx) =>
          p === "dots" ? (
            <span key={`d-${idx}`} className={styles.dots}>
              …
            </span>
          ) : (
            <button
              key={p}
              className={`${styles.page} ${p === page ? styles.pageActive : ""}`}
              onClick={() => go(p)}
              aria-current={p === page ? "page" : undefined}
              type="button"
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        className={`${styles.pagBtn} ${!canNext ? styles.pagBtnDisabled : ""}`}
        aria-label="Вперёд"
        disabled={!canNext}
        onClick={() => go(page + 1)}
        type="button"
      >
        →
      </button>
    </div>
  );
}

export default function CabinetPage() {
  const pageSize = 10;

  const [pages, setPages] = useState<Record<string, number>>({
    my_routes: 1,
    fav_photos: 1,
    fav_routes: 1,
  });

  const getPage = (key: string) => pages[key] ?? 1;
  const setPage = (key: string, p: number) => setPages((prev) => ({ ...prev, [key]: p }));

  const [openRoute, setOpenRoute] = useState(false);
  const [openPhotoFlow, setOpenPhotoFlow] = useState(false);
  const [activeSectionKey, setActiveSectionKey] = useState<"my_routes" | "fav_photos" | "fav_routes" | null>(null);

  const [activeRoute, setActiveRoute] = useState<CabinetRouteItem | null>(null);
  const [activePhoto, setActivePhoto] = useState<CabinetPhotoItem | null>(null);

  const [favPhotos, setFavPhotos] = useState<Set<number>>(() => new Set(Array.from({ length: 56 }, (_, i) => i + 1)));
  const [favRoutes, setFavRoutes] = useState<Set<number>>(() => new Set(Array.from({ length: 56 }, (_, i) => i + 1)));

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"delete_route" | "remove_fav_route" | "remove_fav_photo">("delete_route");
  const [pendingRouteDeleteId, setPendingRouteDeleteId] = useState<number | null>(null);
  const [pendingPhotoDeleteId, setPendingPhotoDeleteId] = useState<number | null>(null);

  const openRouteModal = (sectionKey: "my_routes" | "fav_routes", r: CabinetRouteItem) => {
    setActiveSectionKey(sectionKey);
    setActiveRoute(r);
    setOpenRoute(true);
  };

  const openPhotoModal = (p: CabinetPhotoItem) => {
    setActiveSectionKey("fav_photos");
    setActivePhoto(p);
    setOpenPhotoFlow(true);
  };

  const askDelete = (kind: typeof confirmKind, id?: number) => {
    setConfirmKind(kind);
    if (kind === "remove_fav_photo") setPendingPhotoDeleteId(id ?? null);
    if (kind === "remove_fav_route" || kind === "delete_route") setPendingRouteDeleteId(id ?? null);
    setConfirmOpen(true);
  };

  const doDelete = () => {
    if (confirmKind === "delete_route" && (pendingRouteDeleteId || activeRoute)) {
      setOpenRoute(false);
      setActiveRoute(null);
    }
    if (confirmKind === "remove_fav_route") {
      const targetRouteId = pendingRouteDeleteId ?? activeRoute?.id ?? null;
      if (targetRouteId == null) return;
      setFavRoutes((prev) => {
        const n = new Set(prev);
        n.delete(targetRouteId);
        return n;
      });
      setOpenRoute(false);
      setActiveRoute(null);
    }
    if (confirmKind === "remove_fav_photo") {
      const targetPhotoId = pendingPhotoDeleteId ?? activePhoto?.id ?? null;
      if (targetPhotoId == null) return;
      setFavPhotos((prev) => {
        const n = new Set(prev);
        n.delete(targetPhotoId);
        return n;
      });
      setOpenPhotoFlow(false);
      setActivePhoto(null);
    }
    setPendingRouteDeleteId(null);
    setPendingPhotoDeleteId(null);
    setConfirmOpen(false);
  };

  return (
    <main className={styles.root}>
      <h1 className={styles.userName}>leo1406</h1>

      <div className={styles.sections}>
        {sections.map((s) => {
          const totalPages = Math.max(1, Math.ceil(s.items.length / pageSize));
          const page = Math.min(getPage(s.key), totalPages);

          const start = (page - 1) * pageSize;
          const pageItems = s.items.slice(start, start + pageSize);

          return (
            <section key={s.key} className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.mark}>{s.title}</span>
              </h2>

              <div className={styles.row}>
                {s.kind === "photos"
                  ? (pageItems as CabinetPhotoItem[]).map((p) => (
                      <figure
                        key={p.id}
                        className={styles.card}
                        onClick={() => openPhotoModal(p)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className={styles.thumb}>
                          {p.src ? <Image src={p.src} alt={p.title} fill className={styles.img} /> : null}
                          {favPhotos.has(p.id) ? (
                            <Image
                              src="/images/city/heart_red.png"
                              alt=""
                              width={23}
                              height={23}
                              className={styles.cardLike}
                              aria-hidden="true"
                            />
                          ) : null}
                        </div>
                        <figcaption className={styles.cap}>{p.title}</figcaption>
                      </figure>
                    ))
                  : (pageItems as CabinetRouteItem[]).map((r) => {
                      const preview = r.photos?.[0]?.src ?? "";
                      const isFav = s.key === "fav_routes" && favRoutes.has(r.id);
                      return (
                        <figure
                          key={r.id}
                          className={styles.card}
                          onClick={() => openRouteModal(s.key as any, r)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className={styles.thumb}>
                            {preview ? <Image src={preview} alt={r.title} fill className={styles.img} /> : null}
                            {isFav ? (
                              <Image
                                src="/images/city/heart_red.png"
                                alt=""
                                width={23}
                                height={23}
                                className={styles.cardLike}
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>
                          <figcaption className={styles.cap}>{r.title}</figcaption>
                        </figure>
                      );
                    })}
              </div>

              <Pager page={page} totalPages={totalPages} onChange={(p) => setPage(s.key, p)} />
            </section>
          );
        })}
      </div>

      {openRoute ? (
        <CabinetRouteModal
          open
          route={activeRoute}
          onClose={() => setOpenRoute(false)}
          actionLabel={activeSectionKey === "my_routes" ? "УДАЛИТЬ МАРШРУТ" : "УДАЛИТЬ ИЗ ИЗБРАННОГО"}
          onDelete={() => {
            if (activeSectionKey === "my_routes") askDelete("delete_route", activeRoute?.id);
            else askDelete("remove_fav_route", activeRoute?.id);
          }}
        />
      ) : null}

      {openPhotoFlow ? (
        <CabinetPhotoModals
          open
          photo={activePhoto}
          photos={favPhotoItems}
          favIds={favPhotos}
          onClose={() => setOpenPhotoFlow(false)}
          onToggleFav={(photoId) => {
            setFavPhotos((prev) => {
              const n = new Set(prev);
              if (n.has(photoId)) n.delete(photoId);
              else n.add(photoId);
              return n;
            });
          }}
          onRemoveFav={(photoId) => {
            askDelete("remove_fav_photo", photoId);
          }}
        />
      ) : null}

      {confirmOpen ? (
        <ConfirmDeleteModal open onClose={() => setConfirmOpen(false)} onYes={doDelete} />
      ) : null}
    </main>
  );
}
