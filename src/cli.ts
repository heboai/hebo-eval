#!/usr/bin/env node

import { Command } from 'commander';
import { version } from './utils/package-info.js';
import { ScoringService } from './scoring/scoring.service.js';
import { EvaluationExecutor } from './evaluation/evaluation-executor.js';
import { EvaluationConfig } from './evaluation/types/evaluation.types.js';
import { Logger } from './utils/logger.js';
import { EmbeddingProviderFactory } from './embeddings/factory/embedding-provider.factory.js';
import { EmbeddingConfig } from './embeddings/types/embedding.types.js';
import { join } from 'path';
import { IEmbeddingProvider } from './embeddings/interfaces/embedding-provider.interface.js';
import { IAgent } from './agents/interfaces/agent.interface.js';
import { createAgent } from './agents/factory/agent.factory.js';
import { getProviderBaseUrl } from './utils/provider-config.js';
import { ConfigLoader } from './config/config.loader.js';
import { EmbeddingSystemConfig } from './embeddings/config/embedding.config.js';
import { getProviderFromModel } from './utils/provider-mapping.js';

/**
 * Main CLI entry point for Hebo Eval
 * @module cli
 */

export const program = new Command();

// Initialize configuration
const configLoader = ConfigLoader.getInstance();

// Try to load configuration from default location
try {
  const configPath = join(process.cwd(), 'hebo-evals.config.yaml');
  configLoader.loadConfig(configPath);
  Logger.debug('Configuration loaded from default location');
} catch {
  Logger.debug('No configuration file found in default location');
}

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
  verbose: boolean;
  provider?: string;
  key?: string;
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
  .command('run')
  .description('Run an evaluation')
  .argument('<agent>', 'The agent to evaluate (e.g., gpt-4, hebo-*, claude-*)')
  .option('-c, --config <path>', 'Path to configuration file')
  .option(
    '-t, --threshold <number>',
    'Score threshold for passing (0-1)',
    '0.8',
  )
  .option('-f, --format <format>', 'Output format (json|markdown|text)', 'text')
  .option('-s, --stop-on-error', 'Stop processing on first error', false)
  .option(
    '-m, --max-concurrency <number>',
    'Maximum number of concurrent test executions',
    '5',
  )
  .option(
    '-v, --verbose',
    'Show verbose output including test results and provider information',
    false,
  )
  .action(async (agent: string, options: RunCommandOptions) => {
    let heboAgent: IAgent | undefined;
    let embeddingProvider: IEmbeddingProvider | undefined;
    try {
      // Configure logger verbosity
      Logger.configure({
        verbose: options.verbose,
      });

      // Load custom configuration if provided
      if (options.config) {
        configLoader.loadConfig(options.config);
        Logger.debug(`Configuration loaded from ${options.config}`);
      }

      // Determine provider from model name
      const { provider, modelName } = getProviderFromModel(agent);
      const baseUrl = getProviderBaseUrl(provider);

      // Validate provider configuration
      configLoader.validateProviderConfig(provider);
      const apiKey = configLoader.getProviderApiKey(provider);

      // Initialize agent using factory
      try {
        heboAgent = createAgent({
          model: modelName,
          baseUrl,
          provider,
        });

        // Validate agent initialization
        await heboAgent.initialize({
          model: modelName,
          provider,
        });
        await heboAgent.authenticate({ agentKey: apiKey });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Configuration error')
        ) {
          throw new Error(error.message);
        }
        throw new Error(
          `Failed to initialize agent: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Initialize scoring service with embedding provider
      const config = configLoader.getConfig();
      const embeddingConfig = config.embedding;

      if (!embeddingConfig) {
        throw new Error(
          'Configuration error: Embedding configuration is required',
        );
      }

      // Ensure embedding configuration is complete
      configLoader.validateEmbeddingConfig(embeddingConfig.provider);

      // Convert EmbeddingConfig to EmbeddingSystemConfig
      const embeddingSystemConfig: EmbeddingSystemConfig = {
        defaultProvider: embeddingConfig.provider,
        model: embeddingConfig.model,
        baseUrl:
          embeddingConfig.baseUrl ||
          getProviderBaseUrl(embeddingConfig.provider),
        apiKey: embeddingConfig.apiKey || '',
      };

      try {
        // Convert EmbeddingSystemConfig to EmbeddingConfig
        const providerConfig: EmbeddingConfig = {
          provider: embeddingSystemConfig.defaultProvider,
          model: embeddingSystemConfig.model,
          baseUrl: embeddingSystemConfig.baseUrl,
          apiKey: embeddingSystemConfig.apiKey,
        };

        embeddingProvider =
          EmbeddingProviderFactory.createProvider(providerConfig);
        await embeddingProvider.initialize(providerConfig);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Configuration error: Failed to authenticate embedding provider: ${errorMessage}\n\nPlease check:\n1. Your embedding API key is correct and has not expired\n2. The provider (${embeddingSystemConfig.defaultProvider}) matches your API key\n3. The base URL (${embeddingSystemConfig.baseUrl}) is correct for your provider`,
        );
      }

      // Initialize scoring service
      const scoringService = new ScoringService(embeddingProvider);

      // Parse threshold
      const threshold = parseFloat(options.threshold);
      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        throw new Error(
          'Configuration error: `--threshold` must be a number between 0 and 1',
        );
      }

      // Parse max concurrency
      const maxConcurrency = parseInt(options.maxConcurrency, 10);
      if (isNaN(maxConcurrency) || maxConcurrency < 1) {
        throw new Error(
          'Configuration error: `--max-concurrency` must be a positive number',
        );
      }

      // Create evaluation config
      const evaluationConfig: EvaluationConfig = {
        threshold,
        outputFormat: options.format as 'json' | 'markdown' | 'text',
        maxConcurrency,
      };

      if (options.verbose) {
        Logger.info(
          `Running ${agent} (${provider}) with threshold ${threshold}`,
        );
      }

      // Initialize evaluation executor
      const executor = new EvaluationExecutor(scoringService, evaluationConfig);

      // Run evaluation
      await executor.evaluateFromDirectory(
        heboAgent,
        join(process.cwd(), options.directory ?? 'examples'),
        options.stopOnError,
      );

      Logger.info('Evaluation completed');
    } catch (error) {
      Logger.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

/**
 * Run the CLI - only called when this module is run directly
 */
export const run = () => {
  program.parse();
};

run();
