import { useState, useEffect, useCallback } from 'react';
import type { Book } from '../types.ts';

interface Props {
  book: Book;
  onClose: () => void;
}

export default function Reader({ book, onClose }: Props) {
  const [spread, setSpread] = useState(0);
  const [animDir, setAnimDir] = useState<1 | -1 | null>(null);

  const turnPage = useCallback((d: 1 | -1) => {
    const next = spread + d;
    if (next < 0 || next >= book.pages.length) return;
    setAnimDir(d);
    setSpread(next);
    setTimeout(() => setAnimDir(null), 600);
  }, [spread, book.pages.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') turnPage(1);
      if (e.key === 'ArrowLeft')  turnPage(-1);
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [turnPage, onClose]);

  const page = book.pages[spread] ?? {};

  return (
    <div className="fixed inset-0 z-[300] bg-[#110b05] flex items-center justify-center flex-col">

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 px-8 py-[.9rem] flex items-center justify-between bg-gradient-to-b from-[rgba(17,11,5,.95)] to-transparent z-[10]">
        <span className="font-cinzel text-parchment text-[.95rem] tracking-[.1em] opacity-80">
          {book.title}
        </span>
        <button
          className="bg-transparent border border-parchment/30 text-parchment cursor-pointer font-lora px-4 py-1.5 text-[.82rem] rounded-sm transition-all duration-200 hover:bg-parchment/15"
          onClick={onClose}
        >
          ✕ Close Book
        </button>
      </div>

      {/* Spread */}
      <div className="flex w-[88vw] max-w-[1150px] h-[74vh] relative">

        {/* Left page */}
        <div className={`flex-1 bg-cream relative overflow-hidden flex flex-col rounded-tl-[4px] rounded-bl-[4px] border-r border-parchment-deep [box-shadow:-6px_0_35px_rgba(0,0,0,.55),inset_-3px_0_8px_rgba(0,0,0,.1)]${animDir === 1 ? ' tL' : animDir === -1 ? ' tR' : ''}`}>
          <div className="flex-1 overflow-hidden bg-page-bg flex items-center justify-center text-[5rem] relative">
            {page.leftImage
              ? <img src={page.leftImage} alt="" className="w-full h-full object-cover absolute inset-0" />
              : <span>{page.le ?? '📖'}</span>
            }
          </div>
          <div className="px-[1.4rem] pt-[1.1rem] pb-[.9rem] bg-cream border-t border-parchment-deep">
            <p className="font-lora text-[clamp(.85rem,1.3vw,1.1rem)] leading-[1.7] text-ink">{page.lt}</p>
            <p className="text-center italic text-[.72rem] text-ink-muted mt-1.5">{spread * 2 + 1}</p>
          </div>
        </div>

        {/* Spine */}
        <div className="w-[18px] bg-gradient-to-r from-[#1a0f05] via-[#3d2a10] to-[#1a0f05] shrink-0 z-[5]" />

        {/* Right page */}
        <div className={`flex-1 bg-cream relative overflow-hidden flex flex-col rounded-tr-[4px] rounded-br-[4px] [box-shadow:6px_0_35px_rgba(0,0,0,.55)]${animDir === -1 ? ' tL' : animDir === 1 ? ' tR' : ''}`}>
          <div className="flex-1 overflow-hidden bg-page-bg flex items-center justify-center text-[5rem] relative">
            {page.rightImage
              ? <img src={page.rightImage} alt="" className="w-full h-full object-cover absolute inset-0" />
              : <span>{page.re ?? '📖'}</span>
            }
          </div>
          <div className="px-[1.4rem] pt-[1.1rem] pb-[.9rem] bg-cream border-t border-parchment-deep">
            <p className="font-lora text-[clamp(.85rem,1.3vw,1.1rem)] leading-[1.7] text-ink">{page.rt}</p>
            <p className="text-center italic text-[.72rem] text-ink-muted mt-1.5">{spread * 2 + 2}</p>
          </div>
          <div className="pfold" />
        </div>

      </div>

      {/* Navigation */}
      <button
        className="absolute top-1/2 -translate-y-1/2 left-8 bg-parchment/[.08] border border-parchment/25 text-parchment w-[46px] h-[76px] cursor-pointer text-[1.4rem] rounded z-[20] flex items-center justify-center transition-all duration-200 hover:bg-parchment/[.18] disabled:opacity-[.18] disabled:cursor-not-allowed"
        disabled={spread <= 0}
        onClick={() => turnPage(-1)}
      >←</button>
      <button
        className="absolute top-1/2 -translate-y-1/2 right-8 bg-parchment/[.08] border border-parchment/25 text-parchment w-[46px] h-[76px] cursor-pointer text-[1.4rem] rounded z-[20] flex items-center justify-center transition-all duration-200 hover:bg-parchment/[.18] disabled:opacity-[.18] disabled:cursor-not-allowed"
        disabled={spread >= book.pages.length - 1}
        onClick={() => turnPage(1)}
      >→</button>

      <div className="absolute bottom-[1.4rem] left-1/2 -translate-x-1/2 italic text-parchment/45 text-[.82rem] tracking-[.05em] whitespace-nowrap">
        Pages {spread * 2 + 1}–{spread * 2 + 2} of {book.pages.length * 2}
      </div>

    </div>
  );
}
