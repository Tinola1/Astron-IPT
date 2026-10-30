import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { listInstallations, listTechnicians, scheduleInstallation } from '../../../api/installations';
import { formatDate } from '../../../utils/format';
import { todayISO } from '../../../utils/dates';

const PAGE_SIZE = 10;
const COLORS = { pending: 'warning', scheduled: 'info', in_progress: 'primary', completed: 'success', cancelled: 'default' };
const label = (s) => String(s).replace(/_/g, ' ');
// jobs are stored at Manila midnight; read the date back in Manila time so the date input shows the right day
const manilaISO = (d) => new Date(new Date(d).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);

export default function InstallationList() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [technicians, setTechnicians] = useState([]);

  const [job, setJob] = useState(null); // job being scheduled
  const [form, setForm] = useState({ technician: '', date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await listInstallations({ page: page + 1, limit: PAGE_SIZE, status: status || undefined });
      setRows(d.rows);
      setTotal(d.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listTechnicians().then(setTechnicians).catch(() => setTechnicians([]));
  }, []);

  const openDialog = (j) => {
    setJob(j);
    setForm({
      technician: j.technician?._id || '',
      date: j.scheduledDate ? manilaISO(j.scheduledDate) : '',
      notes: j.notes || '',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await scheduleInstallation(job._id, { technician: form.technician, scheduledDate: form.date, notes: form.notes });
      toast.success('Scheduled. The customer has been notified.');
      setJob(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const canSave = form.technician && form.date && form.date >= todayISO();

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Installations</Typography>

      <TextField
        select size="small" label="Status" value={status} sx={{ maxWidth: 220 }}
        onChange={(e) => { setStatus(e.target.value); setPage(0); }}
      >
        <MenuItem value="">All</MenuItem>
        {Object.keys(COLORS).map((s) => <MenuItem key={s} value={s}>{label(s)}</MenuItem>)}
      </TextField>

      {error && <Alert severity="error">{error}</Alert>}
      {technicians.length === 0 && (
        <Alert severity="info">No technician accounts yet. Create one before scheduling a job.</Alert>
      )}

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Technician</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((j) => (
                <TableRow key={j._id} hover>
                  <TableCell>
                    {j.order.orderNumber}
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      order {label(j.order.status || '-')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {j.customer.name}
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{j.customer.phone}</Typography>
                  </TableCell>
                  <TableCell>{[j.address?.city, j.address?.province].filter(Boolean).join(', ')}</TableCell>
                  <TableCell>{formatDate(j.scheduledDate)}</TableCell>
                  <TableCell>
                    <Chip size="small" variant={j.technician ? 'filled' : 'outlined'} color={j.technician ? 'success' : 'default'} label={j.technician?.name || 'Unassigned'} />
                  </TableCell>
                  <TableCell><Chip size="small" color={COLORS[j.status]} label={label(j.status)} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" disabled={!['pending', 'scheduled'].includes(j.status)} onClick={() => openDialog(j)}>
                      {j.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center">No installation jobs found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]}
          onPageChange={(_, p) => setPage(p)}
        />
      </Paper>

      <Dialog open={!!job} onClose={() => !saving && setJob(null)} fullWidth maxWidth="xs">
        <DialogTitle>Schedule installation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Technician" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })}>
              {technicians.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
            </TextField>
            <TextField
              type="date" label="Installation date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayISO() } }}
            />
            <TextField
              label="Notes for the technician (optional)" multiline minRows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJob(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Save and notify customer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}