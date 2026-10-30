import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Button, Chip, FormControlLabel, LinearProgress, Paper, Stack, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import { listInventory } from '../../../api/inventory';
import useDebounce from '../../../hooks/useDebounce';

const PAGE_SIZE = 10;

export default function InventoryList() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 400);
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await listInventory({ page: page + 1, limit: PAGE_SIZE, q: debounced || undefined, low: lowOnly ? 'true' : undefined });
      setRows(d.rows);
      setTotal(d.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, debounced, lowOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Inventory</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
        <TextField
          size="small" label="Search name or model" value={search} sx={{ minWidth: 260 }}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <FormControlLabel
          control={<Switch checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(0); }} />}
          label="Low stock only"
        />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Model</TableCell>
                <TableCell align="right">Online</TableCell>
                <TableCell align="right">Showroom</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Low-stock level</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.product._id} hover>
                  <TableCell>{r.product.name}</TableCell>
                  <TableCell>{r.product.modelNumber}</TableCell>
                  <TableCell align="right">{r.onlineStock}</TableCell>
                  <TableCell align="right">{r.showroomStock}</TableCell>
                  <TableCell align="right">{r.total}</TableCell>
                  <TableCell align="right">{r.threshold}</TableCell>
                  <TableCell>
                    <Chip size="small" color={r.isLow ? 'warning' : 'success'} label={r.isLow ? 'Low stock' : 'OK'} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" component={RouterLink} to={`/admin/inventory/${r.product._id}`}>Manage</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">No products found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, p) => setPage(p)} />
      </Paper>
    </Stack>
  );
}