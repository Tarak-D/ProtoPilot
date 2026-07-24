import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getProject, orchestrate } from "../lib/api";
import { AGENTS } from "../components/AgentOrchestra";
import OrchestraView from "../components/OrchestraView";
import JudgeSimulator from "../components/JudgeSimulator";
import FailureMuseum from "../components/FailureMuseum";
import RealityCheck from "../components/RealityCheck";
import TimeMachine from "../components/TimeMachine";
import ShipIt from "../components/ShipIt";
import { toast } from "sonner";
import { Play, Loader2, ExternalLink, Sparkles, Skull, Gauge, Clock, Rocket, Cpu } from "lucide-react";

const TABS = [
  { id: "orchestra", label: "Orchestra", icon: Cpu },
  { id: "judge", label: "Judge Simulator", icon: Sparkles },
  { id: "museum", label: "Failure Museum", icon: Skull },
  { id: "reality", label: "Reality Check", icon: Gauge },
  { id: "time", label: "Time Machine", icon: Clock },
  { id: "ship", label: "Ship It", icon: Rocket },
];

// Handle each SSE event type in isolation to keep run() readable.
function makeHandler({ pushLog, setStatuses, setOutputs, setGraph, setCitations }) {
  return (ev) => {
    if (ev.type === "start") {
      pushLog(`› dispatching ${ev.agents.length} agents in parallel`);
    } else if (ev.type === "agent_start") {
      setStatuses((s) => ({ ...s, [ev.agent]: "running" }));
      setOutputs((o) => ({ ...o, [ev.agent]: "" }));
      pushLog(`▸ ${ev.agent} agent started`);
    } else if (ev.type === "agent_token") {
      setOutputs((o) => ({ ...o, [ev.agent]: (o[ev.agent] || "") + ev.token }));
    } else if (ev.type === "agent_done") {
      pushLog(`✓ ${ev.agent} agent completed (${ev.output.length} chars)`);
      setStatuses((s) => ({ ...s, [ev.agent]: "done" }));
      setOutputs((o) => ({ ...o, [ev.agent]: ev.output }));
    } else if (ev.type === "complete") {
      pushLog(`✓ knowledge graph built (${ev.graph?.nodes?.length || 0} nodes)`);
      pushLog(`✓ ${ev.citations?.length || 0} real citations from ArXiv + GitHub`);
      setGraph(ev.graph);
      setCitations(ev.citations || []);
    }
  };
}

export default function Dashboard() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState("orchestra");
  const [statuses, setStatuses] = useState({});
  const [outputs, setOutputs] = useState({});
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [graph, setGraph] = useState(null);
  const [citations, setCitations] = useState([]);
  const logEndRef = useRef(null);
  const autoStarted = useRef(false);
  const runningRef = useRef(false);
  const logCounter = useRef(0);

  const pushLog = useCallback((line) => {
    const t = new Date().toLocaleTimeString();
    logCounter.current += 1;
    const uniqueId = `log-${Date.now()}-${logCounter.current}`;
    setLog((l) => [...l, { id: uniqueId, t, line }]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getProject(id).then((p) => {
      if (cancelled) return;
      setProject(p);
      setOutputs(p.agent_outputs || {});
      setGraph(p.knowledge_graph || null);
      setCitations(p.citations || []);
      if (p.agent_outputs && Object.keys(p.agent_outputs).length) {
        const s = {};
        Object.keys(p.agent_outputs).forEach((k) => { s[k] = "done"; });
        setStatuses(s);
      }
    }).catch(() => toast.error("Project not found"));
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [log]);

  const run = useCallback(async () => {
    // Synchronous lock to prevent React StrictMode double-invocation
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setStatuses({});
    setOutputs({});
    setLog([]);
    logCounter.current = 0;
    pushLog("$ protopilot orchestrate --parallel --agents=6 --stream=tokens");
    const handleEvent = makeHandler({ pushLog, setStatuses, setOutputs, setGraph, setCitations });
    try {
      await orchestrate(id, handleEvent);
      pushLog("$ orchestration complete. ready to ship.");
      toast.success("All 6 agents finished");
      const p = await getProject(id);
      setProject(p);
    } catch (e) {
      pushLog(`✗ error: ${e.message}`);
      toast.error("Orchestration failed");
    } finally {
      setRunning(false);
      runningRef.current = false;
    }
  }, [id, pushLog]);

  // Auto-start when project has no prior outputs
  useEffect(() => {
    if (project && !autoStarted.current && Object.keys(project.agent_outputs || {}).length === 0) {
      autoStarted.current = true;
      run();
    }
  }, [project, run]);

  if (!project) {
    return <div className="max-w-[1400px] mx-auto px-6 py-10 font-mono text-sm text-[#a1a1aa]">Loading<span className="caret"></span></div>;
  }

  return (
    <div data-testid="dashboard" className="max-w-[1400px] mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00f0ff]">
            /project/{id.slice(0, 8)}
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl mt-1 truncate">{project.title}</h1>
          <div className="font-mono text-xs text-[#a1a1aa] mt-1 line-clamp-2">{project.idea}</div>
        </div>
        <div className="flex items-center gap-2">
          {project.github_url && (
            <a href={project.github_url} target="_blank" rel="noreferrer"
               data-testid="repo-badge"
               className="flex items-center gap-1 px-3 py-2 border border-[#00ff41] text-[#00ff41] font-mono text-xs uppercase tracking-widest hover:bg-[#00ff41] hover:text-black">
              <ExternalLink size={12} /> Repo Live
            </a>
          )}
          <button
            onClick={run}
            disabled={running}
            data-testid="rerun-orchestra-btn"
            className="flex items-center gap-2 px-4 py-2 bg-[#00f0ff] text-black font-mono text-xs uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50"
          >
            {running ? <><Loader2 size={12} className="animate-spin" /> Running…</> : <><Play size={12} /> Run Orchestra</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#27272a] mb-6 flex flex-wrap gap-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-[#00f0ff] text-[#00f0ff]"
                : "border-transparent text-[#a1a1aa] hover:text-white"
            }`}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "orchestra" && (
        <OrchestraView
          statuses={statuses}
          outputs={outputs}
          log={log}
          running={running}
          logEndRef={logEndRef}
          graph={graph}
          citations={citations}
        />
      )}
      {tab === "judge" && <JudgeSimulator projectId={id} />}
      {tab === "museum" && <FailureMuseum projectId={id} />}
      {tab === "reality" && <RealityCheck projectId={id} />}
      {tab === "time" && <TimeMachine projectId={id} />}
      {tab === "ship" && (
        <ShipIt
          projectId={id}
          project={project}
          onShipped={(url) => setProject((p) => ({ ...p, github_url: url, status: "shipped" }))}
        />
      )}
    </div>
  );
}
