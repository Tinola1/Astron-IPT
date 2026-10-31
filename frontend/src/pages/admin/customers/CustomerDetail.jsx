import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Button, Chip, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography,
} from '@mui/material';
import { getCustomer } from '../../../api/records';
import { formatDate, peso } from '../../../utils/format';

const label = (s) => String(s).replace(/_/g, ' ');

function Section({ title, head, rows }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow>{head.map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>)}
            {rows.length === 0 && <TableRow><TableCell colSpan={head.length} align="center">Nothing yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    getCustomer(id).then((x) => live && setD(x)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [id]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!d) return <LinearProgress />;
  const c = d.customer;

  return (
    <Stack spacing={3}>
      <div>
        <Button component={RouterLink} to="/admin/customers" size="small">← All customers</Button>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{c.name} <Chip size="small" color={c.isActive ? 'success' : 'default'} label={c.isActive ? 'Active' : 'Disabled'} /></Typography>
        <Typography sx={{ color: 'text.secondary' }}>{c.email} · {c.phone || 'No phone'} · Joined {formatDate(c.joined)}</Typography>
        {c.addresses.map((a, i) => (
          <Typography key={i} variant="body2" sx={{ color: 'text.secondary' }}>
            {a.label}: {[a.street, a.barangay, a.city, a.province].filter(Boolean).join(', ')}
          </Typography>
        ))}
      </div>

      <Section title="Purchases" head={['Order', 'Date', 'Status', 'Total']}
        rows={d.orders.map((o) => [
          <Button key="o" size="small" component={RouterLink} to={`/admin/orders/${o._id}`}>{o.orderNumber}</Button>,
          formatDate(o.createdAt), label(o.status), peso(o.total),
        ])} />
      <Section title="Installations" head={['Date', 'Status', 'Technician']}
        rows={d.installations.map((i) => [i.scheduledDate ? formatDate(i.scheduledDate) : 'Not scheduled', label(i.status), i.technician || '-'])} />
      <Section title="Service requests" head={['Requested', 'Type', 'Status', 'Scheduled']}
        rows={d.serviceRequests.map((r) => [formatDate(r.createdAt), label(r.type), label(r.status), r.scheduledDate ? formatDate(r.scheduledDate) : '-'])} />
      <Section title="Warranties" head={['Product', 'Serial number', 'Expires', 'Status']}
        rows={d.warranties.map((w) => [w.product, w.serialNumber, formatDate(w.expiryDate), label(w.status)])} />
    </Stack>
  );
}