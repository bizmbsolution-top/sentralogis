import { Page } from './Page';

export class PageResponse<T> implements Page<T> {
  constructor(
    public content: T[],
    public totalElements: number,
    public totalPages: number,
    public number: number,
    public size: number
  ) {}
}
