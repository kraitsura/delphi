/**
 * Result of creating a single task in a batch operation
 */
export interface TaskCreationResult {
  description: string;
  success: boolean;
  task?: any;
  error?: string;
}

/**
 * Result of a multi-task creation operation
 */
export interface MultiTaskResult {
  success: boolean;
  message: string;
  results?: TaskCreationResult[];
  totalRequested?: number;
  successfullyCreated?: number;
  suggestedAction?: string;
  pendingDescriptions?: string[];
}

/**
 * Re-export types from other helpers for convenience
 */
export type { Message, Commitment, CommitmentExtractionResult } from './CommitmentExtractor';
export type { RoomContext, Intent } from './IntentDetector';
export type { ContextBuildOptions } from './ContextBuilder';
