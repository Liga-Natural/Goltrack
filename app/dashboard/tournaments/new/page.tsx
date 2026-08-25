import { NewTournamentForm } from "@/components/NewTournamentForm";

export default function NewTournamentPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">New tournament</h1>
      <p className="text-white/50 text-sm mb-6">You can generate the schedule after teams register.</p>
      <NewTournamentForm />
    </div>
  );
}
