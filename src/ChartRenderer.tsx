import React, { useMemo } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ChartProps {
  data: any[];
  type?: 'bar' | 'line' | 'pie' | 'area';
  xAxisKey?: string;
  series: { key: string; color?: string; name?: string }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const ChartRenderer: React.FC<{ code: string }> = ({ code }) => {
  const config = useMemo(() => {
    try {
      const parsed = JSON.parse(code) as ChartProps;
      return parsed;
    } catch (e) {
      return null;
    }
  }, [code]);

  if (!config || !config.data || !Array.isArray(config.data)) {
    return <div className="p-4 bg-red-50 text-red-500 rounded border border-red-200">Invalid chart JSON data</div>;
  }

  const { type = 'bar', data, xAxisKey, series = [] } = config;

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
            {xAxisKey && <XAxis dataKey={xAxisKey} fontSize={12} />}
            <YAxis fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            {series.length > 1 && <Legend />}
            {series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name || s.key} stroke={s.color || COLORS[i % COLORS.length]} strokeWidth={2} />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
            {xAxisKey && <XAxis dataKey={xAxisKey} fontSize={12} />}
            <YAxis fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            {series.length > 1 && <Legend />}
            {series.map((s, i) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.name || s.key} fill={s.color || COLORS[i % COLORS.length]} stroke={s.color || COLORS[i % COLORS.length]} fillOpacity={0.3} />
            ))}
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend />
            {series.map((s, i) => (
              <Pie key={s.key} data={data} dataKey={s.key} nameKey={xAxisKey || 'name'} cx="50%" cy="50%" outerRadius={80} fill={s.color || COLORS[i % COLORS.length]} label>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            ))}
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
            {xAxisKey && <XAxis dataKey={xAxisKey} fontSize={12} />}
            <YAxis fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            {series.length > 1 && <Legend />}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name || s.key} fill={s.color || COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="w-full h-64 my-6 bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm print:break-inside-avoid">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
