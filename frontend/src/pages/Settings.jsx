import { useEffect, useState } from "react";
import { saveGithub, githubStatus } from "../lib/api";
import { toast } from "sonner";
import { Github, CheckCircle2, AlertCircle } from "lucide-react";

export default function Settings() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState({ configured: false, username: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { githubStatus().then(setStatus).catch(() => {}); }, []);

  const save = async () => {
    if (!token || !username) return toast.error("Both token and username required.");
    setSaving(true);
    try {
      await saveGithub(token, username);
      const s = await githubStatus();
      setStatus(s);
      setToken("");
      toast.success("GitHub credentials saved.");
    } catch { toast.error("Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div data-testid="settings-page" className="max-w-[900px] mx-auto px-6 py-10">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00f0ff]">/settings</div>
      <h1 className="font-heading font-black text-3xl sm:text-4xl mt-1">Configuration</h1>

      <section className="mt-8 border border-[#27272a] p-6">
        <div className="flex items-center gap-2 mb-2">
          <Github size={18} />
          <div className="font-heading font-bold text-lg">GitHub Integration</div>
          {status.configured ? (
            <span className="ml-auto flex items-center gap-1 font-mono text-xs text-[#00ff41]">
              <CheckCircle2 size={14} /> Connected as {status.username}
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 font-mono text-xs text-[#ffb000]">
              <AlertCircle size={14} /> Not configured
            </span>
          )}
        </div>
        <p className="text-sm text-[#a1a1aa] leading-relaxed">
          To enable the &quot;Ship It&quot; feature, provide a GitHub Personal Access Token with the <code className="text-[#00f0ff]">repo</code> scope.
        </p>
        <ol className="text-sm text-[#a1a1aa] list-decimal ml-5 mt-3 space-y-1">
          <li>Visit <a className="text-[#00f0ff] underline" href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer">github.com/settings/tokens/new</a></li>
          <li>Note: <code className="text-white">Kairo</code> — Expiration: 30 days</li>
          <li>Check the <code className="text-[#00f0ff]">repo</code> scope</li>
          <li>Generate token (starts with <code className="text-white">ghp_...</code>) and paste below</li>
        </ol>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <label className="block">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa] mb-1">GitHub Username</div>
            <input
              data-testid="gh-username-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-github-username"
              className="w-full bg-[#0a0a0a] border border-[#27272a] focus:border-[#00f0ff] outline-none px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa] mb-1">Personal Access Token</div>
            <input
              data-testid="gh-token-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              type="password"
              className="w-full bg-[#0a0a0a] border border-[#27272a] focus:border-[#00f0ff] outline-none px-3 py-2 font-mono text-sm"
            />
          </label>
          <button
            onClick={save}
            data-testid="save-gh-btn"
            disabled={saving}
            className="self-start px-5 py-2 bg-[#00f0ff] text-black font-mono text-xs uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Credentials"}
          </button>
        </div>
      </section>

      <section className="mt-6 border border-[#27272a] p-6">
        <div className="font-heading font-bold text-lg mb-2">About</div>
        <div className="font-mono text-sm text-[#a1a1aa] leading-relaxed">
          <div>ProtoPilot · Multi-agent AI Research Copilot</div>
          <div className="mt-2">Team <span className="text-white">Silence</span> · Ajeenkya DY Patil · ID <span className="text-[#00f0ff]">0A7DD70427DE</span></div>
        </div>
      </section>
    </div>
  );
}
