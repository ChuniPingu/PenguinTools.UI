import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import type { KeyboardEvent, MouseEvent } from "react";
import { MemoryRouter, type LinkProps } from "react-router-dom";
import i18n from "@/i18n";
import type { MessageDescriptor } from "@/lib/cli-types";
import { resolveMessage } from "@/lib/messages";
import { DiagnosticMessage } from "./DiagnosticMessage";

const linkState = vi.hoisted(() => ({ props: undefined as LinkProps | undefined }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    Link: (props: LinkProps) => {
      linkState.props = props;
      return <actual.Link {...props} />;
    },
  };
});

afterEach(async () => {
  linkState.props = undefined;
  await i18n.changeLanguage("en");
});

function render(message: MessageDescriptor, onNavigate = vi.fn()) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DiagnosticMessage message={message} onNavigate={onNavigate} />
    </MemoryRouter>,
  );
}

function missingAsset(catalog: unknown, id = "123"): MessageDescriptor {
  return { key: "diag.mg.string_id_not_found", args: { arg0: id, arg1: catalog } };
}

describe.each(["en", "zh-Hans"])("asset diagnostics in %s", (language) => {
  it.each([
    ["genreNames", "genre", "流派", "Genre"],
    ["notesFieldLine", "fieldLine", "轨道线", "Field line"],
    ["stageName", "stage", "背景", "Stage"],
    ["worldsEndTagName", "weTag", "WORLD'S END", "WORLD'S END"],
  ])("links %s to its category with a localized name", async (catalog, path, zh, en) => {
    await i18n.changeLanguage(language);
    const message = missingAsset(catalog);
    const markup = render(message);
    expect(markup).toContain(`href="/assets/${path}"`);
    expect(markup).toContain("underline");
    expect(markup).toContain(language === "zh-Hans" ? ">素材库</a>" : ">Assets</a>");
    expect(resolveMessage(message)).toContain(language === "zh-Hans" ? zh : en);
    expect(resolveMessage(message)).toContain(language === "zh-Hans" ? "素材 ID" : "Asset ID");
    expect(resolveMessage(message)).not.toContain(catalog);
    expect(message.args?.arg1).toBe(catalog);
  });
});

it("supports numeric argument keys", () => {
  expect(
    render({ key: "diag.mg.string_id_not_found", args: { "0": "7", "1": "stageName" } }),
  ).toContain('href="/assets/stage"');
});

it("falls back to the assets page for unknown catalog names and escapes file data", () => {
  const markup = render(missingAsset("unknown", '<a href="/other">Assets</a>'));
  expect(markup).toContain('href="/assets/genre"');
  expect(markup).toContain("&lt;a");
  expect(markup.match(/<a\s/g)).toHaveLength(1);
});

it("does not add a link to unrelated diagnostics", () => {
  const markup = render({ key: "diag.error.file_not_found" });
  expect(markup).not.toContain("<a ");
});

it("closes the diagnostic panel on normal navigation without selecting the row", () => {
  const onNavigate = vi.fn();
  render(missingAsset("stageName"), onNavigate);
  const stopPropagation = vi.fn();
  linkState.props?.onClick?.({
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    stopPropagation,
  } as unknown as MouseEvent<HTMLAnchorElement>);
  expect(stopPropagation).toHaveBeenCalledOnce();
  expect(onNavigate).toHaveBeenCalledOnce();
});

it("does not close the panel for a modified link click", () => {
  const onNavigate = vi.fn();
  render(missingAsset("stageName"), onNavigate);
  linkState.props?.onClick?.({
    button: 0,
    ctrlKey: true,
    stopPropagation: vi.fn(),
  } as unknown as MouseEvent<HTMLAnchorElement>);
  expect(onNavigate).not.toHaveBeenCalled();
});

it("keeps the row's keyboard handler from consuming link activation", () => {
  render(missingAsset("stageName"));
  const stopPropagation = vi.fn();
  const preventDefault = vi.fn();
  linkState.props?.onKeyDown?.({
    key: "Enter",
    stopPropagation,
    preventDefault,
  } as unknown as KeyboardEvent<HTMLAnchorElement>);
  expect(stopPropagation).toHaveBeenCalledOnce();
  expect(preventDefault).not.toHaveBeenCalled();
});
