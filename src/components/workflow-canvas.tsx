"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnConnect,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { WorkflowGraph, WorkflowNode, WorkflowNodeType } from "@/lib/workflow-types";
import { NODE_TYPE_META } from "@/lib/workflow-types";
import { WorkflowNodeConfig } from "@/components/workflow-node-config";

type Props = {
  graph: WorkflowGraph;
  onChange: (graph: WorkflowGraph) => void;
  readOnly?: boolean;
  nodeStates?: Record<string, { status: string; output?: string; error?: string }>;
};

function CustomNode({ data }: { data: { label: string; nodeType: WorkflowNodeType; status?: string } }) {
  const meta = NODE_TYPE_META[data.nodeType];
  const statusColor = data.status === "completed" ? "#10b981"
    : data.status === "running" ? "#3b82f6"
    : data.status === "failed" ? "#ef4444"
    : data.status === "skipped" ? "#6b7280"
    : undefined;

  return (
    <div
      className="px-4 py-2.5 rounded-xl border shadow-lg min-w-[160px] text-center"
      style={{
        background: "rgba(12, 16, 22, 0.95)",
        borderColor: statusColor ?? `${meta.color}50`,
        boxShadow: statusColor ? `0 0 12px ${statusColor}40` : `0 0 8px ${meta.color}20`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-white/30 !border-none" />
      <div className="flex items-center gap-2 justify-center">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: statusColor ?? meta.color }}
        />
        <span className="text-xs font-medium text-white/80 truncate">{data.label}</span>
      </div>
      <p className="text-[10px] text-white/30 mt-0.5">{meta.label}</p>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white/30 !border-none" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

function toReactFlowNodes(wfNodes: WorkflowNode[], states?: Record<string, { status: string }>): Node[] {
  return wfNodes.map((n) => ({
    id: n.id,
    type: "custom",
    position: n.position,
    data: {
      label: n.label,
      nodeType: n.type,
      config: n.config,
      status: states?.[n.id]?.status,
    },
  }));
}

function toReactFlowEdges(wfEdges: WorkflowGraph["edges"]): Edge[] {
  return wfEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? e.conditionBranch ?? undefined,
    style: {
      stroke: e.conditionBranch === "true" ? "#10b981"
        : e.conditionBranch === "false" ? "#ef4444"
        : "#ffffff30",
      strokeWidth: 2,
    },
    labelStyle: { fill: "#ffffff80", fontSize: 10 },
    animated: false,
  }));
}

let nodeIdCounter = 0;

export function WorkflowCanvas({ graph, onChange, readOnly, nodeStates }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toReactFlowNodes(graph.nodes, nodeStates));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toReactFlowEdges(graph.edges));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, id: `e-${Date.now()}`, style: { stroke: "#ffffff30", strokeWidth: 2 } }, eds));
    },
    [setEdges],
  );

  // Build WorkflowGraph from ReactFlow nodes/edges
  const buildGraph = useCallback((rfNodes: Node[], rfEdges: Edge[]): WorkflowGraph => {
    const wfNodes: WorkflowNode[] = rfNodes.map((n) => ({
      id: n.id,
      type: (n.data as { nodeType: WorkflowNodeType }).nodeType,
      label: (n.data as { label: string }).label,
      position: n.position,
      config: (n.data as { config?: Record<string, unknown> }).config ?? {},
    }));
    const wfEdges = rfEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === "string" ? e.label : undefined,
      conditionBranch: typeof e.label === "string" && (e.label === "true" || e.label === "false") ? e.label as "true" | "false" : undefined,
    }));
    return { nodes: wfNodes, edges: wfEdges };
  }, []);

  // Sync current ReactFlow state back to WorkflowGraph (for onMoveEnd)
  const syncGraph = useCallback(() => {
    onChange(buildGraph(nodes, edges));
  }, [nodes, edges, onChange, buildGraph]);

  const addNode = useCallback((type: WorkflowNodeType) => {
    nodeIdCounter++;
    const meta = NODE_TYPE_META[type];
    const newNode: Node = {
      id: `node-${Date.now()}-${nodeIdCounter}`,
      type: "custom",
      position: { x: 250, y: 100 + nodes.length * 130 },
      data: { label: meta.label, nodeType: type, config: {} },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null),
    [selectedNodeId, nodes],
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 relative">
        {!readOnly && (
          <div className="absolute top-3 left-3 z-10 flex gap-1.5 flex-wrap">
            {(["trigger_manual", "agent_action", "condition", "delay", "output", "parallel_split", "parallel_join"] as WorkflowNodeType[]).map((type) => (
              <button
                key={type}
                onClick={() => addNode(type)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors"
                style={{
                  borderColor: `${NODE_TYPE_META[type].color}40`,
                  color: NODE_TYPE_META[type].color,
                  background: `${NODE_TYPE_META[type].color}10`,
                }}
              >
                + {NODE_TYPE_META[type].label}
              </button>
            ))}
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          onMoveEnd={readOnly ? undefined : syncGraph}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: "rgba(8, 12, 16, 1)" }}
        >
          <Background color="#ffffff08" gap={20} />
          <Controls className="!bg-[rgba(12,16,22,0.9)] !border-white/10 !rounded-xl [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-white/60 [&>button:hover]:!bg-white/5" />
          <MiniMap
            nodeColor="#14b8a640"
            maskColor="rgba(8, 12, 16, 0.8)"
            className="!bg-[rgba(12,16,22,0.9)] !border-white/10 !rounded-xl"
          />
        </ReactFlow>
      </div>

      {selectedNode && !readOnly && (
        <WorkflowNodeConfig
          node={{
            id: selectedNode.id,
            type: (selectedNode.data as { nodeType: WorkflowNodeType }).nodeType,
            label: (selectedNode.data as { label: string }).label,
            config: (selectedNode.data as { config?: Record<string, unknown> }).config ?? {},
          }}
          onUpdate={(updates) => {
            const updatedNodes = nodes.map((n) =>
              n.id === selectedNode.id
                ? { ...n, data: { ...n.data, ...updates } }
                : n,
            );
            setNodes(updatedNodes);
            onChange(buildGraph(updatedNodes, edges));
          }}
          onClose={() => setSelectedNodeId(null)}
          onDelete={() => {
            const updatedNodes = nodes.filter((n) => n.id !== selectedNode.id);
            const updatedEdges = edges.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id);
            setNodes(updatedNodes);
            setEdges(updatedEdges);
            setSelectedNodeId(null);
            onChange(buildGraph(updatedNodes, updatedEdges));
          }}
        />
      )}
    </div>
  );
}
