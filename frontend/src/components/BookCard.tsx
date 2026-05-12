import type { Book } from '../types.ts';

interface Props {
  book: Book;
  onClick: () => void;
}

export default function BookCard({ book, onClick }: Props) {
  return (
    <div
      className="group cursor-pointer flex flex-col items-center transition-transform duration-300 hover:-translate-y-2 hover:-rotate-1"
      onClick={onClick}
    >
      {/* Cover */}
      <div className="w-[148px] h-[200px] rounded-[3px_8px_8px_3px] overflow-hidden relative bg-cream
                      shadow-[4px_6px_20px_rgba(44,26,14,.3)] group-hover:shadow-[8px_14px_35px_rgba(44,26,14,.42)]
                      transition-shadow duration-300">
        {/* Spine */}
        <div className="absolute left-0 top-0 bottom-0 w-[13px] bg-gradient-to-r from-parchment-deep to-parchment border-r border-accent-gold z-[1]" />
        {/* Inner */}
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-parchment-dark via-parchment to-[#e0c898] p-4 text-center">
          <div className="text-[2.8rem] mb-1.5">{book.emoji}</div>
          <div className="font-playfair text-[.88rem] text-ink leading-snug">{book.title}</div>
        </div>
      </div>

      <div className="font-playfair text-[.88rem] text-ink text-center mt-2.5 max-w-[148px]">{book.title}</div>
      <div className="italic text-[.73rem] text-ink-muted mt-[.15rem] text-center">Ages {book.age}</div>
    </div>
  );
}
