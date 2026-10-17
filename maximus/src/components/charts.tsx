"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export type Series = { key: string; label: string; color?: "1" | "2"; dashed?: boolean };
type Datum = Record<string, string | number | null>;

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--chart-axis)", fontSize: 12 },
} as const;

function ChartTooltip({ active, payload, label, series, format }: {
  active?: boolean; payload?: { dataKey?: string | number; value?: number }[]; label?: string;
  series: Series[]; format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-elevated px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium text-fg">{label}</p>
      {payload.map((p) => {
        const s = series.find((x) => x.key === p.dataKey);
        return (
          <p key={String(p.dataKey)} className="flex items-center gap-2 text-fg-muted">
            <span className="inline-block size-2.5 rounded-full" style={{ background: `var(--chart-${s?.color ?? "1"})` }} aria-hidden />
            {s?.label}: <span className="font-semibold tabular-nums text-fg">{format(Number(p.value ?? 0))}</span>
          </p>
        );
      })}
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="mb-2 flex flex-wrap gap-4 text-xs text-fg-muted">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: `var(--chart-${s.color ?? "1"})`, opacity: s.dashed ? 0.7 : 1 }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/** Accessible data table behind every chart (visually hidden). */
function DataTable({ data, xKey, series, format, caption }: { data: Datum[]; xKey: string; series: Series[]; format: (v: number) => string; caption: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr><th scope="col">{xKey}</th>{series.map((s) => <th key={s.key} scope="col">{s.label}</th>)}</tr></thead>
      <tbody>
        {data.map((d, i) => (
          <tr key={i}><th scope="row">{String(d[xKey])}</th>{series.map((s) => <td key={s.key}>{format(Number(d[s.key] ?? 0))}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

type ChartProps = {
  data: Datum[];
  xKey: string;
  series: Series[];
  caption: string;
  height?: number;
  /** Server components can't pass functions to client components, so formats are named. */
  valueFormat?: "number" | "money";
};

const FORMATS = {
  number: (v: number) => new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(v),
  money: (v: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", notation: "compact", maximumFractionDigits: 1 }).format(v),
};

export function TrendArea({ data, xKey, series, caption, height = 220, valueFormat = "number" }: ChartProps) {
  const format = FORMATS[valueFormat];
  return (
    <figure>
      <Legend series={series} />
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`mx-area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={`var(--chart-${s.color ?? "1"})`} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={`var(--chart-${s.color ?? "1"})`} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} tickFormatter={format} width={48} allowDecimals={false} />
            <Tooltip content={<ChartTooltip series={series} format={format} />} cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }} />
            {series.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} stroke={`var(--chart-${s.color ?? "1"})`} strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined} fill={`url(#mx-area-${s.key})`}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} dot={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <DataTable data={data} xKey={xKey} series={series} format={format} caption={caption} />
    </figure>
  );
}

export function TrendBars({ data, xKey, series, caption, height = 220, valueFormat = "number" }: ChartProps) {
  const format = FORMATS[valueFormat];
  return (
    <figure>
      <Legend series={series} />
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} tickFormatter={format} width={48} allowDecimals={false} />
            <Tooltip content={<ChartTooltip series={series} format={format} />} cursor={{ fill: "var(--surface-muted)" }} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={`var(--chart-${s.color ?? "1"})`} radius={[4, 4, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable data={data} xKey={xKey} series={series} format={format} caption={caption} />
    </figure>
  );
}

export function TrendLines({ data, xKey, series, caption, height = 220, valueFormat = "number" }: ChartProps) {
  const format = FORMATS[valueFormat];
  return (
    <figure>
      <Legend series={series} />
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} tickFormatter={format} width={48} allowDecimals={false} />
            <Tooltip content={<ChartTooltip series={series} format={format} />} cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }} />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={`var(--chart-${s.color ?? "1"})`} strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)", fill: `var(--chart-${s.color ?? "1"})` }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--surface)" }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable data={data} xKey={xKey} series={series} format={format} caption={caption} />
    </figure>
  );
}
