import type { Article } from '../types';

export type ReaderContentProps = {
  article: Article;
  initialProgress?: number;
  onProgress?: (progress: number) => void;
};
