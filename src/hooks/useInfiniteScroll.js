import { useEffect, useRef, useCallback } from 'react';

/**
 * Automated IntersectionObserver hook for seamless infinite pagination.
 */
export function useInfiniteScroll({
  onIntersect,
  hasMore = true,
  isLoading = false,
  threshold = 0.1,
  rootMargin = '200px'
}) {
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const handleObserver = useCallback(
    (entries) => {
      const [target] = entries;
      if (target && target.isIntersecting && hasMore && !isLoading) {
        onIntersect();
      }
    },
    [onIntersect, hasMore, isLoading]
  );

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (typeof IntersectionObserver !== 'undefined') {
      observerRef.current = new IntersectionObserver(handleObserver, {
        root: null,
        rootMargin,
        threshold
      });

      observerRef.current.observe(element);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, rootMargin, threshold]);

  return sentinelRef;
}

export default useInfiniteScroll;
