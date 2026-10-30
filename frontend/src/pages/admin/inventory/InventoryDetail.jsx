import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Button, Chip, Grid, IconButton, LinearProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import ReportIcon from '@mui/icons-material/ReportProblem';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import {
  adjustStock, getInventory, listUnits, markUnitDamaged, receiveUnits, setThreshold,
} from '../../../api/inventory';
import { formatDateTime } from '../../../utils/format';

const PAGE_SIZE = 10;
const UNIT_COLOR = { in_stock: 'success', reserved: 'info', sold: 'default', returned: 'warning', damaged: 'error' };
const label = (s) => String(s).replace(/_/g, ' ');
const parseSerials = (text) => [...new Set(text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean))];

function Stat({ title, value, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{title}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>{value}</Typography>
      {children}
    </Paper>
  );
}

export default function InventoryDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [adj, setAdj] = useState({ stockType: 'online', mode: 'add', quantity: '', reason: '' });
  const [adjusting, setAdjusting] = useState(false);
  const [level, setLevel] = useState('');
  const [savingLevel, setSavingLevel] = useState(false);
  const [recv, setRecv] = useState({ stockType: 'online', text: '' });
  const [receiving, setReceiving] = useState(false);

  const [units, setUnits] = useState({ rows: [], total: 0 });
  const [page, setPage] = useState(0);
  const [unitStatus, setUnitStatus] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [damage, setDamage] = useState(null);
  const [working, setWorking] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const d = await getInventory(id);
      setData(d);
      setLevel(String(d.threshold));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  const loadUnits = useCallback(async () => {
    try {
      setUnits(await listUnits(id, { page: page + 1, limit: PAGE_SIZE, status: unitStatus || undefined, q: unitSearch.trim() || undefined }));
    } catch (e) {
      toast.error(e.message);
    }
  }, [id, page, unitStatus, unitSearch]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);
  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const refresh = () => {
    loadDetail();
    loadUnits();
  };

  const qty = Number(adj.quantity);
  const adjValid = adj.quantity !== '' && Number.isInteger(qty) && qty >= 0 && adj.reason.trim().length >= 3;
  const handleAdjust = async () => {
    setAdjusting(true);
    try {
      await adjustStock(id, { stockType: adj.stockType, mode: adj.mode, quantity: qty, reason: adj.reason.trim() });
      toast.success('Stock updated');
      setAdj({ ...adj, quantity: '', reason: '' });
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAdjusting(false);
    }
  };

  const levelNum = Number(level);
  const levelValid = level !== '' && Number.isInteger(levelNum) && levelNum >= 0 && levelNum <= 1000;
  const handleLevel = async () => {
    setSavingLevel(true);
    try {
      await setThreshold(id, levelNum);
      toast.success('Low-stock level saved');
      loadDetail();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingLevel(false);
    }
  };

  const serials = parseSerials(recv.text);
  const handleReceive = async () => {
    setReceiving(true);
    try {
      const r = await receiveUnits(id, { stockType: recv.stockType, serials });
      toast.success(`${r.added} unit${r.added === 1 ? '' : 's'} added to ${recv.stockType} stock`);
      setRecv({ ...recv, text: '' });
      setPage(0);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReceiving(false);
    }
  };

  const handleDamage = async () => {
    setWorking(true);
    try {
      await markUnitDamaged(damage._id);
      toast.success('Unit marked damaged and removed from stock');
      setDamage(null);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setWorking(false);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <LinearProgress />;

  return (
    <Stack spacing={3}>
      <div>
        <Button component={RouterLink} to="/admin/inventory" size="small">← All inventory</Button>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{data.product.name}</Typography>
        <Typography sx={{ color: 'text.secondary' }}>Model {data.product.modelNumber}</Typography>
      </div>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}><Stat title="Online stock (sold on the website)" value={data.onlineStock} /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><Stat title="Showroom stock" value={data.showroomStock} /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Stat title="Low-stock level" value={<Chip size="small" color={data.isLow ? 'warning' : 'success'} label={data.isLow ? 'Low stock' : 'OK'} />}>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <TextField size="small" type="number" value={level} onChange={(e) => setLevel(e.target.value)} sx={{ width: 100 }} error={!levelValid} />
              <Button size="small" variant="outlined" onClick={handleLevel} disabled={!levelValid || savingLevel || levelNum === data.threshold}>Save</Button>
            </Stack>
          </Stat>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Adjust stock</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField select size="small" label="Stock" value={adj.stockType} onChange={(e) => setAdj({ ...adj, stockType: e.target.value })} sx={{ minWidth: 130 }}>
            <MenuItem value="online">Online</MenuItem>
            <MenuItem value="showroom">Showroom</MenuItem>
          </TextField>
          <TextField select size="small" label="Action" value={adj.mode} onChange={(e) => setAdj({ ...adj, mode: e.target.value })} sx={{ minWidth: 150 }}>
            <MenuItem value="add">Add units</MenuItem>
            <MenuItem value="remove">Remove units</MenuItem>
            <MenuItem value="set">Set exact count</MenuItem>
          </TextField>
          <TextField size="small" type="number" label="Quantity" value={adj.quantity} onChange={(e) => setAdj({ ...adj, quantity: e.target.value })} sx={{ width: 120 }} />
          <TextField size="small" label="Reason (required)" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 200 } }} />
          <Button variant="contained" onClick={handleAdjust} disabled={!adjValid || adjusting}>{adjusting ? 'Saving…' : 'Apply'}</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700 }}>Receive units with serial numbers</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          One serial number per line (or separated by commas). Each one is added to the stock count, and the warranty of the customer who buys it will use it.
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'flex-start' } }}>
          <TextField select size="small" label="Stock" value={recv.stockType} onChange={(e) => setRecv({ ...recv, stockType: e.target.value })} sx={{ minWidth: 130 }}>
            <MenuItem value="online">Online</MenuItem>
            <MenuItem value="showroom">Showroom</MenuItem>
          </TextField>
          <TextField size="small" multiline minRows={3} label="Serial numbers" value={recv.text} onChange={(e) => setRecv({ ...recv, text: e.target.value })} sx={{ flex: 1 }} />
          <Button variant="contained" onClick={handleReceive} disabled={serials.length === 0 || serials.length > 200 || receiving}>
            {receiving ? 'Adding…' : `Add ${serials.length || ''} unit${serials.length === 1 ? '' : 's'}`}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1, justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <Typography sx={{ fontWeight: 700 }}>
            Units by serial number
            <Typography component="span" variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
              {Object.entries(data.unitCounts).map(([s, n]) => `${n} ${label(s)}`).join(' · ')}
            </Typography>
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="Search serial" value={unitSearch} onChange={(e) => { setUnitSearch(e.target.value); setPage(0); }} />
            <TextField select size="small" label="Status" value={unitStatus} onChange={(e) => { setUnitStatus(e.target.value); setPage(0); }} sx={{ minWidth: 130 }}>
              <MenuItem value="">All</MenuItem>
              {Object.keys(UNIT_COLOR).map((s) => <MenuItem key={s} value={s}>{label(s)}</MenuItem>)}
            </TextField>
          </Stack>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Serial number</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Order</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {units.rows.map((u) => (
                <TableRow key={u._id} hover>
                  <TableCell>{u.serialNumber}</TableCell>
                  <TableCell>{u.stockType}</TableCell>
                  <TableCell><Chip size="small" color={UNIT_COLOR[u.status]} label={label(u.status)} /></TableCell>
                  <TableCell>{u.order || '-'}</TableCell>
                  <TableCell align="right">
                    {u.status === 'in_stock' && (
                      <Tooltip title="Mark as damaged">
                        <IconButton size="small" aria-label="Mark as damaged" onClick={() => setDamage(u)}><ReportIcon fontSize="small" color="warning" /></IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {units.rows.length === 0 && <TableRow><TableCell colSpan={5} align="center">No units registered yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={units.total} page={page} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, p) => setPage(p)} />
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Recent stock changes</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell align="right">Change</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.history.map((h, i) => (
                <TableRow key={i}>
                  <TableCell>{formatDateTime(h.at)}</TableCell>
                  <TableCell>{h.stockType}</TableCell>
                  <TableCell align="right" sx={{ color: h.change < 0 ? 'error.main' : 'success.main', fontWeight: 700 }}>{h.change > 0 ? `+${h.change}` : h.change}</TableCell>
                  <TableCell>{h.reason}</TableCell>
                  <TableCell>{h.by}</TableCell>
                </TableRow>
              ))}
              {data.history.length === 0 && <TableRow><TableCell colSpan={5} align="center">No manual changes yet. Customer orders are not listed here.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ConfirmDialog
        open={!!damage}
        title="Mark unit as damaged?"
        message={damage ? `Serial ${damage.serialNumber} will be taken out of stock and the ${damage.stockType} count will drop by 1.` : ''}
        confirmText="Mark damaged"
        loading={working}
        onConfirm={handleDamage}
        onClose={() => setDamage(null)}
      />
    </Stack>
  );
}