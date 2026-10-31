import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { createPromotion, deletePromotion, listPromotions, setPromotionActive, updatePromotion } from '../../../api/store';
import { peso } from '../../../utils/format';

const EMPTY = { title: '', code: '', description: '', discountType: 'percent', discountValue: '', minOrderAmount: '', usageLimit: '', startDate: '', endDate: '' };
const STATUS = {
  active: ['success', 'Active'], scheduled: ['info', 'Scheduled'], expired: ['default', 'Expired'],
  used_up: ['warning', 'Used up'], disabled: ['default', 'Turned off'],
};
const num = (v) => (v === '' ? null : Number(v));

export default function Promotions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await listPromotions());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, okMsg, after) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      after?.();
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const value = Number(form?.discountValue);
  const valueOk = form && form.discountValue !== '' && value > 0 && (form.discountType === 'fixed' || value <= 100);
  const limitOk = form && (form.usageLimit === '' || (Number.isInteger(Number(form.usageLimit)) && Number(form.usageLimit) >= 1));
  const minOk = form && (form.minOrderAmount === '' || Number(form.minOrderAmount) >= 0);
  const datesOk = form && (!form.startDate || !form.endDate || form.startDate <= form.endDate);
  const valid = form && form.title.trim() && /^[A-Za-z0-9][A-Za-z0-9_-]{2,19}$/.test(form.code.trim()) && valueOk && limitOk && minOk && datesOk;

  const save = () => {
    const body = {
      title: form.title, code: form.code, description: form.description, discountType: form.discountType,
      discountValue: value, minOrderAmount: num(form.minOrderAmount) ?? 0, usageLimit: num(form.usageLimit),
      startDate: form.startDate || null, endDate: form.endDate || null,
    };
    return run(() => (form.id ? updatePromotion(form.id, body) : createPromotion(body)), 'Promotion saved', () => setForm(null));
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Promotions &amp; discount codes</Typography>
        <Button variant="contained" onClick={() => setForm({ ...EMPTY })}>Add promotion</Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell><TableCell>Code</TableCell><TableCell>Discount</TableCell><TableCell>Minimum order</TableCell>
                <TableCell>Used</TableCell><TableCell>Valid</TableCell><TableCell>Status</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p._id} hover>
                  <TableCell>{p.title}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{p.code}</TableCell>
                  <TableCell>{p.discountType === 'percent' ? `${p.discountValue}%` : peso(p.discountValue)}</TableCell>
                  <TableCell>{p.minOrderAmount ? peso(p.minOrderAmount) : '-'}</TableCell>
                  <TableCell>{p.usedCount}{p.usageLimit != null ? ` / ${p.usageLimit}` : ''}</TableCell>
                  <TableCell>{p.startDate || p.endDate ? `${p.startDate || '…'} to ${p.endDate || '…'}` : 'Always'}</TableCell>
                  <TableCell><Chip size="small" color={STATUS[p.status][0]} label={STATUS[p.status][1]} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setForm({ ...p, discountValue: String(p.discountValue), minOrderAmount: p.minOrderAmount ? String(p.minOrderAmount) : '', usageLimit: p.usageLimit == null ? '' : String(p.usageLimit), id: p._id })}>Edit</Button>
                    <Button size="small" onClick={() => run(() => setPromotionActive(p._id, !p.isActive), p.isActive ? 'Turned off' : 'Turned on')}>{p.isActive ? 'Turn off' : 'Turn on'}</Button>
                    <Button size="small" color="error" onClick={() => setDel(p)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={8} align="center">No promotions yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!form} onClose={busy ? undefined : () => setForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{form?.id ? 'Edit promotion' : 'Add promotion'}</DialogTitle>
        <DialogContent>
          {form && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 7 }}><TextField fullWidth label="Title" value={form.title} onChange={set('title')} slotProps={{ htmlInput: { maxLength: 80 } }} /></Grid>
              <Grid size={{ xs: 12, sm: 5 }}><TextField fullWidth label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} helperText="3 to 20: letters, numbers, - _" slotProps={{ htmlInput: { maxLength: 20 } }} /></Grid>
              <Grid size={12}><TextField fullWidth label="Description (optional)" value={form.description} onChange={set('description')} slotProps={{ htmlInput: { maxLength: 200 } }} /></Grid>
              <Grid size={{ xs: 6 }}>
                <TextField select fullWidth label="Type" value={form.discountType} onChange={set('discountType')}>
                  <MenuItem value="percent">Percent off</MenuItem>
                  <MenuItem value="fixed">Fixed amount off (₱)</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}><TextField fullWidth type="number" label={form.discountType === 'percent' ? 'Percent (1 to 100)' : 'Amount (₱)'} value={form.discountValue} onChange={set('discountValue')} error={form.discountValue !== '' && !valueOk} /></Grid>
              <Grid size={{ xs: 6 }}><TextField fullWidth type="number" label="Minimum order (₱, optional)" value={form.minOrderAmount} onChange={set('minOrderAmount')} error={!minOk} /></Grid>
              <Grid size={{ xs: 6 }}><TextField fullWidth type="number" label="Usage limit (optional)" value={form.usageLimit} onChange={set('usageLimit')} error={!limitOk} helperText="Empty = no limit" /></Grid>
              <Grid size={{ xs: 6 }}><TextField fullWidth type="date" label="Starts (optional)" value={form.startDate} onChange={set('startDate')} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
              <Grid size={{ xs: 6 }}><TextField fullWidth type="date" label="Ends (optional)" value={form.endDate} onChange={set('endDate')} error={!datesOk} helperText={!datesOk ? 'Must be after the start' : 'Last day it works'} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!valid || busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        title="Delete promotion?"
        message={del ? `${del.code} will be removed. If any order already used it, the delete is refused and you can turn it off instead.` : ''}
        confirmText="Delete"
        loading={busy}
        onConfirm={() => run(() => deletePromotion(del._id), 'Deleted', () => setDel(null))}
        onClose={() => setDel(null)}
      />
    </Stack>
  );
}