"use client";

import { useEffect, useState } from "react";

const DEFAULT_PAGE_SIZE = 32;

export function getResponsivePageSize(width: number): number {
  if (width <= 480) return 8;
  if (width <= 700) return 16;
  if (width <= 1024) return 25;
  if (width <= 1440) return 32;
  return 28;
}

export function useResponsivePageSize(): number {
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
    return getResponsivePageSize(window.innerWidth);
  });

  useEffect(() => {
    const updatePageSize = () => {
      const nextPageSize = getResponsivePageSize(window.innerWidth);
      setPageSize((currentPageSize) =>
        currentPageSize === nextPageSize ? currentPageSize : nextPageSize,
      );
    };

    updatePageSize();
    window.addEventListener("resize", updatePageSize);

    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  return pageSize;
}
