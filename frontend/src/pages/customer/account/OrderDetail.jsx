import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, Paper,
  Stack, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import Loader from '../../../components/common/Loader';
import OrderSummary from '../../../components/cart/OrderSummary';
import { fetchOrder, cancelOrder } from '../../../store/actions/orderActions';
import { ORDER_STATUS, PAYMENT_METHODS } from '../../../utils/constants';
import { formatDate, formatDateTime, peso } from '../../../utils/format';
import { downloadReceipt } from '../../../api/orders';
import { saveBlob } from '../../../utils/download';

const CANCELLABLE = ['pending', 'processing'];

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const { current: order, error } = useSelector((s) => s.orders);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchOrder(id));
  }, [dispatch, id]);

  if (order?._id !== id) return error ? <Alert severity="error">{error}</Alert> : <Loader fullPage />;

  const st = ORDER_STATUS[order.status] || { label: order.status, color: 'default' };
  const payLabel = PAYMENT_METHODS.find((m) => m.value === order.payment.method)?.label || order.payment.method;
  const a = order.shippingAddress || {};

  const handleCancel = async () => {
    if (await dispatch(cancelOrder(id, reason))) {
      toast.success('Order cancelled');
      setOpen(false);
    }
  };

  return (
    <Stack spacing={2}>
      {location.state?.justPlaced && (
        <Alert severity="success">
          Thank you! Your order has been placed. A confirmation email is on its way.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <div>
          <Typography variant="h4" fontWeight={800}>{order.orderNumber}</Typography>
          <Typography color="text.secondary">Placed {formatDateTime(order.createdAt)}</Typography>
        </div>
        <Chip label={st.label} color={st.color} />
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Items</Typography>
              {order.items.map((it, i) => {
                const addOnSum = it.addOns.reduce((s, x) => s + x.price, 0);
                return (
                  <div key={it._id || i}>
                    {i > 0 && <Divider sx={{ my: 1 }} />}
                    <Stack direction="row" justifyContent="space-between">
                      <div>
                        <Typography>{it.name} × {it.quantity}</Typography>
                        {it.addOns.map((x, j) => (
                          <Typography key={j} variant="caption" color="text.secondary" display="block">
                            + {x.name} ({peso(x.price)})
                          </Typography>
                        ))}
                      </div>
                      <Typography fontWeight={700}>{peso((it.price + addOnSum) * it.quantity)}</Typography>
                    </Stack>
                  </div>
                );
              })}
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Status history</Typography>
              <Stack spacing={0.5}>
                {order.statusHistory.map((h, i) => (
                  <Typography key={i} variant="body2">
                    <b>{(ORDER_STATUS[h.status]?.label) || h.status}</b> · {formatDateTime(h.changedAt)}
                    {h.note ? ` · ${h.note}` : ''}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2}>
            <Paper sx={{ p: 2 }}>
              <OrderSummary totals={order} />
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight={700}>Payment</Typography>
              <Typography variant="body2">{payLabel} ({order.payment.status})</Typography>
              <Typography fontWeight={700} sx={{ mt: 1.5 }}>
                {order.fulfillment === 'pickup' ? 'Pickup at showroom' : 'Delivery to'}
              </Typography>
              {order.fulfillment === 'delivery' && (
                <Typography variant="body2">
                  {a.recipient}, {a.phone}<br />
                  {a.street}{a.barangay ? `, ${a.barangay}` : ''}<br />
                  {a.city}, {a.province} {a.postalCode}
                </Typography>
              )}
              {order.installation?.requested && (
                <>
                  <Typography fontWeight={700} sx={{ mt: 1.5 }}>Installation</Typography>
                  <Typography variant="body2">Preferred date: {formatDate(order.installation.preferredDate)}</Typography>
                </>
              )}
            </Paper>
            {CANCELLABLE.includes(order.status) && (
              <Button color="error" variant="outlined" onClick={() => setOpen(true)}>Cancel order</Button>
            )}
              <Button variant="outlined" onClick={async () => {
                try {
                  saveBlob(await downloadReceipt(order._id), `Receipt-${order.orderNumber}.pdf`);
                } catch {
                  toast.error('Could not download the receipt');
                }
              }}>Download receipt (PDF)</Button>
            <Button component={RouterLink} to="/account/orders">Back to my orders</Button>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cancel this order?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Items return to stock. Orders can only be cancelled before delivery.
          </Typography>
          <TextField fullWidth multiline minRows={2} label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Keep order</Button>
          <Button color="error" onClick={handleCancel}>Cancel order</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}