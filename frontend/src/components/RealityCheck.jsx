import { useState } from "react";
import { realityCheck } from "../lib/api";
import { toast } from "sonner";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Gauge, Loader2 } from "lucide-react";

export default function RealityCheck({ projectId }) {
  const [skills, setSkills] = useState("React, Python, MongoDB");
  const [budget, setBudget] = useState(500);
  const [weeks, setWeeks] = useState(4);
  const [team, setTeam] = useState(2);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const r = await realityCheck(projectId, {
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        budget_inr: Number(budget) || 0,
        weeks_available: Number(weeks) || 1,
        team_size: Number(team) || 1,
      });
      setResult(r);
    } catch { toast.error("Reality Check failed"); }
    finally { setLoading(false); }
  };

  const chartData = result ? [
    { dim: "Skills", value: result.skills || 0 },
    { dim: "Budget", value: result.budget || 0 },
    { dim: "Time", value: result.time || 0 },
    { dim: "Team", value: result.team || 0 },
    { dim: "Scope", value: result.scope || 0 },
  ] : [];

  return (
    <div data-testid="reality-check" className="border border-[#27272a] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00ff41] flex items-center gap-2">
            <Gauge size={12} /> Reality Check Score™
          </div>
          <div className="font-heading font-bold text-xl mt-1">Feasibility scored for a student, not a unicorn.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa] mb-1">Your skills (comma-separated)</div>
            <input
              data-testid="skills-input"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#27272a] focus:border-[#00f0ff] outline-none px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa] mb-1">Budget (₹)</div>
            <input
              data-testid="budget-input"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#27272a] focus:border-[#00f0ff] outline-none px-3 py-2 font-mono text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa] mb-1">Weeks available</div>
              <input
                data-testid="weeks-input"
                type="number"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#27272a] focus:border-[#00f0ff] outline-none px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa] mb-1">Team size</div>
              <input
                data-testid="team-input"
                type="number"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#27272a] focus:border-[#00f0ff] outline-none px-3 py-2 font-mono text-sm"
              />
            </label>
          </div>
          <button
            data-testid="run-reality-btn"
            onClick={run}
            disabled={loading}
            className="w-full px-4 py-2 bg-[#00ff41] text-black font-mono text-xs uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={12} className="animate-spin" /> Calculating…</> : "Compute Reality Score"}
          </button>
        </div>

        <div className="min-h-[280px] flex items-center justify-center border border-[#27272a] bg-[#0a0a0a]">
          {result ? (
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "JetBrains Mono" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#3f3f46", fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#00f0ff" fill="#00f0ff" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-[#a1a1aa] font-mono text-xs uppercase tracking-widest">[ awaiting inputs ]</div>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[#27272a] p-4 bg-[#0a0a0a]">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">Overall</div>
            <div className="font-heading font-black text-5xl text-[#00f0ff] glow-cyan mt-2">{result.overall}<span className="text-[#3f3f46] text-2xl">/100</span></div>
          </div>
          <div className="border border-[#27272a] p-4 bg-[#0a0a0a]">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#ffb000]">Missing skills</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(result.missing_skills || []).map((s) => (
                <span key={`missing-${s}`} className="font-mono text-[10px] px-2 py-1 border border-[#ffb000] text-[#ffb000]">{s}</span>
              ))}
              {(!result.missing_skills || result.missing_skills.length === 0) && (
                <span className="font-mono text-[10px] text-[#a1a1aa]">You have everything you need.</span>
              )}
            </div>
          </div>
          <div className="border border-[#27272a] p-4 bg-[#0a0a0a]">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#00ff41]">Teammates needed</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(result.teammates_needed || []).map((s) => (
                <span key={`team-${s}`} className="font-mono text-[10px] px-2 py-1 border border-[#00ff41] text-[#00ff41]">{s}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {result?.curriculum?.length > 0 && (
        <div className="mt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#a1a1aa] mb-2">3-Week Skill Gap Curriculum</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.curriculum.map((w, i) => (
              <div key={`week-${w.week ?? i}`} data-testid={`curr-${i}`} className="border border-[#27272a] p-3 bg-[#0a0a0a]">
                <div className="font-mono text-[10px] uppercase text-[#00f0ff]">Week {w.week}</div>
                <div className="font-heading font-semibold text-sm mt-1">{w.focus}</div>
                <div className="font-mono text-[11px] text-[#a1a1aa] mt-1">› {w.resource}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
