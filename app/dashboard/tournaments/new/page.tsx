import { NewTournamentForm } from "@/components/NewTournamentForm";

export default function NewTournamentPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">New tournament</h1>
      <p className="text-ink2 text-sm font-medium mb-6">You can generate the schedule after teams register.</p>
      <NewTournamentForm />
    </div>
  );
}
