import { useRef, useState } from 'react'
import {
  DEFAULT_FONT_SCALE,
  readFontScale,
  stepFontScale,
  writeFontScale,
  type FontScale,
} from '../lib/fontScale'

const LONG_PRESS_MS = 550

export function FontSizeControl() {
  const [scale, setScale] = useState<FontScale>(() => readFontScale())
  const ignoreClick = useRef(false)
  const timer = useRef<number | null>(null)

  function commit(next: FontScale) {
    writeFontScale(next)
    setScale(next)
  }

  function clearTimer() {
    if (timer.current != null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  function endPress() {
    clearTimer()
    if (!ignoreClick.current) return
    window.setTimeout(() => {
      ignoreClick.current = false
    }, 0)
  }

  function startLongPress() {
    ignoreClick.current = false
    clearTimer()
    timer.current = window.setTimeout(() => {
      ignoreClick.current = true
      commit(DEFAULT_FONT_SCALE)
    }, LONG_PRESS_MS)
  }

  function change(direction: -1 | 1) {
    clearTimer()
    if (ignoreClick.current) {
      ignoreClick.current = false
      return
    }
    commit(stepFontScale(scale, direction))
  }

  const atMin = scale === 0.9
  const atMax = scale === 1.3

  return (
    <div
      className="flex h-10 items-center rounded-full border border-outline-variant"
      role="group"
      aria-label="حجم الخط"
    >
      <button
        type="button"
        aria-label="تصغير الخط"
        title="تصغير الخط. ضغطة مطولة ترجع للحجم العادي"
        disabled={atMin}
        className="flex h-10 w-9 items-center justify-center rounded-full text-sm font-bold text-on-surface hover:bg-surface-container disabled:opacity-40"
        onPointerDown={startLongPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onClick={() => change(-1)}
      >
        أ−
      </button>
      {scale !== DEFAULT_FONT_SCALE && (
        <button
          type="button"
          aria-label="الحجم العادي"
          title="الحجم العادي"
          className="px-1 text-xs font-bold text-primary hover:underline"
          onClick={() => commit(DEFAULT_FONT_SCALE)}
        >
          عادي
        </button>
      )}
      <button
        type="button"
        aria-label="تكبير الخط"
        title="تكبير الخط. ضغطة مطولة ترجع للحجم العادي"
        disabled={atMax}
        className="flex h-10 w-9 items-center justify-center rounded-full text-sm font-bold text-on-surface hover:bg-surface-container disabled:opacity-40"
        onPointerDown={startLongPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onClick={() => change(1)}
      >
        أ+
      </button>
    </div>
  )
}
