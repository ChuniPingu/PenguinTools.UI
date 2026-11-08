import { runCli, subscribeCliEvents } from "@/lib/tauri-cli";

export function openCliConnection(handlers: Parameters<typeof subscribeCliEvents>[0]) {
  let disposed = false;
  let unsubscribe: (() => void) | undefined;
  const ready = subscribeCliEvents({
    onLine: (line) => {
      if (!disposed) handlers.onLine(line);
    },
    onFinished: (payload) => {
      if (!disposed) handlers.onFinished(payload);
    },
  }).then((stop) => {
    if (disposed) stop();
    else unsubscribe = stop;
  });
  return {
    ready,
    async run(args: string[]) {
      await ready;
      if (!disposed) await runCli(args);
    },
    dispose() {
      disposed = true;
      unsubscribe?.();
      unsubscribe = undefined;
    },
  };
}
