const SRC_COLOR = {
  arxiv: "text-[#00f0ff]",
  github: "text-[#00ff41]",
  reddit: "text-[#ffb000]",
  stackoverflow: "text-[#ff3b30]",
  google: "text-white",
  youtube: "text-[#ff3b30]",
};

export default function CitationsList({ citations }) {
  return (
    <div className="border border-[#27272a] bg-[#0a0a0a] max-h-[660px] overflow-auto">
      {citations.length === 0 ? (
        <div className="p-4 font-mono text-xs text-[#3f3f46]">[ no citations yet ]</div>
      ) : citations.map((c, i) => {
        const color = SRC_COLOR[c.source] || "text-[#a1a1aa]";
        const key = c.url || `${c.source}-${i}`;
        return (
          <a
            key={key}
            href={c.url}
            target="_blank"
            rel="noreferrer"
            data-testid={`citation-${i}`}
            className="block border-b border-[#27272a] p-3 hover:bg-[#121212] transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className={`font-mono text-[10px] uppercase ${color}`}>{c.source}</div>
              {c.date && <div className="font-mono text-[9px] text-[#3f3f46]">{c.date}</div>}
              {typeof c.stars === "number" && (
                <div className="font-mono text-[9px] text-[#ffb000]">★ {c.stars}</div>
              )}
            </div>
            <div className="font-mono text-xs text-white mt-1 line-clamp-2">{c.title}</div>
            {c.snippet && (
              <div className="font-mono text-[10px] text-[#a1a1aa] mt-1 line-clamp-2">{c.snippet}</div>
            )}
            <div className="font-mono text-[10px] text-[#3f3f46] mt-1 truncate">{c.url}</div>
          </a>
        );
      })}
    </div>
  );
}
