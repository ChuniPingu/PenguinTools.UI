import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface TerminalOutputProps {
  lines: string[];
  className?: string;
  autoScroll?: boolean;
  showPrompt?: boolean;
}

export function TerminalOutput({
  lines,
  className,
  autoScroll = false,
  showPrompt = true,
}: TerminalOutputProps) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const output = lines.join("\n");

  useEffect(() => {
    if (!autoScroll || !viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [autoScroll, lines, showPrompt]);

  return (
    <div
      ref={viewportRef}
      className={cn(
        "terminal-output-viewport h-full min-h-0 overflow-auto bg-zinc-950 font-mono text-xs leading-relaxed text-zinc-100",
        className,
      )}
    >
      <pre
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t("ui.statusBar.cliOutputAriaLabel")}
        className="min-w-max p-4 whitespace-pre"
      >
        {output}
        {showPrompt ? (
          <>
            {output ? "\n" : null}
            <span className="inline-flex items-center">
              {"> "}
              <span
                aria-hidden="true"
                className="terminal-cursor inline-block h-[1em] w-[0.55em] animate-terminal-cursor-blink bg-current"
              />
            </span>
          </>
        ) : null}
      </pre>
    </div>
  );
}
