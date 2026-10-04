import { useRef, useState } from 'react';

export default function PanelResize({ side, width, maxWidth, onResize }: {
  side: 'left' | 'right'; width: number; maxWidth: number; onResize: (width: number) => void;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  function resize(value: number) { onResize(Math.max(180, Math.min(maxWidth, value))); }
  return <div className={`panel-resize ${dragging ? 'dragging' : ''}`} role="separator" aria-label={`调整${side === 'left' ? '工作区' : '目录'}宽度`}
    aria-orientation="vertical" aria-valuemin={180} aria-valuemax={Math.floor(maxWidth)} aria-valuenow={width} tabIndex={0}
    onPointerDown={(event) => {
      if (event.button !== 0) return;
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { x: event.clientX, width }; setDragging(true);
    }}
    onPointerMove={(event) => { if (drag.current) resize(drag.current.width + (event.clientX - drag.current.x) * (side === 'left' ? 1 : -1)); }}
    onPointerUp={(event) => { event.currentTarget.releasePointerCapture(event.pointerId); drag.current = null; setDragging(false); }}
    onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
    onKeyDown={(event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); resize(width + (event.key === 'ArrowRight' ? 16 : -16) * (side === 'left' ? 1 : -1));
      }
    }} />;
}
