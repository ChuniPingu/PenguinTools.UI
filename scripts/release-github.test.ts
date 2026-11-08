import { describe, expect, it, vi } from "vite-plus/test";
import { createUpdaterManifest, publishRelease, resolveReleaseIdentity } from "./release-github";

const repository = "ChuniPingu/PenguinTools.UI";
const release = {
  repository,
  tag: "v2.5.4",
  title: "PenguinTools.UI v2.5.4",
  notes: "UI release notes",
  assetPaths: ["installer.exe", "installer.exe.sig", "latest.json"],
  exists: false,
  draft: false,
  prerelease: false,
  clobber: false,
};

describe("release versions", () => {
  it("uses the UI version independently of the bundled CLI", () => {
    expect(resolveReleaseIdentity("2.5.4", "v2.5.4")).toEqual({
      tag: "v2.5.4",
      title: "PenguinTools.UI v2.5.4",
    });
  });

  it("rejects unrelated tags and invalid versions before deriving artifact paths", () => {
    expect(() => resolveReleaseIdentity("2.5.4", "v2.5.3")).toThrow("UI release tag");
    for (const version of ["", "../main", "2.5", "2.5.4/extra"]) {
      expect(() => resolveReleaseIdentity(version)).toThrow("UI version");
    }
  });
});

describe("updater download locations", () => {
  it("downloads from the UI repository and UI tag", () => {
    const manifest = createUpdaterManifest({
      version: "2.5.4",
      notes: "UI fixes",
      installerName: "PenguinTools_2.5.4_x64-setup.exe",
      signature: "signed\n",
      publicBase: `https://github.com/${repository}/releases/download/`,
      downloadTag: "v2.5.4",
    });
    expect(manifest.version).toBe("2.5.4");
    expect(manifest.platforms["windows-x86_64"]).toEqual({
      signature: "signed",
      url: "https://github.com/ChuniPingu/PenguinTools.UI/releases/download/v2.5.4/PenguinTools_2.5.4_x64-setup.exe",
    });
  });

  it("keeps mirror downloads on the existing object-storage endpoint", () => {
    expect(
      createUpdaterManifest({
        version: "2.5.4",
        notes: "",
        installerName: "UI setup.exe",
        signature: "signed",
        publicBase: "https://releases.example.com/penguin-tools",
        downloadTag: "v2.5.4",
      }).platforms["windows-x86_64"].url,
    ).toBe("https://releases.example.com/penguin-tools/v2.5.4/UI%20setup.exe");
  });
});

describe("GitHub publishing", () => {
  it("stages UI assets and finishes the mirror before publishing a stable release", async () => {
    const events: string[] = [];
    const run = vi.fn(async (args: string[]) => {
      expect(args[args.indexOf("--repo") + 1]).toBe(repository);
      events.push(args[1]);
    });
    await publishRelease(release, run, async () => {
      events.push("mirror");
    });
    expect(events).toEqual(["create", "mirror", "edit"]);
    expect(run.mock.calls[0][0]).toEqual([
      "release",
      "create",
      release.tag,
      ...release.assetPaths,
      "--repo",
      repository,
      "--title",
      release.title,
      "--verify-tag",
      "--draft",
      "--prerelease=false",
      "--notes",
      release.notes,
    ]);
    expect(run.mock.calls[1][0]).toContain("--draft=false");
  });

  it("uploads replacements before publishing an existing draft, using notes files", async () => {
    const run = vi.fn<(args: string[]) => Promise<void>>().mockResolvedValue(undefined);
    await publishRelease({ ...release, exists: true, notesFile: "notes.md", clobber: true }, run);
    expect(run.mock.calls[0][0]).toEqual([
      "release",
      "upload",
      release.tag,
      ...release.assetPaths,
      "--repo",
      repository,
      "--clobber",
    ]);
    expect(run.mock.calls[1][0]).toEqual([
      "release",
      "edit",
      release.tag,
      "--repo",
      repository,
      "--title",
      release.title,
      "--draft=false",
      "--prerelease=false",
      "--notes-file",
      "notes.md",
    ]);
  });

  it.each([
    { draft: true, prerelease: false },
    { draft: false, prerelease: true },
  ])("keeps $draft drafts / $prerelease prereleases out of the stable mirror", async (flags) => {
    const run = vi.fn<(args: string[]) => Promise<void>>().mockResolvedValue(undefined);
    const mirror = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    await publishRelease({ ...release, ...flags }, run, mirror);
    expect(mirror).not.toHaveBeenCalled();
    expect(run.mock.calls[1][0]).toContain(`--draft=${flags.draft}`);
    expect(run.mock.calls[1][0]).toContain(`--prerelease=${flags.prerelease}`);
  });

  it("leaves the new release as a draft when mirroring fails", async () => {
    const run = vi.fn<(args: string[]) => Promise<void>>().mockResolvedValue(undefined);
    await expect(
      publishRelease(release, run, async () => {
        throw new Error("Mirror failed");
      }),
    ).rejects.toThrow("Mirror failed");
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0]).toContain("--draft");
  });

  it("stops before mirroring or publishing when an asset upload fails", async () => {
    const run = vi
      .fn<(args: string[]) => Promise<void>>()
      .mockRejectedValue(new Error("Upload failed"));
    const mirror = vi.fn<() => Promise<void>>();
    await expect(
      publishRelease({ ...release, exists: true, clobber: true }, run, mirror),
    ).rejects.toThrow("Upload failed");
    expect(run).toHaveBeenCalledTimes(1);
    expect(mirror).not.toHaveBeenCalled();
  });
});
