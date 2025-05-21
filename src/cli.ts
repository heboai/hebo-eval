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
import { fileURLToPath } from 'url';
import { IEmbeddingProvider } from './embeddings/interfaces/embedding-provider.interface.js';
import { IAgent } from './agents/interfaces/agent.interface.js';

/**
 * Main CLI entry point for Hebo Eval
 * @module cli
 */

export const program = new Command();

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
}

/**
 * Interface for cli config
 */
interface CliConfig {
  embedding: EmbeddingConfig;
  agent: {
    agentKey: string;
    baseUrl: string;
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
    const parsed = JSON.parse(configContent) as CliConfig;
    return parsed;
  } catch (error: unknown) {
    const errorMessage = `Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`;
    Logger.error(errorMessage);
    throw new Error(errorMessage);
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

// program
//   .command('version')
//   .description('Display the current version')
//   .action(() => {
//     console.log(version);
//   });

program
  .command('run <agent>')
  .description('Run evaluation on an agent')
  .option('-d, --directory <path>', 'Directory containing test cases')
  .option('-c, --config <path>', 'Path to configuration file')
  .option(
    '-t, --threshold <number>',
    'Score threshold for passing (0-1)',
    '0.3',
  )
  .option('-f, --format <format>', 'Output format (json|markdown|text)', 'text')
  .option('-s, --stop-on-error', 'Stop processing on first error', false)
  .option(
    '-m, --max-concurrency <number>',
    'Maximum number of concurrent test executions',
    '5',
  )
  .action(async (agent: string, options: RunCommandOptions) => {
    let heboAgent: IAgent | undefined;
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
            agentKey: process.env.HEBO_AGENT_API_KEY,
            baseUrl: 'https://api.hebo.ai',
          },
        };

        //Validate embedding configuration
        if (!config.embedding || Object.keys(config.embedding).length === 0) {
          Logger.warn(
            'No embedding configuration found in environment variables',
          );
        }
      }
      // Validate required configuration
      if (
        !config.agent ||
        !('agentKey' in config.agent) ||
        !config.agent.agentKey
      ) {
        throw new Error(
          'HEBO_AGENT_API_KEY or HEBO_API_KEY environment variable or config file is required',
        );
      }

      Logger.info(`Initializing agent: ${agent}`);

      // Initialize agent
      heboAgent = new HeboAgent({
        model: agent,
        baseUrl: config.agent.baseUrl,
      });
      await heboAgent.initialize({ model: agent });
      await heboAgent.authenticate({ agentKey: config.agent.agentKey });

      Logger.info('Initializing scoring service...');

      // Initialize scoring service with embedding provider.
      let embeddingSystemConfig;
      if ('defaultProvider' in config.embedding) {
        // Already an EmbeddingSystemConfig
        embeddingSystemConfig = config.embedding;
      } else if ('provider' in config.embedding) {
        // Convert EmbeddingConfig to EmbeddingSystemConfig
        embeddingSystemConfig = {
          defaultProvider: config.embedding.provider,
          model: config.embedding.model,
          baseUrl: config.embedding.baseUrl,
          apiKey: config.embedding.apiKey,
        };
      } else {
        throw new Error(
          'Invalid embedding configuration: missing provider information',
        );
      }

      embeddingProvider = EmbeddingProviderFactory.createProvider(
        embeddingSystemConfig,
      );
      await embeddingProvider.initialize({
        provider: embeddingSystemConfig.defaultProvider,
        model: embeddingSystemConfig.model,
        baseUrl: embeddingSystemConfig.baseUrl,
        apiKey: embeddingSystemConfig.apiKey,
      });
      const scoringService = new ScoringService(embeddingProvider);

      const threshold = Number(options.threshold);
      const maxConcurrency = Number(options.maxConcurrency);
      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        throw new Error('`--threshold` must be a number between 0 and 1');
      }
      if (!Number.isInteger(maxConcurrency) || maxConcurrency <= 0) {
        throw new Error('`--max-concurrency` must be a positive integer');
      }
      const evalConfig: EvaluationConfig = {
        threshold,
        outputFormat: options.format as 'json' | 'markdown' | 'text',
        maxConcurrency,
      };

      Logger.info('Starting evaluation...');

      // Create and run evaluation
      const executor = new EvaluationExecutor(scoringService, evalConfig);
      const report = await executor.evaluateFromDirectory(
        heboAgent,
        options.directory || join(process.cwd(), 'examples'),
        options.stopOnError || false,
      );

      // Output results using the configured format
      const reportGenerator = new ReportGenerator(evalConfig);
      const formattedReport = reportGenerator.generateReport(report);
      console.log(formattedReport);

      // Log any errors that occurred during evaluation
      if (report.results.some((r) => r.error)) {
        Logger.warn('Some test cases failed during evaluation');
        report.results.forEach((r) => {
          if (r.error) {
            Logger.error(`${r.testCase.id} failed: ${r.error}`);
          }
        });
      }

      Logger.success('Evaluation completed successfully!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Format the error message based on its type
      if (errorMessage.includes('HEBO_API_KEY')) {
        Logger.error(
          'The HEBO_API_KEY is required but not found.\n\n' +
            'To fix this, either:\n' +
            '1. Set the HEBO_API_KEY environment variable:\n' +
            '   export HEBO_API_KEY=your_api_key_here\n\n' +
            '2. Or provide a config file with the --config option:\n' +
            '   hebo-eval run <agent> --config path/to/config.json\n\n' +
            'For more information, visit: https://docs.hebo.ai',
        );
      } else {
        Logger.error(errorMessage);
      }

      process.exit(1);
    } finally {
      // Always attempt to free resources
      await Promise.allSettled([
        heboAgent?.cleanup?.(),
        embeddingProvider?.cleanup?.(),
      ]);
    }
  });

/**
 * Run the CLI - only called when this module is run directly
 */
export const run = () => {
  program.parse();
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
