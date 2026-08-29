import { NewTournamentForm } from "@/components/NewTournamentForm";

export default function NewTournamentPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-extrabold mb-1">New tournament</h1>
      <p className="text-black/50 text-sm mb-6">You can generate the schedule after teams register.</p>
      <NewTournamentForm />
    </div>
  );
}
