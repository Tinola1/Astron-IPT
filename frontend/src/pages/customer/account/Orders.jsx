import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { fetchMyOrders } from '../../../store/actions/orderActions';
import { ORDER_STATUS } from '../../../utils/constants';
import { formatDate, peso } from '../../../utils/format';

export default function Orders() {
  const dispatch = useDispatch();
  const { list, loading, error } = useSelector((s) => s.orders);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>My orders</Typography>
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && list.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ mb: 2 }}>You haven't placed any orders yet.</Typography>
          <Button component={RouterLink} to="/" variant="contained">Start shopping</Button>
        </Paper>
      )}
      {list.map((o) => {
        const st = ORDER_STATUS[o.status] || { label: o.status, color: 'default' };
        return (
          <Paper key={o._id} sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
              <div>
                <Typography fontWeight={700}>{o.orderNumber}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? '' : 's'}
                </Typography>
              </div>
              <Chip label={st.label} color={st.color} size="small" />
              <Typography fontWeight={800}>{peso(o.grandTotal)}</Typography>
              <Button component={RouterLink} to={`/account/orders/${o._id}`} variant="outlined" size="small">View</Button>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}