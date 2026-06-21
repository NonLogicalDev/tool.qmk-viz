import type { MouseEvent } from "react";
import { Background, Controls, MiniMap, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { formatVersionDate, type SavedLayout, type SavedLayoutVersion } from "../lib/appModel";

function buildLayoutVersionGraph(layout: SavedLayout): { nodes: Node[]; edges: Edge[] } {
  const knownIds = new Set(layout.versions.map((version) => version.id));
  const versionsById = new Map(layout.versions.map((version) => [version.id, version]));
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

  const activePath = new Set<string>();
  let activeWalker = versionsById.get(layout.activeVersionId);
  while (activeWalker) {
    activePath.add(activeWalker.id);
    activeWalker = activeWalker.parentId ? versionsById.get(activeWalker.parentId) : undefined;
  }

  const positioned: Array<{ version: SavedLayoutVersion; depth: number; lane: number }> = [];
  let nextLane = 1;
  const walk = (version: SavedLayoutVersion, depth: number, lane: number) => {
    positioned.push({ version, depth, lane });

    const children = childrenByParent.get(version.id) ?? [];
    for (const [index, child] of children.entries()) {
      walk(child, depth + 1, index === 0 ? lane : nextLane++);
    }
  };

  for (const [index, root] of (childrenByParent.get(null) ?? []).entries()) {
    walk(root, 0, index === 0 ? 0 : nextLane++);
  }

  const nodes: Node[] = positioned.map(({ version, depth, lane }) => ({
    id: version.id,
    position: { x: depth * 250, y: lane * 118 },
    className: [
      "version-node",
      activePath.has(version.id) ? "active-path" : "",
      version.id === layout.activeVersionId ? "active" : ""
    ].filter(Boolean).join(" "),
    selected: version.id === layout.activeVersionId,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      label: (
        <div className="version-node-label" data-version-id={version.id} data-version-name={version.name}>
          <strong>{version.name}</strong>
          <span>{formatVersionDate(version.createdAt)}</span>
          <em>{version.keyboardModel.name}</em>
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
      className: activePath.has(version.id) && activePath.has(version.parentId as string) ? "active-path" : "",
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
