#!/usr/bin/env node

import { Command } from 'commander';
import { version } from './utils/package-info.js';
import { HeboAgent } from './agents/implementations/hebo-agent.js';
import { ScoringService } from './scoring/scoring.service.js';
import { EvaluationExecutor } from './evaluation/evaluation-executor.js';
import { EvaluationConfig } from './evaluation/types/evaluation.types.js';
import { Logger } from './utils/logger.js';
import { EmbeddingProviderFactory } from './embeddings/config/embedding.config.js';
import { readFileSync } from 'fs';
import { EmbeddingConfig } from './embeddings/types/embedding.types.js';
import { ReportGenerator } from './report/report-generator.js';
import { join } from 'path';
import { IEmbeddingProvider } from './embeddings/interfaces/embedding-provider.interface.js';

/**
 * Main CLI entry point for Hebo Eval
 * @module cli
 */

const program = new Command();
const logger = Logger.getInstance();

/**
 * Interface for run command options
 */
interface RunCommandOptions {
  directory?: string;
  config?: string;
  threshold: string;
  format: string;
  stopOnError: boolean;
  maxConcurrency: string;
  useSemanticScoring: boolean;
}

/**
 * Interface for cli config
 */
interface CliConfig {
  embedding: EmbeddingConfig;
  agent: {
    apiKey: string;
    baseUrl?: string;
  };
}

/**
 * Loads configuration from a file
 * @param configPath Path to the configuration file
 * @returns The loaded configuration
 */
function loadConfig(configPath: string): CliConfig {
  try {
    const resolvedPath = join(process.cwd(), configPath);
    const configContent = readFileSync(resolvedPath, 'utf-8');
    const parsed = JSON.parse(configContent) as {
      embedding: EmbeddingConfig;
      agent: {
        apiKey: string;
        baseUrl?: string;
      };
    };
    return parsed;
  } catch (error) {
    logger.error(`Failed to load config from ${configPath}:`, {
      error: error instanceof Error ? error : String(error),
    });
    throw new Error(
      `Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Creates and configures the CLI program
 * @returns Configured Commander program
 */
program
  .name('hebo-eval')
  .description('A CLI tool for evaluating and testing language models')
  .version(version);

program
  .command('version')
  .description('Display the current version')
  .action(() => {
    console.log(version);
  });

program
  .command('run <agent>')
  .description('Run evaluation on an agent')
  .option('-d, --directory <path>', 'Directory containing test cases')
  .option('-c, --config <path>', 'Path to configuration file')
  .option(
    '-t, --threshold <number>',
    'Score threshold for passing (0-1)',
    '0.7',
  )
  .option(
    '-f, --format <format>',
    'Output format (json|markdown|text)',
    'markdown',
  )
  .option('-s, --stop-on-error', 'Stop processing on first error', false)
  .option(
    '-m, --max-concurrency <number>',
    'Maximum number of concurrent test executions',
    '5',
  )
  .option('--use-semantic-scoring', 'Use semantic scoring for evaluation', true)
  .action(async (agent: string, options: RunCommandOptions) => {
    let heboAgent: HeboAgent | undefined;
    let embeddingProvider: IEmbeddingProvider | undefined;
    try {
      // Load configuration from file, environment, or defaults
      let config;
      if (options.config) {
        config = loadConfig(options.config);
      } else {
        // Load from environment variables
        config = {
          embedding: EmbeddingProviderFactory.loadFromEnv(),
          agent: {
            apiKey: process.env.HEBO_API_KEY,
            baseUrl: process.env.HEBO_BASE_URL || 'https://api.hebo.ai',
          },
        };

        //Validate embedding configurationb
        if (!config.embedding || Object.keys(config.embedding).length === 0) {
          logger.warn(
            'No embedding configuration found in environment variables',
          );
        }
      }

      // Validate required configuration
      if (!config.agent?.apiKey) {
        throw new Error(
          'HEBO_API_KEY environment variable or config file is required',
        );
      }

      // Initialize agent
      heboAgent = new HeboAgent({
        model: agent,
        baseUrl: config.agent.baseUrl,
      });
      await heboAgent.initialize({ model: agent });
      await heboAgent.authenticate({ apiKey: config.agent.apiKey });

      // Initialize scoring service with embedding provider
      embeddingProvider = EmbeddingProviderFactory.createProvider({
        defaultProvider: 'litellm',
        ...config.embedding,
      });
      const scoringService = new ScoringService(embeddingProvider);

      // Configure evaluation
      const evalConfig: EvaluationConfig = {
        threshold: parseFloat(options.threshold),
        outputFormat: options.format as 'json' | 'markdown' | 'text',
        useSemanticScoring: options.useSemanticScoring,
        maxConcurrency: parseInt(options.maxConcurrency, 10),
      };

      // Create and run evaluation
      const executor = new EvaluationExecutor(scoringService, evalConfig);
      const report = await executor.evaluateFromDirectory(
        heboAgent,
        options.directory || './test-cases',
        options.stopOnError,
      );

      // Output results using the configured format
      const reportGenerator = new ReportGenerator(evalConfig);
      const formattedReport = reportGenerator.generateReport(report);
      console.log(formattedReport);
    } catch (error) {
      logger.error('Evaluation failed:', {
        error: error instanceof Error ? error : String(error),
      });
      process.exit(1);
    } finally {
      // Always attempt to free resources
      await Promise.allSettled([
        heboAgent?.cleanup?.(),
        embeddingProvider?.cleanup?.(),
      ]);
    }
  });

program.parse();
