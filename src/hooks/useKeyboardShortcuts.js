import { useEffect } from 'react';

/**
 * Standard YouTube keyboard shortcuts hook.
 */
export function useKeyboardShortcuts({
  onTogglePlay,
  onSeekBackward,
  onSeekForward,
  onToggleMute,
  onToggleFullscreen,
  onToggleTheater,
  onVolumeUp,
  onVolumeDown,
  onNext,
  onPrev,
  enabled = true
}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when user is typing in form inputs
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable;
      if (isInput) return;

      const key = e.key;

      if (key === 'k' || key === ' ') {
        e.preventDefault();
        onTogglePlay?.();
      } else if (key === 'j') {
        e.preventDefault();
        onSeekBackward?.(10);
      } else if (key === 'l') {
        e.preventDefault();
        onSeekForward?.(10);
      } else if (key === 'm') {
        e.preventDefault();
        onToggleMute?.();
      } else if (key === 'f') {
        e.preventDefault();
        onToggleFullscreen?.();
      } else if (key === 't') {
        e.preventDefault();
        onToggleTheater?.();
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        if (onPrev) onPrev();
        else if (onVolumeUp) onVolumeUp();
      } else if (key === 'ArrowDown') {
        e.preventDefault();
        if (onNext) onNext();
        else if (onVolumeDown) onVolumeDown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    onTogglePlay,
    onSeekBackward,
    onSeekForward,
    onToggleMute,
    onToggleFullscreen,
    onToggleTheater,
    onVolumeUp,
    onVolumeDown,
    onNext,
    onPrev
  ]);
}

export default useKeyboardShortcuts;
