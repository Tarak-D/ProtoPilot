export default function Footer() {
  return (
    <footer
      data-testid="protopilot-footer"
      className="border-t border-[#27272a] mt-16 py-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[#a1a1aa]"
    >
      <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <span className="text-white">Team Silence</span>
          <span className="mx-2 text-[#27272a]">|</span>
          Ajeenkya DY Patil
          <span className="mx-2 text-[#27272a]">|</span>
          ID <span className="text-[#00f0ff]">0A7DD70427DE</span>
        </div>
        <div>
          Powered by <span className="text-[#ffb000]">iNSIGHTS Layer 2</span> · Search Less. Solve More.
        </div>
      </div>
    </footer>
  );
}
