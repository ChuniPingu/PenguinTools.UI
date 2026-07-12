import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadAssetCatalog, type AssetCatalog } from "@/lib/asset-catalog";
import { isTauriRuntime, type RuntimeInfo } from "@/lib/tauri-cli";

const EMPTY: AssetCatalog = {
  genreNames: [],
  fieldLines: [],
  stageNames: [],
  weTagNames: [],
  hasUserAssets: false,
};

interface AssetCatalogContextValue {
  catalog: AssetCatalog;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AssetCatalogContext = createContext<AssetCatalogContextValue | null>(null);

export function AssetCatalogProvider({
  runtimeInfo,
  children,
}: {
  runtimeInfo: RuntimeInfo | null;
  children: ReactNode;
}) {
  const [catalog, setCatalog] = useState<AssetCatalog>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isTauriRuntime() || !runtimeInfo) {
      setCatalog(EMPTY);
      return;
    }
    setIsLoading(true);
    try {
      setCatalog(await loadAssetCatalog(runtimeInfo.assetsDir, runtimeInfo.userDataDir));
    } catch {
      setCatalog(EMPTY);
    } finally {
      setIsLoading(false);
    }
  }, [runtimeInfo]);

  useEffect(() => {
    void refresh();
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
