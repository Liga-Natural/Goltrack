// Group letters, matching what generateGroupStage produces (A, B, C ...).
//
// Lives here rather than in lib/actions.ts because that file carries
// "use server": every export in a server-actions module must be an async
// function, so a plain synchronous helper there fails the build — and it
// fails at webpack time, not typecheck time, which is why tsc passed on it.
export function groupLetters(count: number): string[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => String.fromCharCode(65 + i));
}
