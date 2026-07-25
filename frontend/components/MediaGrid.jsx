"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const GRID_H = 320; // px – shared grid height for multi-image layouts

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ media, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const touchStartX = useRef(null);

  const go = useCallback((dir) => {
    setIdx(i => {
      const next = i + dir;
      if (next < 0) return media.length - 1;
      if (next >= media.length) return 0;
      return next;
    });
  }, [media.length]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [go, onClose]);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) go(dx > 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const cur = media[idx];

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/96 flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
        <span className="text-white/40 text-sm">{idx + 1} / {media.length}</span>
        <button onClick={onClose} className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Main viewer */}
      <div className="flex-1 relative flex items-center justify-center px-14 min-h-0">
        {media.length > 1 && (
          <button onClick={() => go(-1)} className="absolute left-3 text-white bg-white/10 hover:bg-white/25 rounded-full p-2.5 transition-colors z-10">
            <ChevronLeft size={28} />
          </button>
        )}

        <div className="w-full h-full flex items-center justify-center">
          {cur.type === 'VIDEO' ? (
            <video
              key={cur.url}
              src={cur.url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-xl outline-none"
              style={{ maxHeight: 'calc(100vh - 180px)' }}
            />
          ) : (
            <img
              key={cur.url}
              src={cur.url}
              alt=""
              className="max-w-full object-contain rounded-xl select-none"
              style={{ maxHeight: 'calc(100vh - 180px)' }}
            />
          )}
        </div>

        {media.length > 1 && (
          <button onClick={() => go(1)} className="absolute right-3 text-white bg-white/10 hover:bg-white/25 rounded-full p-2.5 transition-colors z-10">
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div className="flex-shrink-0 flex justify-center gap-1.5 px-4 py-3 overflow-x-auto">
          {media.map((m, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-white scale-110' : 'border-transparent opacity-40 hover:opacity-70'}`}
            >
              {m.type === 'IMAGE'
                ? <img src={m.url} className="w-full h-full object-cover" alt="" />
                : <video src={m.url} className="w-full h-full object-cover" />
              }
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── One cell in a multi-image grid ──────────────────────────────────────────
function Cell({ item, onOpen, overlayCount }) {
  return (
    <div
      className="relative w-full h-full cursor-pointer group overflow-hidden bg-neutral-200"
      onClick={onOpen}
    >
      {item.type === 'IMAGE' ? (
        <img
          src={item.url}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <>
          <video src={item.url} muted preload="metadata" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/35 transition-colors">
            <div className="w-12 h-12 rounded-full bg-black/55 flex items-center justify-center shadow-lg">
              <Play size={18} className="text-white fill-white ml-0.5" />
            </div>
          </div>
        </>
      )}

      {/* +N overlay */}
      {overlayCount != null && overlayCount > 0 && (
        <div className="absolute inset-0 bg-black/58 flex items-center justify-center">
          <span className="text-white font-bold text-3xl tracking-tight drop-shadow-lg">+{overlayCount}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main MediaGrid ───────────────────────────────────────────────────────────
export default function MediaGrid({ media }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  if (!media || media.length === 0) return null;

  const n = media.length;
  const open = (i) => (e) => { e?.stopPropagation(); setLightboxIdx(i); };

  let grid;

  // 1 item → natural ratio (object-contain, no crop)
  if (n === 1) {
    const item = media[0];
    grid = (
      <div className="rounded-xl overflow-hidden bg-neutral-100 mt-3" onClick={e => e.stopPropagation()}>
        {item.type === 'IMAGE' ? (
          <img
            src={item.url}
            alt=""
            loading="lazy"
            onClick={open(0)}
            className="w-full object-contain rounded-xl cursor-pointer hover:brightness-95 transition-all"
            style={{ maxHeight: 600, display: 'block' }}
          />
        ) : (
          <div className="relative cursor-pointer group rounded-xl overflow-hidden" onClick={open(0)}>
            <video
              src={item.url}
              muted
              preload="metadata"
              className="w-full block"
              style={{ maxHeight: 520 }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
              <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center shadow-2xl">
                <Play size={26} className="text-white fill-white ml-1" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2 items → side by side equal columns
  else if (n === 2) {
    grid = (
      <div
        className="mt-3 rounded-xl overflow-hidden grid grid-cols-2 gap-0.5"
        style={{ height: GRID_H }}
        onClick={e => e.stopPropagation()}
      >
        <Cell item={media[0]} onOpen={open(0)} />
        <Cell item={media[1]} onOpen={open(1)} />
      </div>
    );
  }

  // 3 items → large left + 2 stacked right
  else if (n === 3) {
    grid = (
      <div
        className="mt-3 rounded-xl overflow-hidden grid grid-cols-2 gap-0.5"
        style={{ height: GRID_H }}
        onClick={e => e.stopPropagation()}
      >
        <Cell item={media[0]} onOpen={open(0)} />
        <div className="flex flex-col gap-0.5" style={{ height: GRID_H }}>
          <div className="flex-1 overflow-hidden"><Cell item={media[1]} onOpen={open(1)} /></div>
          <div className="flex-1 overflow-hidden"><Cell item={media[2]} onOpen={open(2)} /></div>
        </div>
      </div>
    );
  }

  // 4 items → 2×2 grid
  else if (n === 4) {
    grid = (
      <div
        className="mt-3 rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5"
        style={{ height: GRID_H }}
        onClick={e => e.stopPropagation()}
      >
        <Cell item={media[0]} onOpen={open(0)} />
        <Cell item={media[1]} onOpen={open(1)} />
        <Cell item={media[2]} onOpen={open(2)} />
        <Cell item={media[3]} onOpen={open(3)} />
      </div>
    );
  }

  // 5+ items → 2-col: left 2 stacked, right 3 stacked (last has +N overlay)
  else {
    grid = (
      <div
        className="mt-3 rounded-xl overflow-hidden grid grid-cols-2 gap-0.5"
        style={{ height: GRID_H }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col gap-0.5" style={{ height: GRID_H }}>
          <div className="flex-1 overflow-hidden"><Cell item={media[0]} onOpen={open(0)} /></div>
          <div className="flex-1 overflow-hidden"><Cell item={media[1]} onOpen={open(1)} /></div>
        </div>
        <div className="flex flex-col gap-0.5" style={{ height: GRID_H }}>
          <div className="flex-1 overflow-hidden"><Cell item={media[2]} onOpen={open(2)} /></div>
          <div className="flex-1 overflow-hidden"><Cell item={media[3]} onOpen={open(3)} /></div>
          <div className="flex-1 overflow-hidden"><Cell item={media[4]} onOpen={open(4)} overlayCount={n - 5} /></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {grid}
      {lightboxIdx !== null && (
        <Lightbox media={media} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}
