import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Button, Chip, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import { listCustomers } from '../../../api/records';
import useDebounce from '../../../hooks/useDebounce';
import { formatDate, peso } from '../../../utils/format';

const PAGE_SIZE = 10;

export default function CustomerList() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 400);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await listCustomers({ page: page + 1, limit: PAGE_SIZE, q: debounced || undefined });
      setRows(d.rows);
      setTotal(d.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Customers</Typography>
      <TextField size="small" label="Search name or email" value={search} sx={{ maxWidth: 320 }} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
      {error && <Alert severity="error">{error}</Alert>}
      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Orders</TableCell>
                <TableCell align="right">Total spent</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c._id} hover>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone || '-'}</TableCell>
                  <TableCell>{formatDate(c.joined)}</TableCell>
                  <TableCell align="right">{c.orders}</TableCell>
                  <TableCell align="right">{peso(c.spent)}</TableCell>
                  <TableCell><Chip size="small" color={c.isActive ? 'success' : 'default'} label={c.isActive ? 'Active' : 'Disabled'} /></TableCell>
                  <TableCell align="right"><Button size="small" component={RouterLink} to={`/admin/customers/${c._id}`}>View</Button></TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={8} align="center">No customers found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, p) => setPage(p)} />
      </Paper>
    </Stack>
  );
}