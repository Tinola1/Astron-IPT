import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Paper, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { listServiceRequests, runMaintenanceReminders, updateServiceRequest } from '../../../api/afterSales';
import { REQUEST_TYPES } from '../../../validators/serviceSchemas';
import { formatDate } from '../../../utils/format';
import { todayISO } from '../../../utils/dates';

const PAGE_SIZE = 10;
const COLORS = {
  submitted: 'default', under_review: 'info', approved: 'success', rejected: 'error',
  scheduled: 'info', in_progress: 'primary', completed: 'success',
};
const label = (s) => String(s).replace(/_/g, ' ');

export default function ServiceRequestList() {
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reminding, setReminding] = useState(false);

  const [item, setItem] = useState(null);
  const [form, setForm] = useState({ status: '', date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await listServiceRequests({ page: page + 1, limit: PAGE_SIZE, status: status || undefined, type: type || undefined });
      setRows(d.rows);
      setTotal(d.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, type]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (r) => {
    setItem(r);
    setForm({ status: r.status, date: '', notes: r.staffNotes || '' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { staffNotes: form.notes };
      if (form.status !== item.status) body.status = form.status;
      if (form.status === 'scheduled' && form.status !== item.status) body.scheduledDate = form.date;
      await updateServiceRequest(item._id, body);
      toast.success(body.status ? 'Updated. The customer has been notified.' : 'Note saved');
      setItem(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const sendReminders = async () => {
    setReminding(true);
    try {
      const r = await runMaintenanceReminders();
      toast.success(r.sent ? `Sent ${r.sent} cleaning reminder${r.sent === 1 ? '' : 's'}` : 'No reminders are due right now');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReminding(false);
    }
  };

  const changingToScheduled = item && form.status === 'scheduled' && item.status !== 'scheduled';
  const canSave = item && !(changingToScheduled && (!form.date || form.date < todayISO()));

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Service and warranty requests</Typography>
        {isAdmin && (
          <Button variant="outlined" onClick={sendReminders} disabled={reminding}>
            {reminding ? 'Sending…' : 'Send due cleaning reminders'}
          </Button>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField select size="small" label="Status" value={status} sx={{ minWidth: 180 }} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <MenuItem value="">All</MenuItem>
          {Object.keys(COLORS).map((s) => <MenuItem key={s} value={s}>{label(s)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Type" value={type} sx={{ minWidth: 180 }} onChange={(e) => { setType(e.target.value); setPage(0); }}>
          <MenuItem value="">All</MenuItem>
          {REQUEST_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sent</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Request</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>{formatDate(r.createdAt)}</TableCell>
                  <TableCell>
                    {r.customer.name}
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{r.customer.email}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{r.customer.phone}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <b style={{ textTransform: 'capitalize' }}>{label(r.type)}</b>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{r.description}</Typography>
                    {r.preferredDate && <Typography variant="caption">Prefers {formatDate(r.preferredDate)}</Typography>}
                  </TableCell>
                  <TableCell>
                    {r.product || '-'}
                    {r.serialNumber && <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Serial {r.serialNumber}</Typography>}
                    {r.warrantyExpiry && <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Warranty until {formatDate(r.warrantyExpiry)}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={COLORS[r.status]} label={label(r.status)} />
                    {r.scheduledDate && <Typography variant="caption" sx={{ display: 'block' }}>{formatDate(r.scheduledDate)}</Typography>}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" disabled={r.nextStatuses.length === 0} onClick={() => open(r)}>Update</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center">No requests found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, p) => setPage(p)} />
      </Paper>

      <Dialog open={!!item} onClose={() => !saving && setItem(null)} fullWidth maxWidth="sm">
        <DialogTitle>Update request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {item && [item.status, ...item.nextStatuses].map((s) => <MenuItem key={s} value={s}>{label(s)}</MenuItem>)}
            </TextField>
            {changingToScheduled && (
              <TextField
                type="date" label="Service date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayISO() } }}
              />
            )}
            <TextField
              label="Note to the customer" helperText="The customer can see this. Required when rejecting."
              multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItem(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!canSave || saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}