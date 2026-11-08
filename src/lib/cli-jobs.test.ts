import { describe, expect, it, vi } from "vite-plus/test";
import { CliJobs } from "@/lib/cli-jobs";
import type { CliResponse } from "@/lib/cli-types";

const response: CliResponse = {
  type: "result",
  schemaVersion: 4,
  operation: "info",
  success: true,
  exitCode: 0,
  diagnostics: [],
};

describe("CliJobs", () => {
  it("reserves the job through result delivery until native completion", async () => {
    const jobs = new CliJobs();
    const callback = vi.fn();
    const job = jobs.begin(callback)!;
    expect(jobs.begin()).toBeNull();
    const settled = vi.fn();
    void job.promise.then(settled);
    jobs.record(response);
    await Promise.resolve();
    expect(callback).toHaveBeenCalledExactlyOnceWith(response);
    expect(settled).not.toHaveBeenCalled();
    expect(jobs.begin()).toBeNull();
    expect(jobs.finish()).toBe(response);
    await expect(job.promise).resolves.toBe(response);
    expect(jobs.begin()).not.toBeNull();
    jobs.finish();
  });

  it("ignores a late launch failure from an older job", async () => {
    const jobs = new CliJobs();
    const old = jobs.begin()!;
    jobs.finish();
    const current = jobs.begin()!;
    expect(jobs.fail(old)).toBe(false);
    expect(jobs.begin()).toBeNull();
    jobs.record(response);
    jobs.finish();
    await expect(current.promise).resolves.toBe(response);
  });

  it("retains the result when the application callback throws", async () => {
    const jobs = new CliJobs();
    const callback = vi.fn(() => {
      throw new Error("Callback failed");
    });
    const job = jobs.begin(callback)!;
    expect(() => jobs.record(response)).toThrow("Callback failed");
    jobs.record(response);
    expect(callback).toHaveBeenCalledOnce();
    jobs.finish();
    await expect(job.promise).resolves.toBe(response);
  });

  it("settles launch failures and permits another job", async () => {
    const jobs = new CliJobs();
    const job = jobs.begin()!;
    expect(jobs.fail(job)).toBe(true);
    await expect(job.promise).resolves.toBeNull();
    expect(jobs.begin()).not.toBeNull();
    jobs.finish();
  });
});
