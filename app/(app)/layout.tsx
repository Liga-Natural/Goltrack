import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// The authenticated half: every role's console. Middleware turns away a
// visitor with no session cookie before this renders, but a cookie is not a
// session — it can be stale, forged, or belong to a deleted account — so the
// real check happens here, on the server, where the user record is actually
// loaded.
//
// Layouts render for every page in the group, which makes this the one place
// a new dashboard route cannot forget its own auth check. The pages keep
// their individual role checks (an organizer's page still refuses a player);
// this only establishes that somebody is signed in.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
