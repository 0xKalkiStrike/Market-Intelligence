import { Card, CardBody } from "@/components/ui/Card";

const iconMap: Record<string, { icon: string; bg: string }> = {
  "Total Projects": { icon: "📁", bg: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  "Total Products": { icon: "📦", bg: "bg-blue-50 text-blue-600 border-blue-100" },
  "Verified Products": { icon: "✅", bg: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  "Failed Products": { icon: "⚠️", bg: "bg-rose-50 text-rose-600 border-rose-100" },
  "Active Jobs": { icon: "⚡", bg: "bg-amber-50 text-amber-600 border-amber-100" },
  "Queued Jobs": { icon: "⏳", bg: "bg-slate-100 text-slate-600 border-slate-200" },
  "Monitoring Tasks": { icon: "🌐", bg: "bg-purple-50 text-purple-600 border-purple-100" },
  "Healthy Workers": { icon: "💻", bg: "bg-cyan-50 text-cyan-600 border-cyan-100" },
  "Failed Executions": { icon: "🚫", bg: "bg-rose-50 text-rose-600 border-rose-100" },
  "Avg Market Price": { icon: "🏷️", bg: "bg-emerald-50 text-emerald-600 border-emerald-100" },
};

export function StatCard({ label, value, trend }: { label: string; value: string | number; trend?: string }) {
  const meta = iconMap[label] || { icon: "📊", bg: "bg-slate-50 text-slate-600 border-slate-100" };

  return (
    <Card className="hover:border-indigo-200 hover:shadow-md transition-all duration-200 group">
      <CardBody className="flex flex-col justify-between h-full p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors">
            {label}
          </span>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm shrink-0 shadow-2xs ${meta.bg}`}>
            {meta.icon}
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
          {trend && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {trend}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

