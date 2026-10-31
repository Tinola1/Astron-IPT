import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Grid, LinearProgress, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import {
  downloadReportCsv, getInstallationReport, getInventoryReport, getServiceReport,
} from '../../../api/records';
import { saveBlob } from '../../../utils/download';
import { addDaysISO, todayISO } from '../../../utils/dates';

const label = (s) => String(s).replace(/_/g, ' ');

function Stat({ title, value }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{title}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>{value}</Typography>
    </Paper>
  );
}

function SimpleTable({ head, rows, empty = 'Nothing in this period.' }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>{head.map((h, i) => <TableCell key={h} align={i ? 'right' : 'left'}>{h}</TableCell>)}</TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>{r.map((c, j) => <TableCell key={j} align={j ? 'right' : 'left'}>{c}</TableCell>)}</TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell colSpan={head.length} align="center">{empty}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const TABS = [
  { key: 'inventory', title: 'Inventory', ranged: false, load: () => getInventoryReport() },
  { key: 'installations', title: 'Installations', ranged: true, load: (p) => getInstallationReport(p) },
  { key: 'service', title: 'Service requests', ranged: true, load: (p) => getServiceReport(p) },
];

export default function Reports() {
  const [tab, setTab] = useState(0);
  const [from, setFrom] = useState(addDaysISO(todayISO(), -29));
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const t = TABS[tab];
  const rangeOk = !t.ranged || (from && to && from <= to);
  const params = t.ranged ? { from, to } : undefined;

  const load = useCallback(async () => {
    if (!rangeOk) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      setData(await t.load(params));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      saveBlob(await downloadReportCsv(t.key, params), `${t.key}${t.ranged ? `-${from}_to_${to}` : ''}.csv`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Reports</Typography>
      <Typography sx={{ color: 'text.secondary', mt: -1 }}>Sales figures are on the Dashboard.</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
        {TABS.map((x) => <Tab key={x.key} label={x.title} />)}
      </Tabs>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
        {t.ranged && (
          <>
            <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </>
        )}
        <Button variant="outlined" onClick={exportCsv} disabled={!data || exporting || !rangeOk}>Download CSV</Button>
      </Stack>
      {!rangeOk && <Alert severity="warning">The start date must be on or before the end date.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <LinearProgress />}

      {data && t.key === 'inventory' && (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Products" value={data.totals.products} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Units in stock" value={data.totals.units} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Low stock" value={data.totals.low} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Out of stock" value={data.totals.out} /></Grid>
          </Grid>
          <Paper sx={{ p: 1 }}>
            <SimpleTable
              head={['Product', 'Model', 'Online', 'Showroom', 'Total', 'Serials in stock', 'Serials sold', 'Serials damaged', 'Status']}
              rows={data.rows.map((r) => [
                r.name, r.modelNumber, r.onlineStock, r.showroomStock, r.total, r.units.in_stock, r.units.sold, r.units.damaged,
                <Chip key="s" size="small" color={r.total === 0 ? 'error' : r.isLow ? 'warning' : 'success'} label={r.total === 0 ? 'Out of stock' : r.isLow ? 'Low stock' : 'OK'} />,
              ])}
            />
          </Paper>
        </>
      )}

      {data && t.key === 'installations' && (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Jobs created" value={data.totals.all} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Completed" value={data.totals.completed} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Cancelled" value={data.totals.cancelled} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Avg days to finish" value={data.totals.avgDaysToComplete ?? '-'} /></Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 1 }}><SimpleTable head={['Technician', 'Jobs', 'Completed']} rows={data.byTechnician.map((x) => [x.technician, x.assigned, x.completed])} /></Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 1 }}><SimpleTable head={['Status', 'Jobs']} rows={Object.entries(data.byStatus).map(([k, v]) => [label(k), v])} /></Paper>
            </Grid>
          </Grid>
        </>
      )}

      {data && t.key === 'service' && (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Requests" value={data.totals.all} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Completed" value={data.totals.completed} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Rejected" value={data.totals.rejected} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Stat title="Avg days to resolve" value={data.totals.avgDaysToResolve ?? '-'} /></Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 1 }}><SimpleTable head={['Type', 'Requests']} rows={Object.entries(data.byType).map(([k, v]) => [label(k), v])} /></Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 1 }}><SimpleTable head={['Status', 'Requests']} rows={Object.entries(data.byStatus).map(([k, v]) => [label(k), v])} /></Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 1 }}><SimpleTable head={['Handled by', 'Requests', 'Completed']} rows={data.byStaff.map((x) => [x.name, x.handled, x.completed])} /></Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  );
}