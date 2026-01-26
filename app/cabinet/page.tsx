"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import styles from "./styles.module.css";
import CabinetRouteModal, { CabinetRouteItem } from "./_components/CabinetRouteModal";
import CabinetPhotoModals, { CabinetPhotoItem } from "./_components/CabinetPhotoModals";
import ConfirmDeleteModal from "./_components/ConfirmDeleteModal";

type ItemBase = { id: number; src: string; title: string };

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
      desc:
        "Маршрут для любителей дворов, плохой погоды, Невского проспекта, узких улочек и многого другого",
      metro: ["Василеостровская", "Сенная площадь", "Чернышевская", "Удельная"][i % 4],
      address: ["59.936435, 30.270504", "59.931120, 30.360210", "59.944010, 30.312800", "59.999020, 30.300100"][i % 4],
      photos,
    };
  });

const sections = [
  { key: "my_routes", title: "Мои маршруты", kind: "routes" as const, items: makeRouteItems(56) },
  { key: "fav_photos", title: "Избранные фотографии", kind: "photos" as const, items: makePhotoItems(56) },
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

  const pagesToShow = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: (number | "dots")[] = [1];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    if (left > 2) out.push("dots");
    for (let p = left; p <= right; p++) out.push(p);
    if (right < totalPages - 1) out.push("dots");
    out.push(totalPages);
    return out;
  }, [page, totalPages]);

  const go = (p: number) => onChange(Math.min(totalPages, Math.max(1, p)));

  return (
    <div className={styles.pagination}>
      <button
        className={`${styles.pagBtn} ${!canPrev ? styles.pagBtnDisabled : ""}`}
        aria-label="Назад"
        disabled={!canPrev}
        onClick={() => go(page - 1)}
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

  const askDelete = (kind: typeof confirmKind) => {
    setConfirmKind(kind);
    setConfirmOpen(true);
  };

  const doDelete = () => {
    if (confirmKind === "delete_route" && activeRoute) {
      // мок: “удалили” — просто закрываем
      setOpenRoute(false);
      setActiveRoute(null);
    }
    if (confirmKind === "remove_fav_route" && activeRoute) {
      setFavRoutes((prev) => {
        const n = new Set(prev);
        n.delete(activeRoute.id);
        return n;
      });
      setOpenRoute(false);
      setActiveRoute(null);
    }
    if (confirmKind === "remove_fav_photo" && activePhoto) {
      setFavPhotos((prev) => {
        const n = new Set(prev);
        n.delete(activePhoto.id);
        return n;
      });
      setOpenPhotoFlow(false);
      setActivePhoto(null);
    }
    setConfirmOpen(false);
  };

  return (
    <main className={styles.root}>
      <h1 className={styles.userName}>leo1406</h1>

      <div className={styles.sections}>
        {sections.map((s) => {
          const totalPages = Math.max(1, Math.ceil(s.items.length / pageSize));
          const page = Math.min(getPage(s.key), totalPages);

          const pageItems = useMemo(() => {
            const start = (page - 1) * pageSize;
            return (s.items as any[]).slice(start, start + pageSize);
          }, [page, s.items]);

          return (
            <section key={s.key} className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.mark}>{s.title}</span>
              </h2>

              <div className={styles.row}>
                {pageItems.map((p: ItemBase) => (
                  <figure
                    key={p.id}
                    className={styles.card}
                    onClick={() => {
                      if (s.kind === "routes") openRouteModal(s.key as any, p as any);
                      else openPhotoModal(p as any);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.thumb}>
                      <Image src={p.src} alt={p.title} fill className={styles.img} />
                      {s.key === "fav_photos" && favPhotos.has(p.id) ? (
                        <span className={styles.likeDot} aria-hidden="true" />
                      ) : null}
                      {s.key === "fav_routes" && favRoutes.has(p.id) ? (
                        <span className={styles.likeDot} aria-hidden="true" />
                      ) : null}
                    </div>
                    <figcaption className={styles.cap}>{p.title}</figcaption>
                  </figure>
                ))}
              </div>

              <Pager page={page} totalPages={totalPages} onChange={(p) => setPage(s.key, p)} />
            </section>
          );
        })}
      </div>

      <CabinetRouteModal
        open={openRoute}
        route={activeRoute}
        onClose={() => setOpenRoute(false)}
        actionLabel={
          activeSectionKey === "my_routes" ? "УДАЛИТЬ МАРШРУТ" : "УДАЛИТЬ ИЗ ИЗБРАННОГО"
        }
        onDelete={() => {
          if (activeSectionKey === "my_routes") askDelete("delete_route");
          else askDelete("remove_fav_route");
        }}
      />

      <CabinetPhotoModals
        open={openPhotoFlow}
        photo={activePhoto}
        isFav={activePhoto ? favPhotos.has(activePhoto.id) : false}
        onClose={() => setOpenPhotoFlow(false)}
        onToggleFav={() => {
          if (!activePhoto) return;
          setFavPhotos((prev) => {
            const n = new Set(prev);
            if (n.has(activePhoto.id)) n.delete(activePhoto.id);
            else n.add(activePhoto.id);
            return n;
          });
        }}
        onRemoveFav={() => askDelete("remove_fav_photo")}
      />

      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onYes={doDelete}
      />
    </main>
  );
}
