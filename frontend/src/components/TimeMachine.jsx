import { useState } from "react";
import { timeMachine } from "../lib/api";
import { toast } from "sonner";
import { Clock, Loader2, Zap } from "lucide-react";

export default function TimeMachine({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(await timeMachine(projectId)); }
    catch { toast.error("Time Machine failed"); }
    finally { setLoading(false); }
  };

  return (
    <div data-testid="time-machine" className="border border-[#27272a] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00f0ff] flex items-center gap-2">
            <Clock size={12} /> Time Machine
          </div>
          <div className="font-heading font-bold text-xl mt-1">5 years back. 2 years ahead.</div>
        </div>
        <button
          onClick={load}
          data-testid="load-time-btn"
          disabled={loading}
          className="px-4 py-2 border border-[#00f0ff] text-[#00f0ff] font-mono text-xs uppercase tracking-widest hover:bg-[#00f0ff] hover:text-black transition-colors disabled:opacity-50"
        >
          {loading ? <><Loader2 size={12} className="animate-spin inline mr-1" />Traveling…</> : data ? "Reload" : "Fire up the DeLorean"}
        </button>
      </div>

      {data && (
        <>
          <div className="font-mono text-[11px] text-[#ffb000] mb-4 flex items-center gap-2">
            <Zap size={12} /> Trend: {data.trend}
          </div>
          <div className="relative border-l-2 border-[#27272a] pl-6 space-y-4">
            {(data.past || []).map((p, i) => (
              <div key={`p-${i}`} data-testid={`past-${i}`} className="relative">
                <div className="absolute -left-[29px] top-1 w-3 h-3 bg-[#3f3f46] border border-[#27272a]"></div>
                <div className="font-mono text-[10px] uppercase text-[#a1a1aa]">{p.year}</div>
                <div className="font-mono text-sm text-white">{p.event}</div>
              </div>
            ))}
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-4 h-4 bg-[#00f0ff]"></div>
              <div className="font-mono text-[10px] uppercase text-[#00f0ff] glow-cyan">▸ NOW</div>
            </div>
            {(data.future || []).map((f, i) => (
              <div key={`f-${i}`} data-testid={`future-${i}`} className="relative">
                <div className="absolute -left-[29px] top-1 w-3 h-3 bg-[#00f0ff]"></div>
                <div className="font-mono text-[10px] uppercase text-[#00f0ff]">{f.year}</div>
                <div className="font-mono text-sm text-white glow-cyan">{f.prediction}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {!data && !loading && (
        <div className="text-[#a1a1aa] font-mono text-sm">Trace the tech landscape past → future to kill the &quot;already done&quot; objection.</div>
      )}
    </div>
  );
}
