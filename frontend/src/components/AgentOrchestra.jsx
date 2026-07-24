import { Cpu, Layers, ShieldCheck, Code2, Quote, Gavel, Loader2, Check } from "lucide-react";

export const AGENTS = [
  { id: "research",  label: "Research",  icon: Cpu,        color: "#00f0ff" },
  { id: "architect", label: "Architect", icon: Layers,     color: "#ffb000" },
  { id: "critic",    label: "Critic",    icon: ShieldCheck,color: "#ff3b30" },
  { id: "code",      label: "Code",      icon: Code2,      color: "#00ff41" },
  { id: "citation",  label: "Citation",  icon: Quote,      color: "#a1a1aa" },
  { id: "judge",     label: "Judge",     icon: Gavel,      color: "#00f0ff" },
];

export default function AgentOrchestra({ statuses, outputs }) {
  return (
    <div data-testid="agent-orchestra" className="grid grid-cols-1 gap-3">
      {AGENTS.map((a) => {
        const state = statuses[a.id] || "idle"; // idle | running | done | error
        const output = outputs[a.id] || "";
        const isRunning = state === "running";
        const isDone = state === "done";
        return (
          <div
            key={a.id}
            data-testid={`agent-card-${a.id}`}
            className={`border p-3 bg-[#0a0a0a] transition-colors ${
              isRunning ? "border-[#00f0ff] pulse-cyan" :
              isDone ? "border-[#00ff41]/40" :
              "border-[#27272a]"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 border border-[#27272a] flex items-center justify-center" style={{ color: a.color }}>
                <a.icon size={14} />
              </div>
              <div className="font-heading font-semibold text-sm flex-1">{a.label} Agent</div>
              <div className="font-mono text-[10px] uppercase tracking-widest">
                {isRunning && (
                  <span className="flex items-center gap-1 text-[#00f0ff]">
                    <Loader2 size={10} className="animate-spin" /> thinking
                  </span>
                )}
                {isDone && (
                  <span className="flex items-center gap-1 text-[#00ff41]">
                    <Check size={10} /> done
                  </span>
                )}
                {state === "idle" && <span className="text-[#3f3f46]">idle</span>}
                {state === "error" && <span className="text-[#ff3b30]">error</span>}
              </div>
            </div>
            {output && (
              <div className={`mt-2 font-mono text-[11px] text-[#a1a1aa] whitespace-pre-wrap ${isRunning ? "max-h-40 overflow-auto" : "max-h-24 overflow-hidden line-clamp-4"}`}>
                {isRunning ? (
                  <>{output}<span className="text-[#00f0ff] animate-pulse">▌</span></>
                ) : (
                  <>{output.slice(0, 240)}{output.length > 240 ? "…" : ""}</>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
