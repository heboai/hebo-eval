import { readFile, readdir } from 'fs/promises';
import { join, extname, basename } from 'path';
import { Parser } from './parser';
import { TestCase } from '../core/types/message.types';

/**
 * Result of loading test cases
 */
export interface LoadResult {
  /**
   * Successfully loaded test cases
   */
  testCases: TestCase[];

  /**
   * Errors encountered during loading
   */
  errors: {
    /**
     * The file path where the error occurred
     */
    filePath: string;

    /**
     * The error message
     */
    message: string;
  }[];
}

/**
 * Loader for test case files
 */
export class TestCaseLoader {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Loads test cases from a directory
   * @param directoryPath The path to the directory containing test case files
   * @param stopOnError Whether to stop processing files after the first error (default: true)
   * @returns Promise that resolves with the load result
   */
  public async loadFromDirectory(
    directoryPath: string,
    stopOnError: boolean = true,
  ): Promise<LoadResult> {
    const result: LoadResult = {
      testCases: [],
      errors: [],
    };

    try {
      const files = await this.getTestFiles(directoryPath);

      for (const file of files) {
        try {
          const testCase = await this.loadFile(file);
          result.testCases.push(testCase);
        } catch (error) {
          result.errors.push({
            filePath: file,
            message:
              error instanceof Error ? error.message : 'Unknown error occurred',
          });
          if (stopOnError) {
            return result;
          }
          // Continue processing remaining files if stopOnError is false
        }
      }
    } catch (error) {
      // If we can't read the directory, add it as an error
      result.errors.push({
        filePath: directoryPath,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }

    return result;
  }

  /**
   * Gets all test files from a directory recursively
   * @param directoryPath The path to the directory
   * @returns Promise that resolves with an array of file paths
   * @throws Error if the directory cannot be read
   */
  private async getTestFiles(directoryPath: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const entries = await readdir(directoryPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(directoryPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getTestFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && extname(entry.name) === '.txt') {
          files.push(fullPath);
        }
      }

      return files;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Cannot read directory: ${directoryPath}. ${errorMessage}`,
      );
    }
  }

  /**
   * Loads a single test case file
   * @param filePath The path to the test case file
   * @returns Promise that resolves with the parsed test case
   */
  private async loadFile(filePath: string): Promise<TestCase> {
    const content = await readFile(filePath, 'utf-8');
    const name = this.getTestCaseName(filePath);
    return this.parser.parse(content, name);
  }

  /**
   * Gets the test case name from a file path
   * @param filePath The path to the test case file
   * @returns The test case name
   */
  private getTestCaseName(filePath: string): string {
    return basename(filePath, '.txt');
  }
}
