import { useRef, useCallback } from 'react';

/**
 * Touch swipe and mouse wheel gesture listener for vertical Shorts transitions.
 */
export function useSwipeGestures({
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  wheelCooldown = 400
}) {
  const touchStartY = useRef(null);
  const touchEndY = useRef(null);
  const lastWheelTime = useRef(0);

  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    touchEndY.current = null;
  }, []);

  const onTouchMove = useCallback((e) => {
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (touchStartY.current === null || touchEndY.current === null) return;
    const distance = touchStartY.current - touchEndY.current;
    
    // Swipe Up (dragged upwards -> go to next)
    if (distance > threshold && onSwipeUp) {
      onSwipeUp();
    } 
    // Swipe Down (dragged downwards -> go to prev)
    else if (distance < -threshold && onSwipeDown) {
      onSwipeDown();
    }

    touchStartY.current = null;
    touchEndY.current = null;
  }, [threshold, onSwipeUp, onSwipeDown]);

  const onWheel = useCallback((e) => {
    const now = Date.now();
    if (now - lastWheelTime.current < wheelCooldown) return;

    if (e.deltaY > 20 && onSwipeUp) {
      lastWheelTime.current = now;
      onSwipeUp();
    } else if (e.deltaY < -20 && onSwipeDown) {
      lastWheelTime.current = now;
      onSwipeDown();
    }
  }, [wheelCooldown, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onWheel
  };
}

export default useSwipeGestures;
