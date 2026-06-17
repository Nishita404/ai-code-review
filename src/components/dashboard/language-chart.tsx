"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

export type LanguagePoint = {
  language: string;
  count: number;
};

const COLORS = [
  "#34d399", "#60a5fa", "#f59e0b", "#a78bfa",
  "#fb7185", "#22d3ee", "#fb923c", "#a3e635",
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2 text-xs shadow-xl">
      <span className="font-medium text-white">{item.value} review{item.value === 1 ? "" : "s"}</span>
    </div>
  );
}

export function LanguageChart({ data }: { data: LanguagePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-600">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#475569", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="language"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="count" name="Reviews" radius={[0, 3, 3, 0]} maxBarSize={14}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
