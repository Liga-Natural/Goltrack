import { permanentRedirect } from "next/navigation";

// Retired. This route used to create a team row the instant a form was
// submitted, which bypassed both the manager account gate and the
// organizer's acceptance step — the two things the application engine
// exists to enforce. Deleting it outright would 404 every registration link
// already shared for a live tournament, so it redirects instead.
//
// permanentRedirect (308) rather than redirect (307): the move is not
// temporary, and a 308 lets crawlers and any saved bookmark update
// themselves. The nested /register/pay route is untouched — it is still the
// post-payment landing page and is reached by its own link.
export default function RetiredRegisterPage({ params }: { params: { slug: string } }) {
  permanentRedirect(`/t/${params.slug}/apply`);
}
