import { useState } from "react";
import { judgeQuestions, judgeScore } from "../lib/api";
import { toast } from "sonner";
import { Gavel, Loader2, Send } from "lucide-react";

const JUDGES = [
  { id: "technical",  name: "Tech Judge",       color: "#00f0ff", vibe: "Ex-Google engineer. Cares about scale + correctness." },
  { id: "business",   name: "Business Judge",   color: "#ffb000", vibe: "VC partner. Cares about market + moat." },
  { id: "innovation", name: "Innovation Judge", color: "#ff3b30", vibe: "Research prof. Cares about novelty + impact." },
];

export default function JudgeSimulator({ projectId }) {
  const [questions, setQuestions] = useState(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [answers, setAnswers] = useState({});
  const [scores, setScores] = useState({}); // key = judge:qIndex
  const [scoring, setScoring] = useState({});

  const load = async () => {
    setLoadingQ(true);
    try {
      const q = await judgeQuestions(projectId);
      setQuestions(q);
    } catch { toast.error("Could not load judge questions"); }
    finally { setLoadingQ(false); }
  };

  const submit = async (judge, qIndex) => {
    const key = `${judge}:${qIndex}`;
    const answer = answers[key];
    if (!answer?.trim()) return toast.error("Type an answer first.");
    setScoring((s) => ({ ...s, [key]: true }));
    try {
      const res = await judgeScore(projectId, {
        judge,
        question: questions[judge][qIndex],
        answer,
      });
      setScores((s) => ({ ...s, [key]: res }));
    } catch { toast.error("Scoring failed"); }
    finally { setScoring((s) => ({ ...s, [key]: false })); }
  };

  const avg = (dim) => {
    const arr = Object.values(scores).map((s) => s?.[dim]).filter((x) => typeof x === "number");
    if (!arr.length) return 0;
    return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
  };

  return (
    <div data-testid="judge-simulator" className="border border-[#27272a] p-6 scanlines">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ffb000] flex items-center gap-2">
            <Gavel size={12} /> Judge Simulator
          </div>
          <div className="font-heading font-bold text-xl mt-1">3 AI judges. Real scoring. Zero mercy.</div>
        </div>
        <button
          data-testid="load-judge-btn"
          onClick={load}
          disabled={loadingQ}
          className="px-4 py-2 border border-[#ffb000] text-[#ffb000] font-mono text-xs uppercase tracking-widest hover:bg-[#ffb000] hover:text-black transition-colors disabled:opacity-50"
        >
          {loadingQ ? "Loading…" : questions ? "Reload Questions" : "Load Questions"}
        </button>
      </div>

      {questions && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {["clarity","depth","confidence"].map((dim) => (
            <div key={dim} data-testid={`score-${dim}`} className="border border-[#27272a] p-3 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">{dim}</div>
              <div className="font-heading font-black text-3xl text-[#00f0ff] glow-cyan mt-1">{avg(dim)}<span className="text-[#3f3f46] text-lg">/10</span></div>
            </div>
          ))}
        </div>
      )}

      {questions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {JUDGES.map((j) => (
            <div key={j.id} className="border border-[#27272a] bg-[#0a0a0a] flex flex-col">
              <div className="px-3 py-2 border-b border-[#27272a]" style={{ color: j.color }}>
                <div className="font-heading font-bold text-sm">{j.name}</div>
                <div className="font-mono text-[10px] text-[#a1a1aa] mt-0.5">{j.vibe}</div>
              </div>
              <div className="p-3 space-y-4 flex-1">
                {(questions[j.id] || []).map((q, i) => {
                  const key = `${j.id}:${i}`;
                  const sc = scores[key];
                  return (
                    <div key={key} data-testid={`q-${j.id}-${i}`}>
                      <div className="font-mono text-[11px] text-white leading-relaxed">Q{i+1}. {q}</div>
                      <textarea
                        data-testid={`answer-${j.id}-${i}`}
                        rows={2}
                        value={answers[key] || ""}
                        onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                        placeholder="Your answer…"
                        className="mt-2 w-full bg-black border border-[#27272a] focus:border-[#00f0ff] outline-none px-2 py-1.5 font-mono text-[11px]"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <button
                          onClick={() => submit(j.id, i)}
                          disabled={scoring[key]}
                          data-testid={`submit-${j.id}-${i}`}
                          className="flex items-center gap-1 px-2 py-1 border border-[#27272a] hover:border-[#00f0ff] font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
                        >
                          {scoring[key] ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                          Score
                        </button>
                        {sc && (
                          <div className="font-mono text-[10px] text-[#a1a1aa]">
                            C:<span className="text-[#00f0ff]">{sc.clarity}</span> D:<span className="text-[#ffb000]">{sc.depth}</span> Cf:<span className="text-[#00ff41]">{sc.confidence}</span>
                          </div>
                        )}
                      </div>
                      {sc?.feedback && <div className="mt-1 font-mono text-[10px] text-[#ffb000] italic">› {sc.feedback}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!questions && !loadingQ && (
        <div className="text-[#a1a1aa] font-mono text-sm">Click &quot;Load Questions&quot; to summon the judges.</div>
      )}
    </div>
  );
}
