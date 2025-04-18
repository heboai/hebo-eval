/**
 * Main entry point for Hebo Eval
 * @module index
 */

import { HeboEval } from './core/index.js';
import { EvaluationService } from './core/evaluation/evaluation-service.js';
import { EvaluationConfig } from './core/types/evaluation.js';

export { HeboEval, EvaluationService, EvaluationConfig };
export type {
  EvaluationResult,
  EvaluationReport,
} from './core/types/evaluation.js';
