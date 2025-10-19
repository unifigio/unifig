export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  info(message: string): void {
    console.log(message);
  }

  warn(message: string): void {
    console.warn(`Warning: ${message}`);
  }

  error(message: string): void {
    console.error(`Error: ${message}`);
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(`[DEBUG] ${message}`);
    }
  }
}