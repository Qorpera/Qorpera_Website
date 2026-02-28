/**
 * Agent memory store — delegates to the deep memory system (v2).
 * Maintains the same external API for backward compatibility.
 */
export {
  getAgentMemoryIndex,
  appendMemoryEntry,
  compactMemory as compactMemoryIndex,
  ingestSubmissionFeedback,
  ingestTaskCompletion,
  getRelevantMemories,
  searchMemory,
  runMemoryDecay,
} from "@/lib/agent-memory-v2";
