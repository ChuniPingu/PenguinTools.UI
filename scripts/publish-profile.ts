export const PUBLISH_PROFILES = {
  aot: "WinX64-NativeAOT",
  fdd: "WinX64",
} as const;

export type PublishProfileAlias = keyof typeof PUBLISH_PROFILES;

export function resolvePublishProfile(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): { alias: PublishProfileAlias; profile: string } {
  const flagIndex = argv.findIndex((arg) => arg === "--profile" || arg.startsWith("--profile="));
  let raw: string | undefined;

  if (flagIndex >= 0) {
    const arg = argv[flagIndex]!;
    raw = arg.startsWith("--profile=") ? arg.slice("--profile=".length) : argv[flagIndex + 1];
  }

  raw ??= env.PENGUIN_TOOLS_PUBLISH_PROFILE ?? "aot";
  const alias = raw.trim().toLowerCase() as PublishProfileAlias;

  if (!(alias in PUBLISH_PROFILES)) {
    throw new Error(
      `Unknown publish profile '${raw}'. Use --profile aot|fdd or PENGUIN_TOOLS_PUBLISH_PROFILE=aot|fdd.`,
    );
  }

  return { alias, profile: PUBLISH_PROFILES[alias] };
}

export function forwardProfileArgs(argv: string[] = process.argv.slice(2)): string[] {
  const forwarded: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--profile") {
      const value = argv[i + 1];
      if (value) {
        forwarded.push("--profile", value);
        i++;
      }
      continue;
    }
    if (arg.startsWith("--profile=")) {
      forwarded.push(arg);
    }
  }
  return forwarded;
}
