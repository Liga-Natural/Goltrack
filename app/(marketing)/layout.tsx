// The public half of the site: the presentation pages, the spectator
// tournament pages, the sign-up and claim links people follow from an email,
// and the public player profile and passport card.
//
// It is deliberately a pass-through. Every page in here already brings its
// own header — the marketing nav, a tournament's own masthead, the bare
// wordmark on a claim link — and wrapping a second shell around them would
// double the chrome rather than unify it. The group earns its keep by being
// the boundary middleware.ts reads: nothing under here requires a session,
// and that is now a property of the tree rather than a habit.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
