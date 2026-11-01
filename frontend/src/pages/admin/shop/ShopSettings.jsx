import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Paper, Stack, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { createAddOn, createZone, deleteZone, listAddOns, listZones, updateAddOn, updateZone } from '../../../api/shop';
import { peso } from '../../../utils/format';

const TYPES = [
  ['installation', 'Installation'], ['extended_warranty', 'Extended warranty'], ['mounting_bracket', 'Mounting bracket'],
  ['piping_kit', 'Piping kit'], ['other', 'Other'],
];
const typeLabel = (t) => TYPES.find((x) => x[0] === t)?.[1] || t;
const toList = (text) => [...new Set(text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean))];
const priceOk = (v) => v !== '' && Number(v) >= 0 && Number(v) <= 1000000;

function useLoad(fn) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setData(await fn());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [fn]);
  useEffect(() => {
    load();
  }, [load]);
  return [data, error, load];
}

function Zones() {
  const [data, error, load] = useLoad(listZones);
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg, after) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      after?.();
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const valid = form && form.name.trim() && priceOk(form.fee) && (toList(form.cities).length || toList(form.provinces).length);
  const save = () => {
    const body = { name: form.name, fee: Number(form.fee), cities: toList(form.cities), provinces: toList(form.provinces), isActive: form.isActive };
    return run(() => (form.id ? updateZone(form.id, body) : createZone(body)), 'Saved', () => setForm(null));
  };
  const blank = { name: '', fee: '', cities: '', provinces: '', isActive: true };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <LinearProgress />;
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ color: 'text.secondary' }}>A customer's delivery fee comes from the first zone that lists their city, then their province. Other places pay the default fee of {peso(data.defaultFee)}.</Typography>
        <Button variant="contained" onClick={() => setForm({ ...blank })}>Add zone</Button>
      </Stack>
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Zone</TableCell><TableCell>Cities</TableCell><TableCell>Provinces</TableCell><TableCell align="right">Fee</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {data.zones.map((z) => (
                <TableRow key={z._id} hover>
                  <TableCell>{z.name}</TableCell>
                  <TableCell>{z.cities.join(', ') || '-'}</TableCell>
                  <TableCell>{z.provinces.join(', ') || '-'}</TableCell>
                  <TableCell align="right">{peso(z.fee)}</TableCell>
                  <TableCell><Chip size="small" color={z.isActive ? 'success' : 'default'} label={z.isActive ? 'In use' : 'Off'} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setForm({ id: z._id, name: z.name, fee: String(z.fee), cities: z.cities.join('\n'), provinces: z.provinces.join('\n'), isActive: z.isActive })}>Edit</Button>
                    <Button size="small" onClick={() => run(() => updateZone(z._id, { name: z.name, fee: z.fee, cities: z.cities, provinces: z.provinces, isActive: !z.isActive }), z.isActive ? 'Zone turned off' : 'Zone turned on')}>{z.isActive ? 'Turn off' : 'Turn on'}</Button>
                    <Button size="small" color="error" onClick={() => setDel(z)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.zones.length === 0 && <TableRow><TableCell colSpan={6} align="center">No zones yet. Everyone pays the default fee.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!form} onClose={busy ? undefined : () => setForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{form?.id ? 'Edit zone' : 'Add zone'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Zone name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} slotProps={{ htmlInput: { maxLength: 80 } }} />
              <TextField label="Delivery fee (₱)" type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} error={form.fee !== '' && !priceOk(form.fee)} />
              <TextField label="Cities" multiline minRows={3} value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} helperText="One per line, or separated by commas" />
              <TextField label="Provinces" multiline minRows={2} value={form.provinces} onChange={(e) => setForm({ ...form, provinces: e.target.value })} helperText="Used when the city isn't listed" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!valid || busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={!!del} title="Delete zone?" message={del ? `${del.name} will be removed. Past orders keep the fee they were charged.` : ''} confirmText="Delete" loading={busy}
        onConfirm={() => run(() => deleteZone(del._id), 'Deleted', () => setDel(null))} onClose={() => setDel(null)} />
    </Stack>
  );
}

function AddOns() {
  const [rows, error, load] = useLoad(listAddOns);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg, after) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      after?.();
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const valid = form && form.name.trim() && priceOk(form.price);
  const save = () => {
    const body = { name: form.name, description: form.description, price: Number(form.price), isActive: form.isActive };
    return run(() => (form.id ? updateAddOn(form.id, body) : createAddOn({ ...body, type: form.type })), 'Saved', () => setForm(null));
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!rows) return <LinearProgress />;
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ color: 'text.secondary' }}>Prices customers pay for optional extras. A hidden add-on can't be added to new carts. Add-ons can't be deleted because orders refer to them.</Typography>
        <Button variant="contained" onClick={() => setForm({ name: '', description: '', price: '', type: 'other', isActive: true })}>Add add-on</Button>
      </Stack>
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>Description</TableCell><TableCell align="right">Price</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a._id} hover>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{typeLabel(a.type)}</TableCell>
                  <TableCell>{a.description || '-'}</TableCell>
                  <TableCell align="right">{peso(a.price)}</TableCell>
                  <TableCell><Chip size="small" color={a.isActive ? 'success' : 'default'} label={a.isActive ? 'Shown' : 'Hidden'} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setForm({ id: a._id, name: a.name, description: a.description, price: String(a.price), type: a.type, isActive: a.isActive })}>Edit</Button>
                    <Button size="small" onClick={() => run(() => updateAddOn(a._id, { name: a.name, description: a.description, price: a.price, isActive: !a.isActive }), a.isActive ? 'Hidden' : 'Shown again')}>{a.isActive ? 'Hide' : 'Show'}</Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No add-ons yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog open={!!form} onClose={busy ? undefined : () => setForm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{form?.id ? 'Edit add-on' : 'Add add-on'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} slotProps={{ htmlInput: { maxLength: 80 } }} />
              <TextField select label="Type" value={form.type} disabled={!!form.id} onChange={(e) => setForm({ ...form, type: e.target.value })} helperText={form.id ? 'The type can’t be changed after it is created' : 'Decides how it behaves, for example installation fees'}>
                {TYPES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </TextField>
              <TextField label="Price (₱)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} error={form.price !== '' && !priceOk(form.price)} />
              <TextField label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} slotProps={{ htmlInput: { maxLength: 200 } }} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!valid || busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default function ShopSettings() {
  const [tab, setTab] = useState(0);
  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Delivery &amp; add-ons</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}><Tab label="Delivery zones" /><Tab label="Add-ons" /></Tabs>
      {tab === 0 ? <Zones /> : <AddOns />}
    </Stack>
  );
}