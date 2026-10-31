import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { createTeamMember, listTeam, resetTeamPassword, updateTeamMember } from '../../../api/users';
import useDebounce from '../../../hooks/useDebounce';
import { formatDate } from '../../../utils/format';

const PAGE_SIZE = 10;
const EMPTY = { name: '', email: '', phone: '', role: 'technician', password: '' };
const passwordOk = (p) => p.length >= 8 && new TextEncoder().encode(p).length <= 72;

export default function TeamList() {
  const me = useSelector((s) => s.auth.user);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 400);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(null); // { id?, ...fields }
  const [pwFor, setPwFor] = useState(null);
  const [pw, setPw] = useState('');
  const [toggle, setToggle] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await listTeam({ page: page + 1, limit: PAGE_SIZE, q: debounced || undefined, role: role || undefined });
      setRows(d.rows);
      setTotal(d.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, debounced, role]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, okMsg, after) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      after();
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const isNew = form && !form.id;
  const formOk = form && form.name.trim() && (!isNew || (/^\S+@\S+\.\S+$/.test(form.email.trim()) && passwordOk(form.password)));
  const save = () =>
    isNew
      ? run(() => createTeamMember({ name: form.name, email: form.email, phone: form.phone, role: form.role, password: form.password }), 'Account created', () => setForm(null))
      : run(() => updateTeamMember(form.id, { name: form.name, phone: form.phone, role: form.role }), 'Account updated', () => setForm(null));

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Staff &amp; technicians</Typography>
        <Button variant="contained" onClick={() => setForm({ ...EMPTY })}>Add account</Button>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField size="small" label="Search name or email" value={search} sx={{ minWidth: 260 }} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <TextField select size="small" label="Role" value={role} sx={{ minWidth: 150 }} onChange={(e) => { setRole(e.target.value); setPage(0); }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="staff">Staff</MenuItem>
          <MenuItem value="technician">Technician</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
        </TextField>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Phone</TableCell>
                <TableCell>Role</TableCell><TableCell>Added</TableCell><TableCell>Status</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((u) => {
                const editable = u.role !== 'admin';
                return (
                  <TableRow key={u._id} hover>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone || '-'}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{u.role}</TableCell>
                    <TableCell>{formatDate(u.createdAt)}</TableCell>
                    <TableCell><Chip size="small" color={u.isActive ? 'success' : 'default'} label={u.isActive ? 'Active' : 'Deactivated'} /></TableCell>
                    <TableCell align="right">
                      {editable && (
                        <>
                          <Button size="small" onClick={() => setForm({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, password: '' })}>Edit</Button>
                          <Button size="small" onClick={() => { setPwFor(u); setPw(''); }}>Reset password</Button>
                          {u._id !== me?._id && (
                            <Button size="small" color={u.isActive ? 'error' : 'primary'} onClick={() => setToggle(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={7} align="center">No accounts found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, p) => setPage(p)} />
      </Paper>

      <Dialog open={!!form} onClose={busy ? undefined : () => setForm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{isNew ? 'Add account' : 'Edit account'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} slotProps={{ htmlInput: { maxLength: 80 } }} />
              <TextField label="Email" type="email" value={form.email} disabled={!isNew} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <TextField label="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} slotProps={{ htmlInput: { maxLength: 30 } }} />
              <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <MenuItem value="technician">Technician</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
              </TextField>
              {isNew && (
                <TextField label="Password (8 to 72 characters)" type="password" autoComplete="new-password" value={form.password}
                  error={!!form.password && !passwordOk(form.password)} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!formOk || busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pwFor} onClose={busy ? undefined : () => setPwFor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset password for {pwFor?.name}</DialogTitle>
        <DialogContent>
          <TextField fullWidth sx={{ mt: 1 }} label="New password (8 to 72 characters)" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={!!pw && !passwordOk(pw)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwFor(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" disabled={!passwordOk(pw) || busy} onClick={() => run(() => resetTeamPassword(pwFor._id, pw), 'Password changed', () => setPwFor(null))}>Change password</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!toggle}
        title={toggle?.isActive ? 'Deactivate account?' : 'Activate account?'}
        message={toggle?.isActive ? `${toggle?.name} will no longer be able to log in. Their past work stays on record.` : `${toggle?.name} will be able to log in again.`}
        confirmText={toggle?.isActive ? 'Deactivate' : 'Activate'}
        color={toggle?.isActive ? 'error' : 'primary'}
        loading={busy}
        onConfirm={() => run(() => updateTeamMember(toggle._id, { isActive: !toggle.isActive }), 'Account updated', () => setToggle(null))}
        onClose={() => setToggle(null)}
      />
    </Stack>
  );
}