import { useState, useEffect } from 'react';
import BookCard from './BookCard.tsx';
import CornerFrame from './CornerFrame.tsx';
import type { Book } from '../types.ts';

interface Props {
  onOpenBook: (book: Book) => void;
}

export default function Library({ onOpenBook }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then((data: Book[]) => { setBooks(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <CornerFrame />
      <div className="relative z-[1] flex flex-col min-h-screen">

        <header className="text-center px-8 pt-10 pb-6 border-b-2 border-parchment-deep bg-parchment">
          <h1 className="font-cinzel text-[clamp(1.8rem,4vw,3rem)] tracking-[.06em] [text-shadow:2px_2px_0_#d4b87a]">
            The Story Nook
          </h1>
          <p className="italic text-ink-muted text-base mt-1.5">
            A treasury of picture books for little readers
          </p>
          <span className="text-accent-gold text-xs tracking-[10px] mt-2 block">✦ · ✦ · ✦</span>
        </header>

        <div className="px-16 py-12 max-w-[1400px] mx-auto w-full">
          {loading ? (
            <p className="italic text-ink-muted text-center py-16">Loading books…</p>
          ) : books.length === 0 ? (
            <div className="text-center py-20 px-8">
              <p className="italic text-ink-muted text-[1.1rem] mb-4">No books yet.</p>
              <a
                href="/admin"
                className="font-cinzel text-[.71rem] tracking-[.09em] bg-ink text-parchment border border-parchment-dark px-[18px] py-2 rounded-sm no-underline hover:bg-ink-light transition-all duration-200"
              >
                Open Admin Portal
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-10">
              {books.map(book => (
                <BookCard key={book.id} book={book} onClick={() => onOpenBook(book)} />
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
