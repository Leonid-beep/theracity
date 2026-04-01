"use client";
//main

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import styles from "./styles.module.css";
import createStyles from "../gallery/_components/photoModals.module.css";
import { useAuth } from "@/app/providers/AuthProvider";
import { SuccessToast, useSuccessToast } from "@/app/ui/SuccessToast";
import OptimizedPhoto from "@/app/ui/OptimizedPhoto";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

const RouteModal = dynamic(() => import("./_components/RouteModal"), { ssr: false });

function useRoutesBreakpoint() {
  const [pageSize, setPageSize] = useState(32);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w <= 480) setPageSize(8);
      else if (w <= 700) setPageSize(16);
      else if (w <= 1024) setPageSize(25);
      else if (w <= 1440) setPageSize(32);
      else setPageSize(28);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return pageSize;
}

export type RouteItem = {
  id: string;
  title: string;
  desc: string;
  authorUsername: string;
  metro: string;
  address: string;
  photos: { src: string; alt: string; metro?: string; address?: string }[];
  coverUrl: string;
};

type Filters = {
  metro: string[];
  spaceType: string[];
  mood: string[];
  atmosphere: string[];
};

export default function RoutesPage() {
  const pageSize = useRoutesBreakpoint();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  const { message: successMsg, showSuccess } = useSuccessToast();

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [liked, setLiked] = useState<Set<string>>(() => new Set());

  const [open, setOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [filterOptions, setFilterOptions] = useState<Filters>({
    metro: [],
    spaceType: [],
    mood: [],
    atmosphere: [],
  });
  const [selMetro, setSelMetro] = useState<string[]>([]);
  const [selSpace, setSelSpace] = useState<string[]>([]);
  const [selMood, setSelMood] = useState<string[]>([]);
  const [selAtmo, setSelAtmo] = useState<string[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const filterRef = useRef<HTMLElement>(null);
  useCloseDetailsOnOutsideClick(filterRef, "routes-filters");

  useEffect(() => {
    fetch("/api/routes/favorites/ids")
      .then((r) => r.json())
      .then((d) => setLiked(new Set(d.ids ?? [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then((d) => setFilterOptions(d))
      .catch(() => {});
  }, []);

  const handleRouteDeleted = useCallback(
    (id: string) => {
      showSuccess("Маршрут удалён");
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setLiked((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      setOpen(false);
      setActiveRoute(null);
    },
    [showSuccess],
  );

  const fetchRoutes = useCallback(
    async (p: number, filters: Record<string, string>) => {
      setLoading(true);
      const sp = new URLSearchParams({
        page: String(p),
        pageSize: String(pageSize),
        ...filters,
      });
      try {
        const res = await fetch(`/api/routes?${sp}`);
        const data = await res.json();
        setRoutes(data.routes ?? []);
        setTotal(data.total ?? 0);
      } catch {
        setRoutes([]);
        setTotal(0);
      }
      setLoading(false);
    },
    [pageSize],
  );

  useEffect(() => {
    fetchRoutes(page, appliedFilters);
  }, [page, appliedFilters, fetchRoutes]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const go = (p: number) => setPage(Math.min(totalPages, Math.max(1, p)));

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

  const openRoute = (r: RouteItem) => {
    setActiveRoute(r);
    setOpen(true);
  };

  const toggleLike = async (routeId: string) => {
    const was = liked.has(routeId);
    setLiked((prev) => {
      const next = new Set(prev);
      if (was) next.delete(routeId);
      else next.add(routeId);
      return next;
    });

    try {
      const res = await fetch("/api/routes/favorites", {
        method: was ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId }),
      });
      if (res.ok) {
        showSuccess(was ? "Удалено из избранного" : "Маршрут добавлен в избранное");
      } else {
        setLiked((prev) => {
          const next = new Set(prev);
          if (was) next.add(routeId);
          else next.delete(routeId);
          return next;
        });
      }
    } catch {
      setLiked((prev) => {
        const next = new Set(prev);
        if (was) next.add(routeId);
        else next.delete(routeId);
        return next;
      });
    }
  };

  const handleApplyFilters = () => {
    const f: Record<string, string> = {};
    if (selMetro.length) f.metro = selMetro.join(",");
    if (selSpace.length) f.spaceType = selSpace.join(",");
    if (selMood.length) f.mood = selMood.join(",");
    if (selAtmo.length) f.atmosphere = selAtmo.join(",");
    setAppliedFilters(f);
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

  const toggleValue = (value: string, setter: (updater: (prev: string[]) => string[]) => void) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const createEmptyRoute = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim() || "Новый маршрут",
          description: newDesc.trim(),
          photoIds: [],
        }),
      });
      if (res.ok) {
        showSuccess("Маршрут создан");
        setCreateOpen(false);
        setNewTitle("");
        setNewDesc("");
        await fetchRoutes(page, appliedFilters);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className={styles.root}>
      <h1 className={styles.h1}>
        <span className={styles.mark}>Посмотрите</span> маршруты пользователей
      </h1>
      <button type="button" className={styles.createBtn} onClick={() => setCreateOpen(true)}>
        СОЗДАТЬ МАРШРУТ
      </button>

      <div className={styles.wrap}>
        <section className={styles.gallery}>
          <div className={styles.grid}>
            {loading && routes.length === 0 ? (
              <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#fff" }}>Загрузка...</p>
            ) : routes.length === 0 ? (
              <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#111" }}>Пока нет маршрутов</p>
            ) : (
              routes.map((r) => {
                const isLiked = liked.has(r.id);
                const cover = r.coverUrl || r.photos[0]?.src;
                return (
                  <figure key={r.id} className={styles.card} onClick={() => openRoute(r)} role="button" tabIndex={0}>
                    <div className={styles.thumb}>
                      {cover ? (
                        <OptimizedPhoto
                          src={cover}
                          alt={r.title}
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
                    <figcaption className={styles.cap}>{r.title}</figcaption>
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
        </section>

        <aside ref={filterRef} className={styles.filter}>
          <div className={styles.filterBox}>
            <h2 className={styles.filterTitle}>
              <span className={styles.mark}>Фильтр</span> для маршрутов
            </h2>

            <div className={styles.filterFields}>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>тип пространства</div>
                <details className={styles.multi} name="routes-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {selSpace.length ? selSpace.join(", ") : "Все"}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.spaceType.map((v) => (
                      <label key={v} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selSpace.includes(v)}
                          onChange={() => toggleValue(v, setSelSpace)}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>эмоциональный фон</div>
                <details className={styles.multi} name="routes-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {selMood.length ? selMood.join(", ") : "Все"}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.mood.map((v) => (
                      <label key={v} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selMood.includes(v)}
                          onChange={() => toggleValue(v, setSelMood)}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>станция метро</div>
                <details className={styles.multi} name="routes-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {selMetro.length ? selMetro.join(", ") : "Все"}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.metro.map((v) => (
                      <label key={v} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selMetro.includes(v)}
                          onChange={() => toggleValue(v, setSelMetro)}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>атмосфера</div>
                <details className={styles.multi} name="routes-filters">
                  <summary className={styles.select}>
                    <span className={styles.selectValue}>
                      {selAtmo.length ? selAtmo.join(", ") : "Все"}
                    </span>
                  </summary>
                  <div className={styles.multiMenu}>
                    {filterOptions.atmosphere.map((v) => (
                      <label key={v} className={styles.multiItem}>
                        <input
                          type="checkbox"
                          checked={selAtmo.includes(v)}
                          onChange={() => toggleValue(v, setSelAtmo)}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            <button
              className={styles.apply}
              onClick={hasAppliedFilters ? handleResetFilters : handleApplyFilters}
            >
              {hasAppliedFilters ? "СБРОСИТЬ" : "ПРИМЕНИТЬ"}
            </button>
          </div>
        </aside>
      </div>

      {open && activeRoute ? (
        <RouteModal
          open={open}
          route={activeRoute}
          liked={liked.has(activeRoute.id)}
          onToggleLike={() => toggleLike(activeRoute.id)}
          onClose={() => setOpen(false)}
          isAdmin={isAdmin}
          onRouteDeleted={handleRouteDeleted}
        />
      ) : null}

      {createOpen ? (
        <div className={createStyles.overlay} onClick={() => setCreateOpen(false)} role="presentation">
          <div
            className={`${createStyles.modal} ${createStyles.modalCreate}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button type="button" className={createStyles.closeBtn} onClick={() => setCreateOpen(false)} aria-label="Закрыть" />
            <div className={createStyles.createTitle}>Создание маршрута</div>
            <div className={createStyles.createBody}>
              <div className={createStyles.createField}>
                <div className={createStyles.createLabel}>ПРИДУМАЙТЕ НАЗВАНИЕ</div>
                <input className={createStyles.createInput} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div className={createStyles.createField}>
                <div className={createStyles.createLabel}>ПРИДУМАЙТЕ ОПИСАНИЕ</div>
                <textarea className={createStyles.createTextarea} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <button type="button" className={createStyles.createConfirm} onClick={createEmptyRoute} disabled={creating}>
              {creating ? "СОЗДАНИЕ..." : "СОЗДАТЬ НОВЫЙ МАРШРУТ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SuccessToast message={successMsg} />
    </main>
  );
}
