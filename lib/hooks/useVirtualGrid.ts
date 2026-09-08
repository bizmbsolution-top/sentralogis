/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/hooks/useVirtualGrid.ts
 * Description: High-performance DOM virtualization hook for 100 to 10,000+ row grids
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface UseVirtualGridOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
}

export function useVirtualGrid({ itemCount, itemHeight, overscan = 8 }: UseVirtualGridOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Handle scroll events
  const onScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Update container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      setContainerHeight(el.clientHeight || 600);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute virtualization slice
  const { startIndex, endIndex, offsetY, totalHeight } = useMemo(() => {
    const total = itemCount * itemHeight;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const end = Math.min(itemCount, start + visibleCount);
    const offset = start * itemHeight;

    return {
      startIndex: start,
      endIndex: end,
      offsetY: offset,
      totalHeight: total
    };
  }, [itemCount, itemHeight, scrollTop, containerHeight, overscan]);

  // Scroll to index helper
  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current) {
        const targetTop = index * itemHeight;
        containerRef.current.scrollTop = targetTop;
      }
    },
    [itemHeight]
  );

  return {
    containerRef,
    onScroll,
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    scrollToIndex,
    scrollTop,
    containerHeight
  };
}
