/**
 * Error thrown when parsing fails
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public lineNumber?: number,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}
