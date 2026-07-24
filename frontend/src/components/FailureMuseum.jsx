import { useState } from "react";
import { failureMuseum } from "../lib/api";
import { toast } from "sonner";
import { Skull, GitBranch, Loader2 } from "lucide-react";

export default function FailureMuseum({ projectId }) {
  const [items, setItems] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await failureMuseum(projectId);
      setItems(r.projects || []);
      setSource(r.source || null);
    } catch { toast.error("Museum failed to load"); }
    finally { setLoading(false); }
  };

  return (
    <div data-testid="failure-museum" className="border border-[#27272a] p-6 scanlines">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ff3b30] flex items-center gap-2">
            <Skull size={12} /> Failure Museum
          </div>
          <div className="font-heading font-bold text-xl mt-1">Learn from the graveyard.</div>
        </div>
        <button
          data-testid="load-museum-btn"
          onClick={load}
          disabled={loading}
          className="px-4 py-2 border border-[#ff3b30] text-[#ff3b30] font-mono text-xs uppercase tracking-widest hover:bg-[#ff3b30] hover:text-black transition-colors disabled:opacity-50"
        >
          {loading ? "Digging…" : items ? "Reload" : "Autopsy Repos"}
        </button>
      </div>
      {items && (
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest">
          {source === "real" ? (
            <span className="text-[#00ff41]">✓ real github data · autopsies by AI</span>
          ) : (
            <span className="text-[#ffb000]">⚠ synthetic — configure github pat in settings for real repos</span>
          )}
        </div>
      )}
      {items && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((r, i) => (
            <div key={r.url || r.name || `dead-${i}`} data-testid={`museum-card-${i}`} className="border border-[#27272a] bg-[#0a0a0a] p-4 hover:bg-[#121212] transition-colors">
              <div className="flex items-center gap-2">
                <GitBranch size={14} className="text-[#a1a1aa]" />
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="font-mono text-sm text-white hover:text-[#00f0ff]">{r.name}</a>
                ) : (
                  <span className="font-mono text-sm text-white">{r.name}</span>
                )}
                <span className="ml-auto font-mono text-[10px] uppercase text-[#ffb000]">★ {r.stars}</span>
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
                Last commit · {r.last_commit}
              </div>
              <div className="mt-3 font-mono text-[11px] text-[#ff3b30]">Cause of death: {r.cause_of_death}</div>
              <div className="mt-2 font-mono text-[11px] text-[#a1a1aa] leading-relaxed">› {r.autopsy}</div>
            </div>
          ))}
        </div>
      )}
      {!items && !loading && (
        <div className="text-[#a1a1aa] font-mono text-sm">Uncover 4 abandoned attempts at similar ideas and diagnose why they died.</div>
      )}
    </div>
  );
}
