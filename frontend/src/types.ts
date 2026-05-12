export interface PageSpread {
  leftImage?: string;
  rightImage?: string;
  le?: string;
  re?: string;
  lt?: string;
  rt?: string;
}

export interface Book {
  id: string | number;
  title: string;
  emoji?: string;
  age?: string | number;
  pages: PageSpread[];
}
