import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert,
  Button,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import SalesChart from './SalesChart';
import { fetchSalesReport } from '../../store/actions/reportActions';
import { downloadSalesCsv } from '../../api/reports';
import { saveBlob } from '../../utils/download';
import { MAX_RANGE_DAYS, PRESETS, addDaysISO, autoGroupBy, diffDaysISO, todayISO } from '../../utils/dates';
import { peso } from '../../utils/format';

function Delta({ current, previous }) {
  if (!previous)
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        No sales in the previous period
      </Typography>
    );
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={up ? 'success' : 'error'}
      label={`${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}% vs previous period`}
    />
  );
}

function Stat({ label, value, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {value}
      </Typography>
      {children}
    </Paper>
  );
}

export default function SalesPanel() {
  const dispatch = useDispatch();
  const { sales, salesLoading, salesError } = useSelector((s) => s.reports);

  const today = todayISO();
  const [range, setRange] = useState(() => ({ from: addDaysISO(today, -29), to: today }));
  const [groupBy, setGroupBy] = useState('day');
  const [metric, setMetric] = useState('revenue');
  const [chartType, setChartType] = useState('line');
  const [exporting, setExporting] = useState(false);

  const span = diffDaysISO(range.from, range.to) + 1;
  const rangeError =
    !range.from || !range.to
      ? 'Choose both dates'
      : range.from > range.to
        ? 'The start date must be on or before the end date'
        : span > MAX_RANGE_DAYS
          ? 'Choose a range of at most 2 years'
          : '';

  const applyRange = (from, to) => {
    setRange({ from, to });
    if (from && to && from <= to) setGroupBy(autoGroupBy(from, to)); // pick a readable granularity
  };

  useEffect(() => {
    if (!rangeError) dispatch(fetchSalesReport({ from: range.from, to: range.to, groupBy }));
  }, [dispatch, range.from, range.to, groupBy, rangeError]);

  const activePreset = PRESETS.find((p) => {
    const [f, t] = p.range(today);
    return f === range.from && t === range.to;
  })?.key;

  const handleExport = async () => {
    setExporting(true);
    try {
      saveBlob(
        await downloadSalesCsv({ from: range.from, to: range.to, groupBy }),
        `sales-${range.from}_to_${range.to}.csv`
      );
    } catch {
      toast.error('Could not export the report');
    } finally {
      setExporting(false);
    }
  };

  const t = sales?.totals;
  const prev = sales?.previous;

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}
      >
        <div>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Sales
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Orders placed in the period, excluding cancelled orders.
          </Typography>
        </div>
        <Button variant="outlined" size="small" onClick={handleExport} disabled={!!rangeError || exporting || !sales}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </Stack>

      {/* range controls */}
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {PRESETS.map((p) => (
          <Chip
            key={p.key}
            label={p.label}
            clickable
            color={activePreset === p.key ? 'primary' : 'default'}
            variant={activePreset === p.key ? 'filled' : 'outlined'}
            onClick={() => applyRange(...p.range(today))}
          />
        ))}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, mb: 2 }}>
        <TextField
          size="small"
          type="date"
          label="From"
          value={range.from}
          onChange={(e) => applyRange(e.target.value, range.to)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={range.to}
          onChange={(e) => applyRange(range.from, e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
        />
        <TextField
          select
          size="small"
          label="Group by"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="day">Day</MenuItem>
          <MenuItem value="week">Week</MenuItem>
          <MenuItem value="month">Month</MenuItem>
        </TextField>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={metric}
          onChange={(_, v) => v && setMetric(v)}
          aria-label="Metric"
        >
          <ToggleButton value="revenue">Revenue</ToggleButton>
          <ToggleButton value="orders">Orders</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={chartType}
          onChange={(_, v) => v && setChartType(v)}
          aria-label="Chart type"
        >
          <ToggleButton value="line">Line</ToggleButton>
          <ToggleButton value="bar">Bar</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {rangeError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {rangeError}
        </Alert>
      )}
      {salesError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {salesError}
        </Alert>
      )}
      {salesLoading && <LinearProgress sx={{ mb: 1 }} />}

      {sales && !rangeError && (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stat label="Revenue" value={peso(t.revenue)}>
                <div>
                  <Delta current={t.revenue} previous={prev.revenue} />
                </div>
              </Stat>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stat label="Orders" value={t.orders.toLocaleString()}>
                <div>
                  <Delta current={t.orders} previous={prev.orders} />
                </div>
              </Stat>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stat label="Average order value" value={peso(t.averageOrderValue)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stat label="Units sold" value={t.units.toLocaleString()} />
            </Grid>
          </Grid>

          {t.orders === 0 ? (
            <Alert severity="info">No sales in this period. Try a wider date range.</Alert>
          ) : (
            <SalesChart data={sales.series} groupBy={sales.range.groupBy} metric={metric} chartType={chartType} />
          )}

          {sales.topProducts.length > 0 && (
            <div>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Top products</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Units</TableCell>
                    <TableCell align="right">Product revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sales.topProducts.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell align="right">{p.units}</TableCell>
                      <TableCell align="right">{peso(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Unit price × quantity; add-ons, delivery and discounts are not included.
              </Typography>
            </div>
          )}
        </Stack>
      )}
    </Paper>
  );
}