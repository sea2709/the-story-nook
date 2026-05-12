import { useState } from 'react';
import Library from './components/Library.tsx';
import Reader from './components/Reader.tsx';
import type { Book } from './types.ts';

export default function App() {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  if (currentBook) {
    return <Reader book={currentBook} onClose={() => setCurrentBook(null)} />;
  }
  return <Library onOpenBook={setCurrentBook} />;
}
