import { useMemo, useRef, useEffect } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";

const GROUP_COLORS = {
  core: "#00f0ff",
  tech: "#ffb000",
  domain: "#00ff41",
  method: "#ff3b30",
  tool: "#a1a1aa",
};

export default function KnowledgeGraph({ data }) {
  const fgRef = useRef();
  const graphData = useMemo(() => {
    if (!data || !data.nodes || !data.links) return { nodes: [], links: [] };
    // Filter links that reference missing nodes
    const ids = new Set(data.nodes.map((n) => n.id));
    return {
      nodes: data.nodes,
      links: data.links.filter((l) => ids.has(l.source) && ids.has(l.target)),
    };
  }, [data]);

  useEffect(() => {
    if (fgRef.current) {
      const controls = fgRef.current.controls?.();
      if (controls) { controls.autoRotate = true; controls.autoRotateSpeed = 0.6; }
    }
  }, [graphData]);

  if (!graphData.nodes.length) {
    return (
      <div className="h-full w-full flex items-center justify-center font-mono text-xs uppercase tracking-widest text-[#a1a1aa]">
        [ knowledge graph will render after orchestration ]
      </div>
    );
  }

  return (
    <div className="h-full w-full" data-testid="knowledge-graph">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel={(n) => `${n.label} (${n.group || "n/a"})`}
        nodeColor={(n) => GROUP_COLORS[n.group] || "#00f0ff"}
        nodeThreeObject={(node) => {
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              color: GROUP_COLORS[node.group] || "#00f0ff",
              transparent: true,
              opacity: 0.9,
            })
          );
          sprite.scale.set(6, 6, 1);
          return sprite;
        }}
        nodeThreeObjectExtend={false}
        linkColor={() => "#27272a"}
        linkOpacity={0.6}
        linkWidth={0.5}
        showNavInfo={false}
        enableNodeDrag={true}
        width={undefined}
        height={undefined}
      />
    </div>
  );
}
