import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Cpu, GitBranch, Sparkles, ShieldAlert, Rocket } from "lucide-react";
import { createProject } from "../lib/api";
import { toast } from "sonner";

const EXAMPLES = [
  "AI tool to reduce food waste in college hostels",
  "Voice-first study buddy for engineering students in Hinglish",
  "Blockchain-based attendance for practical labs",
  "AR overlay to identify circuit components in real-time",
];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!idea.trim()) return toast.error("Enter an idea to spin up the orchestra.");
    setLoading(true);
    try {
      const proj = await createProject(idea.trim());
      toast.success("Project created. Launching agents…");
      nav(`/project/${proj.id}`);
    } catch (err) {
      toast.error("Could not create project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="home-page" className="min-h-[calc(100vh-3.5rem)]">
      <section className="max-w-[1400px] mx-auto px-6 pt-20 pb-16 grain">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00f0ff] mb-6 flex items-center gap-2">
          <span className="w-2 h-2 bg-[#00f0ff] blink"></span>
          System online · 6 agents ready
        </div>
        <h1 className="font-heading font-black tracking-tighter text-4xl sm:text-5xl lg:text-7xl leading-[0.95]">
          From idea to
          <br />
          <span className="text-[#00f0ff] glow-cyan">GitHub commit</span>
          <br />
          in <span className="text-[#ffb000] glow-amber">7 minutes.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-[#a1a1aa] text-base sm:text-lg leading-relaxed">
          ProtoPilot orchestrates a 6-agent AI copilot that researches, architects, critiques, codes,
          cites, and ships your project — live. Watch the orchestra work. Then push to real GitHub.
        </p>

        <form
          onSubmit={submit}
          data-testid="idea-form"
          className="mt-10 border border-[#27272a] bg-[#0a0a0a] focus-within:border-[#00f0ff] transition-colors"
        >
          <div className="flex items-center gap-2 px-4 pt-3 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
            <span className="text-[#00ff41]">$</span>
            <span>protopilot init --idea</span>
          </div>
          <textarea
            data-testid="idea-input"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Type your project idea… e.g. 'AI to reduce food waste in hostels'"
            rows={3}
            className="w-full bg-transparent px-4 py-3 font-mono text-base outline-none resize-none placeholder:text-[#3f3f46]"
          />
          <div className="flex items-center justify-between px-2 py-2 border-t border-[#27272a]">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#a1a1aa] pl-2">
              Enter to launch · Shift+Enter for newline
            </div>
            <button
              data-testid="launch-agents-btn"
              type="submit"
              disabled={loading}
              className="group flex items-center gap-2 px-5 py-2 bg-[#00f0ff] text-black font-mono text-xs uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50"
            >
              {loading ? "Booting…" : "Launch Orchestra"}
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setIdea(ex)}
              data-testid={`example-${ex.slice(0, 12)}`}
              className="font-mono text-[11px] px-3 py-1.5 border border-[#27272a] text-[#a1a1aa] hover:border-[#00f0ff] hover:text-white transition-colors"
            >
              › {ex}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 py-16 border-t border-[#27272a]">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ffb000] mb-4">
          What makes ProtoPilot different
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#27272a] border border-[#27272a]">
          {[
            { icon: Cpu, title: "Live Agent Orchestra", body: "Watch 6 AI agents debate, critique, and build in parallel via streamed SSE." },
            { icon: ShieldAlert, title: "Failure Museum", body: "AI autopsies of abandoned GitHub repos so you don't repeat their mistakes." },
            { icon: Sparkles, title: "Reality Check Score™", body: "Feasibility scored for a student's real budget, skills, and timeline." },
            { icon: Zap, title: "Judge Simulator", body: "Three AI judges grill you before the real pitch with live scoring." },
            { icon: GitBranch, title: "One-Click Ship", body: "Creates a real GitHub repo with README, structure, and first commit." },
            { icon: Rocket, title: "Time Machine", body: "5 years of past tech landscape + 2-year forecast to kill 'already done'." },
          ].map((f) => (
            <div key={f.title} className="bg-black p-6 hover:bg-[#0a0a0a] transition-colors">
              <f.icon className="text-[#00f0ff]" size={20} />
              <div className="mt-4 font-heading font-bold text-lg">{f.title}</div>
              <div className="mt-2 text-sm text-[#a1a1aa] leading-relaxed">{f.body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
