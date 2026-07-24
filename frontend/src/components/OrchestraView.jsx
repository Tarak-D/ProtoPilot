import AgentOrchestra from "./AgentOrchestra";
import KnowledgeGraph from "./KnowledgeGraph";
import CitationsList from "./CitationsList";

export default function OrchestraView({ statuses, outputs, log, running, logEndRef, graph, citations }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Agent cards */}
      <div className="lg:col-span-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#a1a1aa] mb-3">Agent Orchestra</div>
        <AgentOrchestra statuses={statuses} outputs={outputs} />
      </div>
      {/* Center: Graph + Log */}
      <div className="lg:col-span-6 flex flex-col gap-4">
        <div className="border border-[#27272a] bg-[#050505] h-[420px] relative">
          <div className="absolute top-2 left-3 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa] z-10">
            Knowledge Graph
          </div>
          <KnowledgeGraph data={graph} />
        </div>
        <div className="border border-[#27272a] bg-black h-[220px] overflow-auto p-3 font-mono text-xs">
          <div className="text-[#a1a1aa] uppercase tracking-widest text-[10px] mb-2">// live log</div>
          {log.map((l) => (
            <div key={l.id} className="text-[#00ff41]">
              <span className="text-[#3f3f46]">[{l.t}]</span> {l.line}
            </div>
          ))}
          {running && <div className="text-[#00f0ff] caret">running</div>}
          <div ref={logEndRef} />
        </div>
      </div>
      {/* Right: Citations */}
      <div className="lg:col-span-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#a1a1aa] mb-3">Citations</div>
        <CitationsList citations={citations} />
      </div>
    </div>
  );
}
