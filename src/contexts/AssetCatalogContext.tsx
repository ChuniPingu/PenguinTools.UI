import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { EMPTY_CATALOG, loadAssetCatalog, type AssetCatalog } from "@/lib/asset-catalog";
import { useApp } from "@/contexts/AppContext";
import { isTauriRuntime, type RuntimeInfo } from "@/lib/tauri-cli";

interface AssetCatalogContextValue {
  catalog: AssetCatalog;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AssetCatalogContext = createContext<AssetCatalogContextValue | null>(null);

export function AssetCatalogProvider({
  runtimeInfo,
  children,
}: Readonly<{
  runtimeInfo: RuntimeInfo | null;
  children: ReactNode;
}>) {
  const [catalog, setCatalog] = useState<AssetCatalog>(EMPTY_CATALOG);
  const [isLoading, setIsLoading] = useState(false);

  const { notifyError } = useApp();
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    if (!isTauriRuntime() || !runtimeInfo) {
      setCatalog(EMPTY_CATALOG);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await loadAssetCatalog(runtimeInfo.assetsDir, runtimeInfo.userDataDir);
      if (request !== generation.current) return;
      setCatalog(result.catalog);
      for (const error of result.errors) notifyError(error);
    } catch (error) {
      if (request === generation.current)
        notifyError(error instanceof Error ? error.message : String(error));
    } finally {
      if (request === generation.current) setIsLoading(false);
    }
  }, [notifyError, runtimeInfo]);

  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      catalog,
      isLoading,
      refresh,
    }),
    [catalog, isLoading, refresh],
  );

  return <AssetCatalogContext.Provider value={value}>{children}</AssetCatalogContext.Provider>;
}

export function useAssetCatalog() {
  const context = useContext(AssetCatalogContext);
  if (!context) throw new Error("useAssetCatalog must be used within AssetCatalogProvider");
  return context;
}
