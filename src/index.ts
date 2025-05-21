/**
 * Main entry point for Hebo Eval
 * @module index
 */

import { HeboEval } from './core/index.js';
import { EvaluationConfig } from './evaluation/types/evaluation.types.js';

export { HeboEval, EvaluationConfig };
export type {
  EvaluationResult,
  EvaluationReport,
} from './evaluation/types/evaluation.types';
