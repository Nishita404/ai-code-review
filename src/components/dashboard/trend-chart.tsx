"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export type TrendPoint = {
  date: string;   // "Jan 1"
  reviews: number;
  avgScore: number | null;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-slate-300">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-medium text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-600">
        Not enough data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#475569", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="reviews"
          orientation="left"
          tick={{ fill: "#475569", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          yAxisId="score"
          orientation="right"
          domain={[0, 100]}
          tick={{ fill: "#475569", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Legend
          wrapperStyle={{ fontSize: "10px", paddingTop: "12px", color: "#64748b" }}
          iconType="circle"
          iconSize={6}
        />
        <Bar
          yAxisId="reviews"
          dataKey="reviews"
          name="Reviews"
          fill="rgba(255,255,255,0.08)"
          radius={[2, 2, 0, 0]}
          maxBarSize={20}
        />
        <Area
          yAxisId="score"
          type="monotone"
          dataKey="avgScore"
          name="Avg score"
          stroke="#34d399"
          strokeWidth={1.5}
          fill="url(#scoreGrad)"
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
