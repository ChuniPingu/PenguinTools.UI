import type { CliResponse } from "@/lib/cli-types";

interface CliJob {
  promise: Promise<CliResponse | null>;
  resolve: (result: CliResponse | null) => void;
  result: CliResponse | null;
  onResult?: (result: CliResponse) => void;
}

/** Owns the single CLI job until the native process reports completion. */
export class CliJobs {
  private active: CliJob | null = null;

  begin(onResult?: (result: CliResponse) => void): CliJob | null {
    if (this.active) return null;
    let resolve!: CliJob["resolve"];
    const promise = new Promise<CliResponse | null>((complete) => {
      resolve = complete;
    });
    this.active = { promise, resolve, result: null, onResult };
    return this.active;
  }

  record(result: CliResponse) {
    const job = this.active;
    if (!job) return;
    job.result = result;
    const callback = job.onResult;
    job.onResult = undefined;
    callback?.(result);
  }

  finish(): CliResponse | null {
    const job = this.active;
    if (!job) return null;
    this.active = null;
    job.resolve(job.result);
    return job.result;
  }

  fail(job: CliJob): boolean {
    if (this.active !== job) return false;
    this.active = null;
    job.resolve(null);
    return true;
  }
}
