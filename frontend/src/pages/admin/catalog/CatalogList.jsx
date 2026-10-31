import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Paper, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { createCatalog, deleteCatalog, listCatalog, updateCatalog } from '../../../api/catalogAdmin';
import { loadCatalogMeta } from '../../../store/actions/productActions';

const KINDS = [
  { key: 'categories', title: 'Product types', one: 'product type', hasDesc: true },
  { key: 'brands', title: 'Brands', one: 'brand', hasDesc: false },
];

export default function CatalogList() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState(0);
  const kind = KINDS[tab];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // { id?, name, description }
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await listCatalog(kind.key));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [kind.key]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, okMsg, after) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      after?.();
      await load();
      dispatch(loadCatalogMeta()); // keeps the product form and shop filters up to date
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    form.id
      ? run(() => updateCatalog(kind.key, form.id, { name: form.name, ...(kind.hasDesc ? { description: form.description } : {}) }), 'Saved', () => setForm(null))
      : run(() => createCatalog(kind.key, { name: form.name, ...(kind.hasDesc ? { description: form.description } : {}) }), 'Added', () => setForm(null));

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Types &amp; brands</Typography>
        <Button variant="contained" onClick={() => setForm({ name: '', description: '' })}>Add {kind.one}</Button>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>{KINDS.map((k) => <Tab key={k.key} label={k.title} />)}</Tabs>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                {kind.hasDesc && <TableCell>Description</TableCell>}
                <TableCell align="right">Products</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>{r.name}</TableCell>
                  {kind.hasDesc && <TableCell>{r.description || '-'}</TableCell>}
                  <TableCell align="right">{r.products}</TableCell>
                  <TableCell><Chip size="small" color={r.isActive ? 'success' : 'default'} label={r.isActive ? 'Shown' : 'Hidden'} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setForm({ id: r._id, name: r.name, description: r.description })}>Edit</Button>
                    <Button size="small" onClick={() => run(() => updateCatalog(kind.key, r._id, { isActive: !r.isActive }), r.isActive ? 'Hidden from the shop filters' : 'Shown again')}>
                      {r.isActive ? 'Hide' : 'Show'}
                    </Button>
                    <Button size="small" color="error" onClick={() => setDel(r)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={5} align="center">Nothing here yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!form} onClose={busy ? undefined : () => setForm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{form?.id ? 'Edit' : 'Add'} {kind.one}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} slotProps={{ htmlInput: { maxLength: 60 } }} />
              {kind.hasDesc && (
                <TextField label="Description (optional)" multiline minRows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} slotProps={{ htmlInput: { maxLength: 300 } }} />
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!form?.name.trim() || busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        title={`Delete ${kind.one}?`}
        message={del ? `"${del.name}" will be removed. If any product uses it, the delete is refused and you can hide it instead.` : ''}
        confirmText="Delete"
        loading={busy}
        onConfirm={() => run(() => deleteCatalog(kind.key, del._id), 'Deleted', () => setDel(null))}
        onClose={() => setDel(null)}
      />
    </Stack>
  );
}