import type { MouseEvent } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { formatVersionDate, type SavedLayout, type SavedLayoutVersion } from "../lib/appModel";

function buildLayoutVersionGraph(layout: SavedLayout): { nodes: Node[]; edges: Edge[] } {
  const knownIds = new Set(layout.versions.map((version) => version.id));
  const childrenByParent = new Map<string | null, SavedLayoutVersion[]>();

  for (const version of layout.versions) {
    const parentId = version.parentId && knownIds.has(version.parentId) ? version.parentId : null;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(version);
    childrenByParent.set(parentId, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  const positioned: Array<{ version: SavedLayoutVersion; depth: number; row: number }> = [];
  let row = 0;
  const walk = (parentId: string | null, depth: number) => {
    for (const version of childrenByParent.get(parentId) ?? []) {
      positioned.push({ version, depth, row });
      row += 1;
      walk(version.id, depth + 1);
    }
  };
  walk(null, 0);

  const nodes: Node[] = positioned.map(({ version, depth, row: nodeRow }) => ({
    id: version.id,
    position: { x: depth * 260, y: nodeRow * 104 },
    className: version.id === layout.activeVersionId ? "version-node active" : "version-node",
    selected: version.id === layout.activeVersionId,
    data: {
      label: (
        <div className="version-node-label">
          <strong>{version.label}</strong>
          <span>{formatVersionDate(version.createdAt)}</span>
        </div>
      )
    }
  }));
  const edges: Edge[] = layout.versions
    .filter((version) => version.parentId && knownIds.has(version.parentId))
    .map((version) => ({
      id: `${version.parentId}-${version.id}`,
      source: version.parentId as string,
      target: version.id,
      type: "smoothstep",
      animated: version.id === layout.activeVersionId
    }));

  return { nodes, edges };
}

export function LayoutVersionTree({ layout, onSelectVersion }: {
  layout: SavedLayout;
  onSelectVersion: (versionId: string) => void;
}) {
  const graph = buildLayoutVersionGraph(layout);

  return (
    <div className="version-tree" data-testid="layout-version-tree">
      <ReactFlow
        fitView
        nodes={graph.nodes}
        edges={graph.edges}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_: MouseEvent, node: Node) => onSelectVersion(node.id)}
      >
        <MiniMap pannable zoomable />
        <Controls showInteractive={false} />
        <Background />
      </ReactFlow>
    </div>
  );
}
