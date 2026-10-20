"use client";

import { useEffect, useRef } from "react";
import { Spinner } from "./spinner";
import { Button } from "./button";

/** Calls `onLoadMore` when the sentinel scrolls into view. Also renders a manual button for keyboard users. */
export function InfiniteList({
  children, hasMore, loading, onLoadMore, endMessage = "You're all caught up 🐾",
}: {
  children: React.ReactNode;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  endMessage?: React.ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const cb = useRef(onLoadMore);
  cb.current = onLoadMore;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) cb.current();
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  return (
    <>
      {children}
      <div ref={sentinel} className="flex justify-center py-6">
        {loading ? (
          <Spinner label="Loading more" />
        ) : hasMore ? (
          <Button variant="outline" size="sm" onClick={onLoadMore}>Load more</Button>
        ) : (
          <p className="text-sm text-muted">{endMessage}</p>
        )}
      </div>
    </>
  );
}

/** Simple numbered pagination for admin tables. */
export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 py-4 text-sm font-bold">
      {page > 1 && <a className="rounded-full px-3 py-1.5 hover:bg-surface-2" href={hrefFor(page - 1)}>Previous</a>}
      <span className="text-muted">Page {page} of {pageCount}</span>
      {page < pageCount && <a className="rounded-full px-3 py-1.5 hover:bg-surface-2" href={hrefFor(page + 1)}>Next</a>}
    </nav>
  );
}
