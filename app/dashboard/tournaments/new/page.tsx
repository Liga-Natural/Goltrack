import { createTournament } from "@/lib/actions";

export default function NewTournamentPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">New tournament</h1>
      <p className="text-white/50 text-sm mb-6">You can generate the schedule after teams register.</p>

      <form action={createTournament} className="card p-6 space-y-4">
        <div>
          <label className="label">Tournament name</label>
          <input className="input" name="name" required placeholder="Coastal Cup Youth Invitational" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Sport</label>
            <select className="input" name="sport" defaultValue="Soccer">
              <option>Soccer</option>
              <option>Futsal</option>
            </select>
          </div>
          <div>
            <label className="label">Format</label>
            <select className="input" name="format" defaultValue="GROUPS_KNOCKOUT">
              <option value="GROUPS_KNOCKOUT">Groups + knockout</option>
              <option value="ROUND_ROBIN">Round robin only</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Location</label>
          <input className="input" name="location" placeholder="Magic City Fields, Miami FL" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Start date</label>
            <input className="input" type="date" name="startDate" required />
          </div>
          <div>
            <label className="label">End date</label>
            <input className="input" type="date" name="endDate" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Fee (USD/team)</label>
            <input className="input" type="number" min={0} step="0.01" name="fee" defaultValue={150} />
          </div>
          <div>
            <label className="label"># Fields</label>
            <input className="input" type="number" min={1} name="fieldsCount" defaultValue={2} />
          </div>
          <div>
            <label className="label"># Groups</label>
            <input className="input" type="number" min={1} name="groupsCount" defaultValue={2} />
          </div>
        </div>

        <div>
          <label className="label">Teams advancing per group</label>
          <input className="input" type="number" min={1} name="advancePerGroup" defaultValue={2} />
        </div>

        <button className="btn-primary w-full">Create tournament</button>
      </form>
    </div>
  );
}
