export interface ProjectionFactory<TProjection, TRow> {
  createFromRow(row: TRow): TProjection;
}
