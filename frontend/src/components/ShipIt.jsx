import { useState, useEffect, useCallback } from "react";
import { shipIt, githubStatus } from "../lib/api";
import { toast } from "sonner";
import { Rocket, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const STEPS = [
  "Authenticating GitHub…",
  "Creating repository…",
  "Writing README.md…",
  "Adding .gitignore + folder structure…",
  "Pushing first commit…",
  "Deploying to your account…",
];

export default function ShipIt({ projectId, project, onShipped }) {
  const [status, setStatus] = useState({ configured: false, username: "" });
  const [shipping, setShipping] = useState(false);
  const [step, setStep] = useState(-1);
  const [url, setUrl] = useState(project?.github_url || "");

  useEffect(() => {
    githubStatus().then(setStatus).catch(() => {});
  }, []);
  useEffect(() => { setUrl(project?.github_url || ""); }, [project?.github_url]);

  const runSteps = useCallback(() => {
    let i = 0;
    const tick = () => {
      if (i < STEPS.length) { setStep(i++); setTimeout(tick, 700); }
    };
    tick();
  }, []);

  const ship = async () => {
    if (!status.configured) return toast.error("Set your GitHub token in Settings first.");
    setShipping(true);
    setStep(0);
    runSteps();
    try {
      const res = await shipIt(projectId);
      setUrl(res.url);
      toast.success("Repo shipped to GitHub!");
      onShipped?.(res.url);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Ship failed");
    } finally {
      setShipping(false);
      setStep(-1);
    }
  };

  return (
    <div data-testid="ship-it" className="border border-[#00ff41] p-6 bg-[#0a0a0a]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00ff41] flex items-center gap-2">
            <Rocket size={12} /> Ship It
          </div>
          <div className="font-heading font-bold text-2xl mt-1">
            One click. Real GitHub repo. Real commit.
          </div>
          <div className="text-sm text-[#a1a1aa] mt-2">
            Auto-generates README from your agent outputs, adds .gitignore + folder scaffold, and pushes the first commit.
          </div>
        </div>
        {!status.configured ? (
          <Link
            to="/settings"
            data-testid="configure-gh-link"
            className="flex items-center gap-1 px-4 py-2 border border-[#ffb000] text-[#ffb000] font-mono text-xs uppercase tracking-widest hover:bg-[#ffb000] hover:text-black transition-colors"
          >
            <AlertCircle size={12} /> Configure GitHub
          </Link>
        ) : url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            data-testid="view-repo-link"
            className="flex items-center gap-1 px-4 py-2 border border-[#00ff41] text-[#00ff41] font-mono text-xs uppercase tracking-widest hover:bg-[#00ff41] hover:text-black transition-colors"
          >
            <ExternalLink size={12} /> View Repo
          </a>
        ) : (
          <button
            data-testid="ship-btn"
            onClick={ship}
            disabled={shipping}
            className="flex items-center gap-2 px-6 py-3 bg-[#00ff41] text-black font-mono text-xs uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50"
          >
            {shipping ? <><Loader2 size={14} className="animate-spin" /> Shipping…</> : <><Rocket size={14} /> Ship to GitHub</>}
          </button>
        )}
      </div>

      {shipping && (
        <div data-testid="ship-console" className="mt-4 bg-black border border-[#27272a] p-4 font-mono text-xs space-y-1">
          {STEPS.map((s, i) => (
            <div key={s} className={i <= step ? "text-[#00ff41]" : "text-[#3f3f46]"}>
              {i < step ? "✓" : i === step ? "▸" : " "} {s}
            </div>
          ))}
        </div>
      )}

      {url && !shipping && (
        <div className="mt-4 font-mono text-xs text-[#a1a1aa]">
          Repo: <a className="text-[#00f0ff] underline" href={url} target="_blank" rel="noreferrer">{url}</a>
        </div>
      )}
    </div>
  );
}
