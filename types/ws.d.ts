// SENTRALOGIS — Ambient type declaration for 'ws' package
//
// The ws package (v8.x) ships no TypeScript declarations.
// This narrow declaration provides the default-export type using the
// existing DOM WebSocket constructor type (available via tsconfig lib: ["dom"]).
//
// Usage in scripts/run-d-repair.ts: import ws from 'ws'
//   → transport: ws as any
declare module 'ws' {
  const ws: typeof WebSocket;
  export default ws;
}
