import { useEffect } from "react";
import { AppListerModule } from "@/modules/app-lister-module";
import { useAppStore, type DeviceApp } from "@/stores/useAppStore";

/**
 * useAppDiscovery
 * ═══════════════════════════════════════════════
 * Hook to land at (main)/commits.tsx and fetch apps.
 */
export function useAppDiscovery() {
  const setApps = useAppStore((s) => s.setApps);
  const apps = useAppStore((s) => s.apps);

  useEffect(() => {
    // Basic sync logic: Fetch if empty
    if (apps.length === 0) {
      console.log("[AppDiscovery] Fetching PNG icons from native bridge...");
      
      AppListerModule.getInstalledApps()
        .then((realApps) => {
          // Cast/map to store type
          const storeApps: DeviceApp[] = realApps.map(a => ({
            id: a.id,
            name: a.name,
            iconUri: a.iconUri
          }));

          setApps(storeApps);
          console.log(`[AppDiscovery] Success. Loaded ${storeApps.length} apps.`);
          
          // Debug log first 3 apps
          if (storeApps.length > 0) {
            console.log("[AppDiscovery] Sample Data:", storeApps.slice(0, 3));
          }
        })
        .catch((err) => {
          console.error("[AppDiscovery] Failed to fetch apps:", err);
        });
    }
  }, [apps.length]);
}
