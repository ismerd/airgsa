import { Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MapboxPlaceholder() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Mapbox lane intelligence</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-72 overflow-hidden rounded-md border border-cyan-300/20 bg-[#0A1F44]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] bg-[size:34px_34px]" />
          <div className="absolute left-[18%] top-[48%] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_30px_8px_rgba(0,174,239,.45)]" />
          <div className="absolute right-[24%] top-[30%] h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_30px_8px_rgba(110,231,183,.35)]" />
          <div className="absolute left-[18%] top-[48%] h-px w-[58%] origin-left -rotate-12 bg-cyan-300/70" />
          <div className="absolute inset-x-6 bottom-6 flex items-center justify-between rounded-md border border-white/10 bg-slate-950/80 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Placeholder map layer</p>
              <p className="text-xs text-white/60">Ready for Mapbox token, lane overlays, and station coverage.</p>
            </div>
            <Map className="h-8 w-8 text-white/80" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

