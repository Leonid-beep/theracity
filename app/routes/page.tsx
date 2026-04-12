"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./styles.module.css";
import { useAuth } from "@/app/providers/AuthProvider";
import { SuccessToast, useSuccessToast } from "@/app/ui/SuccessToast";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import { useResponsivePageSize } from "@/app/lib/useResponsivePageSize";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";
import { copyRouteShareLink } from "@/app/lib/locationLinks";
import {
  fetchFilterOptions,
  getEmptyFilterOptions,
  type FilterOptions,
} from "@/app/lib/clientFilters";

const RouteModal = dynamic(() => import("./_components/RouteModal"), {
  ssr: false,
});
const RouteFormModal = dynamic(() => import("./_components/RouteFormModal"), {
  ssr: false,
});

export type RouteItem = {
  id: string;
  title: string;
  desc: string;
  authorUsername: string;
  metro: string[];
  address: string;
  photos: { id: string; src: string; alt: string; metro?: string[]; address?: string }[];
  coverUrl: string;
  isPublished?: boolean;
  canEdit?: boolean;
};

function isAllSelected(selected: string[], options: string[]): boolean {
  return options.length > 0 && selected.length === options.length;
}

function summarizeSelection(selected: string[], options: string[]): string {
  if (!selected.length) return "Выберите...";
  if (isAllSelected(selected, options)) return "Все";
  return selected.join(", ");
}

function buildFilterValue(selected: string[], options: string[]): string | null {
  if (!selected.length || !options.length || isAllSelected(selected, options)) {
    return null;
  }

  return selected.join(",");
}

function buildRoutesSearch(filters: Record<string, string>, extras?: Record<string, string>) {
  return new URLSearchParams({
    ...filters,
    ...extras,
  });
}

