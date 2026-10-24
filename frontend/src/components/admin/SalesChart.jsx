import { useTheme } from '@mui/material/styles';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { bucketTooltip, formatBucket } from '../../utils/dates';
import { peso } from '../../utils/format';

const compactPeso = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', notation: 'compact', maximumFractionDigits: 1,
});

// data: [{ date, revenue, orders, units }]  metric: 'revenue' | 'orders'  chartType: 'line' | 'bar'
export default function SalesChart({ data, groupBy, metric, chartType }) {
  const theme = useTheme();
  const isRevenue = metric === 'revenue';
  const color = isRevenue ? theme.palette.primary.main : theme.palette.secondary.main;
  const name = isRevenue ? 'Revenue' : 'Orders';

  const shared = [
    <CartesianGrid key="grid" strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />,
    <XAxis key="x" dataKey="date" tickFormatter={(k) => formatBucket(k, groupBy)} minTickGap={24} tickMargin={8} />,
    <YAxis
      key="y"
      width={70}
      allowDecimals={false}
      tickFormatter={(v) => (isRevenue ? compactPeso.format(v) : v)}
    />,
    <Tooltip
      key="tip"
      formatter={(v) => [isRevenue ? peso(v) : Number(v).toLocaleString(), name]}
      labelFormatter={(k) => bucketTooltip(k, groupBy)}
    />,
  ];
  const margin = { top: 8, right: 16, bottom: 0, left: 0 };

  return (
    <ResponsiveContainer width="100%" height={320}>
      {chartType === 'bar' ? (
        <BarChart data={data} margin={margin}>
          {shared}
          <Bar dataKey={metric} name={name} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={data} margin={margin}>
          {shared}
          <Line
            type="monotone"
            dataKey={metric}
            name={name}
            stroke={color}
            strokeWidth={2.5}
            dot={data.length <= 31}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}