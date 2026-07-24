import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { listProjects, deleteProject } from "../lib/api";
import { Trash2, ExternalLink, Rocket } from "lucide-react";
import { toast } from "sonner";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await listProjects());
    } catch { toast.error("Failed to load projects"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    await deleteProject(id);
    setProjects((p) => p.filter((x) => x.id !== id));
    toast.success("Project deleted");
  };

  return (
    <div data-testid="projects-page" className="max-w-[1400px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00f0ff]">
            /projects
          </div>
          <h1 className="font-heading font-black text-3xl sm:text-4xl mt-1">Your Workspace</h1>
        </div>
        <Link
          to="/"
          data-testid="new-project-btn"
          className="px-4 py-2 border border-[#00f0ff] text-[#00f0ff] font-mono text-xs uppercase tracking-widest hover:bg-[#00f0ff] hover:text-black transition-colors"
        >
          + New Project
        </Link>
      </div>

      {loading ? (
        <div className="font-mono text-sm text-[#a1a1aa]">Loading<span className="caret"></span></div>
      ) : projects.length === 0 ? (
        <div data-testid="empty-projects" className="border border-[#27272a] p-12 text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-[#a1a1aa]">No projects yet</div>
          <div className="mt-2 font-heading text-xl">Start with an idea →</div>
        </div>
      ) : (
        <div className="border border-[#27272a]">
          {projects.map((p) => (
            <div
              key={p.id}
              data-testid={`project-row-${p.id}`}
              className="border-b border-[#27272a] last:border-b-0 grid grid-cols-12 gap-4 items-center px-4 py-4 hover:bg-[#0a0a0a] transition-colors"
            >
              <div className="col-span-12 md:col-span-7">
                <Link to={`/project/${p.id}`} className="font-heading font-semibold text-lg hover:text-[#00f0ff]">
                  {p.title}
                </Link>
                <div className="font-mono text-xs text-[#a1a1aa] mt-1 truncate">{p.idea}</div>
              </div>
              <div className="col-span-6 md:col-span-2 font-mono text-[10px] uppercase tracking-widest">
                <span className={`px-2 py-1 border ${
                  p.status === "shipped" ? "border-[#00ff41] text-[#00ff41]" :
                  p.status === "ready" ? "border-[#00f0ff] text-[#00f0ff]" :
                  p.status === "orchestrating" ? "border-[#ffb000] text-[#ffb000]" :
                  "border-[#27272a] text-[#a1a1aa]"
                }`}>{p.status}</span>
              </div>
              <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-2">
                {p.github_url && (
                  <a href={p.github_url} target="_blank" rel="noreferrer"
                     data-testid={`gh-${p.id}`}
                     className="flex items-center gap-1 font-mono text-xs text-[#a1a1aa] hover:text-white">
                    <ExternalLink size={12} /> GitHub
                  </a>
                )}
                <Link to={`/project/${p.id}`}
                      data-testid={`open-${p.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 border border-[#27272a] font-mono text-xs uppercase hover:border-[#00f0ff] hover:text-[#00f0ff]">
                  <Rocket size={12} /> Open
                </Link>
                <button
                  onClick={() => remove(p.id)}
                  data-testid={`delete-${p.id}`}
                  className="p-2 border border-[#27272a] hover:border-[#ff3b30] hover:text-[#ff3b30] transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