function RoutesPageContent() {
  const pageSize = useResponsivePageSize();
  const searchParams = useSearchParams();
  const sharedRouteId = searchParams.get("routeId");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  const { message: successMsg, showSuccess } = useSuccessToast();

  const returnToRoutes = "/routes";

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [liked, setLiked] = useState<Set<string>>(() => new Set());

  const [open, setOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteItem | null>(null);
  const [routeForm, setRouteForm] = useState<{
    mode: "create" | "edit";
    routeId?: string;
    initialTitle: string;
    initialDescription: string;
    initialPhotos: RouteItem["photos"];
    isPublished?: boolean;
  } | null>(null);
  const [routeFormSubmitting, setRouteFormSubmitting] = useState(false);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>(getEmptyFilterOptions);
  const [selMetro, setSelMetro] = useState<string[]>([]);
  const [selSpace, setSelSpace] = useState<string[]>([]);
  const [selMood, setSelMood] = useState<string[]>([]);
  const [selAtmo, setSelAtmo] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const fetchRequestIdRef = useRef(0);

  const filterRef = useRef<HTMLElement>(null);
  useCloseDetailsOnOutsideClick(filterRef, "routes-filters");

  const requireAuth = useCallback(() => {
    if (authLoading) return;
    router.push(`/auth/login?returnTo=${encodeURIComponent(returnToRoutes)}`);
  }, [authLoading, router]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLiked(new Set());
      return;
    }

    fetch("/api/routes/favorites/ids")
      .then((response) => response.json())
      .then((data) => setLiked(new Set(data.ids ?? [])))
      .catch(() => {});
  }, [authLoading, user]);

  useEffect(() => {
    fetchFilterOptions()
      .then((data) => {
        setFilterOptions(data);

        if (!filtersInitialized) {
          setSelMetro(data.metro);
          setSelSpace(data.spaceType);
          setSelMood(data.mood);
          setSelAtmo(data.atmosphere);
          setFiltersInitialized(true);
        }
      })
      .catch(() => {});
  }, [filtersInitialized]);

  const closeRouteModal = useCallback(() => {
    setOpen(false);
    setActiveRoute(null);

    if (!sharedRouteId) return;

    const nextSearch = new URLSearchParams(searchParams.toString());
    nextSearch.delete("routeId");

    const nextQuery = nextSearch.toString();
    router.replace(nextQuery ? `/routes?${nextQuery}` : "/routes", { scroll: false });
  }, [router, searchParams, sharedRouteId]);

  const handleRouteDeleted = useCallback(
    (routeId: string) => {
      showSuccess("Маршрут удалён");
      setRoutes((prev) => prev.filter((route) => route.id !== routeId));
      setTotal((currentTotal) => Math.max(0, currentTotal - 1));
      setLiked((prev) => {
        const next = new Set(prev);
        next.delete(routeId);
        return next;
      });
      closeRouteModal();
    },
    [closeRouteModal, showSuccess],
  );

  const fetchRoutes = useCallback(
    async (nextPage: number, filters: Record<string, string>) => {
      const requestId = ++fetchRequestIdRef.current;
      setLoading(true);

      const pageSearch = buildRoutesSearch(filters, {
        page: String(nextPage),
        pageSize: String(pageSize),
      });
      try {
        const pageResponse = await fetch(`/api/routes?${pageSearch}`);
        const pageData = await pageResponse.json();

        if (fetchRequestIdRef.current !== requestId) {
          return;
        }

        setRoutes(pageData.routes ?? []);
        setTotal(pageData.total ?? 0);
      } catch {
        if (fetchRequestIdRef.current !== requestId) {
          return;
        }

        setRoutes([]);
        setTotal(0);
      }

      if (fetchRequestIdRef.current === requestId) {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    void fetchRoutes(page, appliedFilters);
  }, [page, appliedFilters, fetchRoutes]);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > nextTotalPages) {
      setPage(nextTotalPages);
    }
  }, [page, pageSize, total]);

  useEffect(() => {
    if (!sharedRouteId) return;

    let cancelled = false;

    fetch(`/api/routes/${sharedRouteId}`)
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data.route as RouteItem | undefined;
      })
      .then((route) => {
        if (!route || cancelled) return;
        setActiveRoute(route);
        setOpen(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [sharedRouteId]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const go = (nextPage: number) => {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
  };

  const pagesToShow = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const result: (number | "dots")[] = [1];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);

    if (left > 2) result.push("dots");

    for (let nextPage = left; nextPage <= right; nextPage += 1) {
      result.push(nextPage);
    }

    if (right < totalPages - 1) result.push("dots");
    result.push(totalPages);

    return result;
  }, [page, totalPages]);

  const openRoute = (route: RouteItem) => {
    setActiveRoute(route);
    setOpen(true);
  };

  const applyRouteChanges = useCallback((updatedRoute: RouteItem) => {
    setRoutes((prev) =>
      prev.map((route) => (route.id === updatedRoute.id ? { ...route, ...updatedRoute } : route)),
    );
    setActiveRoute((prev) =>
      prev?.id === updatedRoute.id ? { ...prev, ...updatedRoute } : prev,
    );
  }, []);

  const openCreateRouteForm = () => {
    setRouteForm({
      mode: "create",
      initialTitle: "",
      initialDescription: "",
      initialPhotos: [],
    });
  };

  const openEditRouteForm = (route: Pick<RouteItem, "id" | "title" | "desc" | "photos">) => {
    setRouteForm({
      mode: "edit",
      routeId: route.id,
      initialTitle: route.title,
      initialDescription: route.desc,
      initialPhotos: route.photos,
      isPublished: true,
    });
  };

  const closeRouteForm = () => {
    if (routeFormSubmitting) return;
    setRouteForm(null);
  };

  const toggleLike = async (routeId: string) => {
    if (authLoading) return;

    if (!user) {
      requireAuth();
      return;
    }

    const wasLiked = liked.has(routeId);

    setLiked((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(routeId);
      else next.add(routeId);
      return next;
    });

    try {
      const response = await fetch("/api/routes/favorites", {
        method: wasLiked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId }),
      });

      if (response.ok) {
        showSuccess(
          wasLiked ? "Удалено из избранного" : "Маршрут добавлен в избранное",
        );
      } else {
        setLiked((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(routeId);
          else next.delete(routeId);
          return next;
        });
      }
    } catch {
      setLiked((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(routeId);
        else next.delete(routeId);
        return next;
      });
    }
  };

  const handleShareRoute = useCallback(
    async (routeId: string) => {
      try {
        await copyRouteShareLink(routeId);
        showSuccess("Ссылка на маршрут скопирована");
      } catch {
        showSuccess("Не удалось скопировать ссылку");
      }
    },
    [showSuccess],
  );

  const handleRouteFormSubmit = async ({
    title,
    description,
    photoIds,
  }: {
    title: string;
    description: string;
    photoIds: string[];
  }) => {
    if (!routeForm || routeFormSubmitting || authLoading) return;

    if (!user) {
      requireAuth();
      return;
    }

    setRouteFormSubmitting(true);

    try {
      const normalizedTitle = title.trim() || "Новый маршрут";
      const normalizedDescription = description.trim();

      if (routeForm.mode === "create") {
        const response = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: normalizedTitle,
            description: normalizedDescription,
            photoIds: [],
          }),
        });

        if (response.ok) {
          showSuccess("Маршрут создан");
          const data = (await response.json().catch(() => ({}))) as {
            route?: { id?: string };
          };
          const createdRouteId = data.route?.id;

          setRouteForm(null);
          router.push(
            createdRouteId
              ? `/gallery?createdRouteId=${encodeURIComponent(createdRouteId)}`
              : "/gallery?createdRouteId=1",
          );
        }

        return;
      }

      if (!routeForm.routeId) return;

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
        route?: RouteItem;
      };

      if (data.route) {
        applyRouteChanges(data.route);
      }
      showSuccess("Маршрут обновлён");
      setRouteForm(null);
    } finally {
      setRouteFormSubmitting(false);
    }
  };

  const handleApplyFilters = () => {
    if (
      selMetro.length === 0 &&
      selSpace.length === 0 &&
      selMood.length === 0 &&
      selAtmo.length === 0
    ) {
      return;
    }

    const nextFilters: Record<string, string> = {};
    const metro = buildFilterValue(selMetro, filterOptions.metro);
    const spaceType = buildFilterValue(selSpace, filterOptions.spaceType);
    const mood = buildFilterValue(selMood, filterOptions.mood);
    const atmosphere = buildFilterValue(selAtmo, filterOptions.atmosphere);

    if (metro) nextFilters.metro = metro;
    if (spaceType) nextFilters.spaceType = spaceType;
    if (mood) nextFilters.mood = mood;
    if (atmosphere) nextFilters.atmosphere = atmosphere;

    setAppliedFilters(nextFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelMetro([]);
    setSelSpace([]);
    setSelMood([]);
    setSelAtmo([]);
    setAppliedFilters({});
    setPage(1);
  };

  const hasAppliedFilters = Object.keys(appliedFilters).length > 0;
  const canResetFilters =
    hasAppliedFilters ||
    selMetro.length > 0 ||
    selSpace.length > 0 ||
    selMood.length > 0 ||
    selAtmo.length > 0;
  const canFind =
    selMetro.length > 0 ||
    selSpace.length > 0 ||
    selMood.length > 0 ||
    selAtmo.length > 0;

  const toggleValue = (
    value: string,
    options: string[],
    setter: (updater: (prev: string[]) => string[]) => void,
  ) => {
    setter((prev) => {
      const next = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      return options.filter((option) => next.includes(option));
    });
  };

  return (
    <main className={styles.root}>
      <h1 className={styles.h1}>
        <span className={styles.mark}>Посмотрите</span> маршруты пользователей
      </h1>

      <button
        type="button"
        className={styles.createBtn}
        onClick={() => {
          if (!user) {
            requireAuth();
            return;
          }
          openCreateRouteForm();
        }}
      >
        Создать новый маршрут
      </button>

      <div className={styles.wrap}>
        <section className={styles.gallery}>
          <div className={styles.grid}>
            {loading && routes.length === 0 ? (
              <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#fff" }}>
                Загрузка...
              </p>
            ) : routes.length === 0 ? (
              <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#111" }}>
                Пока нет маршрутов
              </p>
            ) : (
              routes.map((route) => {
                const isLiked = liked.has(route.id);
                const cover = route.coverUrl || route.photos[0]?.src;

                return (
                  <figure
                    key={route.id}
                    className={styles.card}
                    onClick={() => openRoute(route)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openRoute(route);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.thumb}>
                      {cover ? (
                        <OptimizedPhoto
                          src={cover}
                          alt={route.title}
                          fill
                          sizes="150px"
                          className={styles.img}
                          quality={70}
                        />
                      ) : null}
                      {isLiked ? (
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
                    <figcaption className={styles.cap}>{route.title}</figcaption>
                  </figure>
                );
              })
            )}
          </div>

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
              {pagesToShow.map((pageNumber, index) =>
                pageNumber === "dots" ? (
                  <span key={`d-${index}`} className={styles.dots}>
                    …
                  </span>
                ) : (
                  <button
                    key={pageNumber}
                    className={`${styles.page} ${pageNumber === page ? styles.pageActive : ""}`}
                    onClick={() => go(pageNumber)}
                    aria-current={pageNumber === page ? "page" : undefined}
                  >
                    {pageNumber}
                  </button>
                ),
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
        </section>

        <aside ref={filterRef} className={styles.filter}>
          <div className={styles.filterBox}>
            <h2 className={styles.filterTitle}>
              <span className={styles.mark}>Фильтр</span> для маршрутов
            </h2>

            <div className={styles.filterFields}>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Тип пространства</div>
                <details className={styles.multi} name="routes-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {summarizeSelection(selSpace, filterOptions.spaceType)}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.spaceType.map((value) => (
                      <label key={value} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selSpace.includes(value)}
                          onChange={() =>
                            toggleValue(value, filterOptions.spaceType, setSelSpace)
                          }
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Эмоциональный фон</div>
                <details className={styles.multi} name="routes-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {summarizeSelection(selMood, filterOptions.mood)}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.mood.map((value) => (
                      <label key={value} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selMood.includes(value)}
                          onChange={() => toggleValue(value, filterOptions.mood, setSelMood)}
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Станция метро</div>
                <details className={styles.multi} name="routes-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {summarizeSelection(selMetro, filterOptions.metro)}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.metro.map((value) => (
                      <label key={value} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selMetro.includes(value)}
                          onChange={() => toggleValue(value, filterOptions.metro, setSelMetro)}
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Атмосфера</div>
                <details className={styles.multi} name="routes-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {summarizeSelection(selAtmo, filterOptions.atmosphere)}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.atmosphere.map((value) => (
                      <label key={value} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selAtmo.includes(value)}
                          onChange={() =>
                            toggleValue(value, filterOptions.atmosphere, setSelAtmo)
                          }
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            <button
              type="button"
              className={styles.apply}
              onClick={handleApplyFilters}
              disabled={!canFind}
            >
              Применить
            </button>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.findBtn}
                onClick={handleApplyFilters}
                aria-label="Найти"
                disabled={!canFind}
              >
                Найти
              </button>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={handleResetFilters}
                disabled={!canResetFilters}
                aria-label="Сбросить"
              >
                Сбросить
              </button>
            </div>
          </div>
        </aside>
      </div>

      {open && activeRoute ? (
        <RouteModal
          open={open}
          route={activeRoute}
          likedRouteIds={liked}
          onToggleLike={toggleLike}
          onClose={closeRouteModal}
          isAdmin={isAdmin}
          isAuthenticated={!!user}
          onRequireAuth={requireAuth}
          onShare={(routeId) => void handleShareRoute(routeId)}
          onEdit={openEditRouteForm}
          onRouteDeleted={handleRouteDeleted}
        />
      ) : null}

      <RouteFormModal
        open={!!routeForm}
        mode={routeForm?.mode ?? "create"}
        initialTitle={routeForm?.initialTitle}
        initialDescription={routeForm?.initialDescription}
        initialPhotos={routeForm?.initialPhotos}
        isPublished={routeForm?.isPublished}
        submitting={routeFormSubmitting}
        onClose={closeRouteForm}
        onSubmit={handleRouteFormSubmit}
      />

      <SuccessToast message={successMsg} />
    </main>
  );
}

export default function RoutesPage() {
  return (
    <Suspense fallback={<main className={styles.root} />}>
      <RoutesPageContent />
    </Suspense>
  );
}
