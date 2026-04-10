"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import styles from "./styles.module.css";
import { useAuth } from "@/app/providers/AuthProvider";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import type { CabinetRouteItem } from "./_components/CabinetRouteModal";
import type { CabinetPhotoItem } from "./_components/CabinetPhotoModals";
import ConfirmDeleteModal from "./_components/ConfirmDeleteModal";
import { SuccessToast, useSuccessToast } from "@/app/ui/SuccessToast";
import { copyRouteShareLink } from "@/app/lib/locationLinks";
import RouteFormModal from "../routes/_components/RouteFormModal";

const CabinetRouteModal = dynamic(() => import("./_components/CabinetRouteModal"), { ssr: false });
const CabinetPhotoModals = dynamic(() => import("./_components/CabinetPhotoModals"), { ssr: false });

const PAGE_SIZE = 10;

type SectionKey = "my_routes" | "fav_photos" | "fav_routes";

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
  const { user, loading, refreshUser } = useAuth();
  const { message: successMsg, showSuccess } = useSuccessToast();

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const [myRoutes, setMyRoutes] = useState<CabinetRouteItem[]>([]);
  const [myRoutesTotal, setMyRoutesTotal] = useState(0);
  const [myRoutesPage, setMyRoutesPage] = useState(1);
  const [myRoutesLoading, setMyRoutesLoading] = useState(true);

  const [favPhotos, setFavPhotos] = useState<CabinetPhotoItem[]>([]);
  const [favPhotosTotal, setFavPhotosTotal] = useState(0);
  const [favPhotosPage, setFavPhotosPage] = useState(1);
  const [favPhotosLoading, setFavPhotosLoading] = useState(true);

  const [favRoutes, setFavRoutes] = useState<CabinetRouteItem[]>([]);
  const [favRoutesTotal, setFavRoutesTotal] = useState(0);
  const [favRoutesPage, setFavRoutesPage] = useState(1);
  const [favRoutesLoading, setFavRoutesLoading] = useState(true);

  const [favPhotoIds, setFavPhotoIds] = useState<Set<string>>(new Set());
  const [favRouteIds, setFavRouteIds] = useState<Set<string>>(new Set());

  const [openRoute, setOpenRoute] = useState(false);
  const [openPhotoFlow, setOpenPhotoFlow] = useState(false);
  const [activeSectionKey, setActiveSectionKey] = useState<SectionKey | null>(null);
  const [activeRoute, setActiveRoute] = useState<CabinetRouteItem | null>(null);
  const [activePhoto, setActivePhoto] = useState<CabinetPhotoItem | null>(null);
  const [routeForm, setRouteForm] = useState<{
    routeId: string;
    initialTitle: string;
    initialDescription: string;
    initialPhotos: CabinetRouteItem["photos"];
  } | null>(null);
  const [routeFormSubmitting, setRouteFormSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"delete_route" | "remove_fav_route" | "remove_fav_photo">("delete_route");
  const [pendingRouteDeleteId, setPendingRouteDeleteId] = useState<string | number | null>(null);
  const [pendingPhotoDeleteId, setPendingPhotoDeleteId] = useState<string | null>(null);

  const fetchMyRoutes = useCallback(async (page: number) => {
    setMyRoutesLoading(true);
    try {
      const res = await fetch(`/api/routes/my?page=${page}&pageSize=${PAGE_SIZE}`);
      const data = await res.json();
      setMyRoutes(
        (data.routes ?? []).map((r: CabinetRouteItem & { id: string }) => ({
          ...r,
          id: r.id,
        })),
      );
      setMyRoutesTotal(data.total ?? 0);
    } catch { /* ignore */ }
    setMyRoutesLoading(false);
  }, []);

  const fetchFavPhotos = useCallback(async (page: number) => {
    setFavPhotosLoading(true);
    try {
      const res = await fetch(`/api/photos/favorites?page=${page}&pageSize=${PAGE_SIZE}`);
      const data = await res.json();
      const photos: CabinetPhotoItem[] = data.photos ?? [];
      setFavPhotos(photos);
      setFavPhotosTotal(data.total ?? 0);
      setFavPhotoIds(new Set(photos.map((p) => p.id)));
    } catch { /* ignore */ }
    setFavPhotosLoading(false);
  }, []);

  const fetchFavRoutes = useCallback(async (page: number) => {
    setFavRoutesLoading(true);
    try {
      const res = await fetch(`/api/routes/favorites?page=${page}&pageSize=${PAGE_SIZE}`);
      const data = await res.json();
      const routes: CabinetRouteItem[] = data.routes ?? [];
      setFavRoutes(routes);
      setFavRoutesTotal(data.total ?? 0);
      setFavRouteIds(new Set(routes.map((r) => String(r.id))));
    } catch { /* ignore */ }
    setFavRoutesLoading(false);
  }, []);

  useEffect(() => { fetchMyRoutes(myRoutesPage); }, [myRoutesPage, fetchMyRoutes]);
  useEffect(() => { fetchFavPhotos(favPhotosPage); }, [favPhotosPage, fetchFavPhotos]);
  useEffect(() => { fetchFavRoutes(favRoutesPage); }, [favRoutesPage, fetchFavRoutes]);

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

  const applyRouteChanges = useCallback((updatedRoute: CabinetRouteItem) => {
    setMyRoutes((prev) =>
      prev.map((route) =>
        String(route.id) === String(updatedRoute.id) ? { ...route, ...updatedRoute } : route,
      ),
    );
    setFavRoutes((prev) =>
      prev.map((route) =>
        String(route.id) === String(updatedRoute.id) ? { ...route, ...updatedRoute } : route,
      ),
    );
    setActiveRoute((prev) =>
      prev && String(prev.id) === String(updatedRoute.id) ? { ...prev, ...updatedRoute } : prev,
    );
  }, []);

  const openRouteEditForm = useCallback((route: CabinetRouteItem) => {
    setRouteForm({
      routeId: String(route.id),
      initialTitle: route.title,
      initialDescription: route.desc,
      initialPhotos: route.photos,
    });
  }, []);

  const closeRouteForm = useCallback(() => {
    if (routeFormSubmitting) return;
    setRouteForm(null);
  }, [routeFormSubmitting]);

  const handleRouteFormSubmit = useCallback(
    async ({
      title,
      description,
      photoIds,
    }: {
      title: string;
      description: string;
      photoIds: string[];
    }) => {
      if (!routeForm || routeFormSubmitting) return;

      setRouteFormSubmitting(true);

      try {
        const normalizedTitle = title.trim() || "Новый маршрут";
        const normalizedDescription = description.trim();
        const response = await fetch(`/api/routes/${routeForm.routeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: normalizedTitle,
          description: normalizedDescription,
          photoIds,
        }),
      });

        if (!response.ok) return;

        const data = (await response.json().catch(() => ({}))) as {
          route?: CabinetRouteItem;
        };

        if (data.route) {
          applyRouteChanges(data.route);
        }
        showSuccess("Маршрут обновлён");
        setRouteForm(null);
      } finally {
        setRouteFormSubmitting(false);
      }
    },
    [applyRouteChanges, routeForm, routeFormSubmitting, showSuccess],
  );

  const askDelete = (kind: typeof confirmKind, id?: string | number) => {
    setConfirmKind(kind);
    if (kind === "remove_fav_photo") setPendingPhotoDeleteId(id != null ? String(id) : null);
    if (kind === "remove_fav_route" || kind === "delete_route")
      setPendingRouteDeleteId(id ?? null);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (confirmKind === "delete_route") {
      const targetId = pendingRouteDeleteId ?? activeRoute?.id ?? null;
      if (targetId != null) {
        try {
          const res = await fetch(`/api/routes/${targetId}`, { method: "DELETE" });
          if (res.ok) showSuccess("Маршрут удалён");
        } catch { /* ignore */ }
        fetchMyRoutes(myRoutesPage);
      }
      setOpenRoute(false);
      setActiveRoute(null);
    }

    if (confirmKind === "remove_fav_route") {
      const targetId = pendingRouteDeleteId ?? activeRoute?.id ?? null;
      if (targetId != null) {
        try {
          const res = await fetch("/api/routes/favorites", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ routeId: String(targetId) }),
          });
          if (res.ok) showSuccess("Маршрут убран из избранного");
        } catch { /* ignore */ }
        fetchFavRoutes(favRoutesPage);
      }
      setOpenRoute(false);
      setActiveRoute(null);
    }

    if (confirmKind === "remove_fav_photo") {
      const targetPhotoId = pendingPhotoDeleteId ?? activePhoto?.id ?? null;
      if (targetPhotoId != null) {
        try {
          const res = await fetch("/api/photos/favorites", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoId: targetPhotoId }),
          });
          if (res.ok) showSuccess("Удалено из избранного");
        } catch { /* ignore */ }
        fetchFavPhotos(favPhotosPage);
      }
      setOpenPhotoFlow(false);
      setActivePhoto(null);
    }

    setPendingRouteDeleteId(null);
    setPendingPhotoDeleteId(null);
    setConfirmOpen(false);
  };

  const myRoutesTotalPages = Math.max(1, Math.ceil(myRoutesTotal / PAGE_SIZE));
  const favPhotosTotalPages = Math.max(1, Math.ceil(favPhotosTotal / PAGE_SIZE));
  const favRoutesTotalPages = Math.max(1, Math.ceil(favRoutesTotal / PAGE_SIZE));

  return (
    <main className={styles.root}>
      <h1 className={styles.userName}>
        {loading ? "…" : (user?.username ?? "")}
      </h1>

      <div className={styles.sections}>
        {/* Мои маршруты */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.mark}>Мои маршруты</span>
          </h2>

          <div className={styles.row}>
            {myRoutesLoading ? (
              <p className={styles.loading}>Загрузка…</p>
            ) : myRoutes.length === 0 ? (
              <p className={styles.empty}>Нет маршрутов</p>
            ) : (
              myRoutes.map((r) => {
                const preview = r.photos?.[0]?.src ?? "";
                return (
                  <figure
                    key={r.id}
                    className={styles.card}
                    onClick={() => openRouteModal("my_routes", r)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.thumb}>
                      {preview ? (
                        <OptimizedPhoto
                          src={preview}
                          alt={r.title}
                          fill
                          sizes="150px"
                          className={styles.img}
                          quality={70}
                        />
                      ) : (
                        <span className={styles.thumbEmptyLabel}>Пустой маршрут</span>
                      )}
                      {!r.isPublished ? (
                        <span className={styles.unpublishedBadge}>Не опубликован</span>
                      ) : null}
                    </div>
                    <figcaption className={styles.cap}>{r.title}</figcaption>
                    {!r.isPublished ? (
                      <div className={styles.cardStatus}>Опубликуйте маршрут</div>
                    ) : null}
                  </figure>
                );
              })
            )}
          </div>

          {!myRoutesLoading && myRoutesTotal > PAGE_SIZE && (
            <Pager page={myRoutesPage} totalPages={myRoutesTotalPages} onChange={setMyRoutesPage} />
          )}
        </section>

        {/* Избранные фотографии */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.mark}>Избранные фотографии</span>
          </h2>

          <div className={styles.row}>
            {favPhotosLoading ? (
              <p className={styles.loading}>Загрузка…</p>
            ) : favPhotos.length === 0 ? (
              <p className={styles.empty}>Нет избранных фотографий</p>
            ) : (
              favPhotos.map((p) => (
                <figure
                  key={p.id}
                  className={styles.card}
                  onClick={() => openPhotoModal(p)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.thumb}>
                    {p.src ? (
                      <OptimizedPhoto
                        src={p.src}
                        alt={p.title}
                        fill
                        sizes="150px"
                        className={styles.img}
                        quality={70}
                      />
                    ) : null}
                    <Image
                      src="/images/city/heart_red.png"
                      alt=""
                      width={23}
                      height={23}
                      className={styles.cardLike}
                      aria-hidden="true"
                    />
                  </div>
                  <figcaption className={styles.cap}>{p.title}</figcaption>
                </figure>
              ))
            )}
          </div>

          {!favPhotosLoading && favPhotosTotal > PAGE_SIZE && (
            <Pager page={favPhotosPage} totalPages={favPhotosTotalPages} onChange={setFavPhotosPage} />
          )}
        </section>

        {/* Избранные маршруты */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.mark}>Избранные маршруты</span>
          </h2>

          <div className={styles.row}>
            {favRoutesLoading ? (
              <p className={styles.loading}>Загрузка…</p>
            ) : favRoutes.length === 0 ? (
              <p className={styles.empty}>Нет избранных маршрутов</p>
            ) : (
              favRoutes.map((r) => {
                const preview = r.photos?.[0]?.src ?? "";
                return (
                  <figure
                    key={r.id}
                    className={styles.card}
                    onClick={() => openRouteModal("fav_routes", r)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.thumb}>
                      {preview ? (
                        <OptimizedPhoto
                          src={preview}
                          alt={r.title}
                          fill
                          sizes="150px"
                          className={styles.img}
                          quality={70}
                        />
                      ) : (
                        <span className={styles.thumbEmptyLabel}>Пустой маршрут</span>
                      )}
                      <Image
                        src="/images/city/heart_red.png"
                        alt=""
                        width={23}
                        height={23}
                        className={styles.cardLike}
                        aria-hidden="true"
                      />
                    </div>
                    <figcaption className={styles.cap}>{r.title}</figcaption>
                  </figure>
                );
              })
            )}
          </div>

          {!favRoutesLoading && favRoutesTotal > PAGE_SIZE && (
            <Pager page={favRoutesPage} totalPages={favRoutesTotalPages} onChange={setFavRoutesPage} />
          )}
        </section>
      </div>

      {openRoute && (
        <CabinetRouteModal
          open
          route={activeRoute}
          showPublish={activeSectionKey === "my_routes"}
          onPublish={async () => {
            const routeId = activeRoute?.id;
            if (!routeId) return;
            try {
              const res = await fetch(`/api/routes/${routeId}`, { method: "PATCH" });
              if (res.ok) {
                showSuccess("Маршрут опубликован");
                setActiveRoute((prev) => (prev ? { ...prev, isPublished: true } : prev));
              }
            } catch { /* ignore */ }
            await Promise.all([fetchMyRoutes(myRoutesPage), fetchFavRoutes(favRoutesPage)]);
          }}
          onShare={async () => {
            const routeId = activeRoute?.id;
            if (!routeId) return;

            try {
              await copyRouteShareLink(routeId);
              showSuccess("Ссылка на маршрут скопирована");
            } catch {
              showSuccess("Не удалось скопировать ссылку");
            }
          }}
          onClose={() => setOpenRoute(false)}
          onEdit={openRouteEditForm}
          actionLabel={activeSectionKey === "my_routes" ? "УДАЛИТЬ МАРШРУТ" : "УДАЛИТЬ ИЗ ИЗБРАННОГО"}
          onDelete={() => {
            if (activeSectionKey === "my_routes") askDelete("delete_route", activeRoute?.id);
            else askDelete("remove_fav_route", activeRoute?.id);
          }}
        />
      )}

      {openPhotoFlow && (
        <CabinetPhotoModals
          open
          photo={activePhoto}
          photos={favPhotos}
          favIds={favPhotoIds}
          onClose={() => setOpenPhotoFlow(false)}
          onRouteCreated={() => {
            if (myRoutesPage === 1) void fetchMyRoutes(1);
            else setMyRoutesPage(1);
          }}
          onActionSuccess={showSuccess}
          onToggleFav={(photoId) => {
            setFavPhotoIds((prev) => {
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
      )}

      {confirmOpen && (
        <ConfirmDeleteModal open onClose={() => setConfirmOpen(false)} onYes={doDelete} />
      )}

      <RouteFormModal
        open={!!routeForm}
        mode="edit"
        initialTitle={routeForm?.initialTitle}
        initialDescription={routeForm?.initialDescription}
        initialPhotos={routeForm?.initialPhotos}
        submitting={routeFormSubmitting}
        onClose={closeRouteForm}
        onSubmit={handleRouteFormSubmit}
      />

      <SuccessToast message={successMsg} />
    </main>
  );
}
