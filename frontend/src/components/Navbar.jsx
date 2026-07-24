import { Link, useLocation } from "react-router-dom";
import { Terminal, FolderGit2, Settings } from "lucide-react";

export default function Navbar() {
  const loc = useLocation();
  const active = (p) => loc.pathname === p;
  return (
    <nav
      data-testid="protopilot-navbar"
      className="sticky top-0 z-40 border-b border-[#27272a] bg-black/90 backdrop-blur"
    >
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" data-testid="brand-link">
          <div className="w-7 h-7 border border-[#00f0ff] flex items-center justify-center">
            <Terminal size={14} className="text-[#00f0ff]" />
          </div>
          <span className="font-heading font-black tracking-tight text-lg">
            Proto<span className="text-[#00f0ff]">Pilot</span>
          </span>
          <span className="font-mono text-[10px] uppercase text-[#a1a1aa] ml-2 hidden sm:inline">
            v0.1 · silence
          </span>
        </Link>
        <div className="flex items-center gap-1 font-mono text-xs uppercase tracking-widest">
          <Link
            to="/"
            data-testid="nav-home"
            className={`px-3 py-1.5 border ${active("/") ? "border-[#00f0ff] text-[#00f0ff]" : "border-transparent text-[#a1a1aa] hover:text-white hover:border-[#27272a]"}`}
          >
            Home
          </Link>
          <Link
            to="/projects"
            data-testid="nav-projects"
            className={`px-3 py-1.5 border flex items-center gap-1 ${active("/projects") ? "border-[#00f0ff] text-[#00f0ff]" : "border-transparent text-[#a1a1aa] hover:text-white hover:border-[#27272a]"}`}
          >
            <FolderGit2 size={12} /> Projects
          </Link>
          <Link
            to="/settings"
            data-testid="nav-settings"
            className={`px-3 py-1.5 border flex items-center gap-1 ${active("/settings") ? "border-[#00f0ff] text-[#00f0ff]" : "border-transparent text-[#a1a1aa] hover:text-white hover:border-[#27272a]"}`}
          >
            <Settings size={12} /> Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}
