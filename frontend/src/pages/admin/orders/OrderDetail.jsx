import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Button, Checkbox, Chip, Divider, FormControlLabel, Grid, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import Loader from '../../../components/common/Loader';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import OrderSummary from '../../../components/cart/OrderSummary';
import { fetchAdminOrder, updateOrderStatus, clearAdminOrder } from '../../../store/actions/adminOrderActions';
import { downloadAdminReceipt, resendEmailApi } from '../../../api/adminOrders';
import { saveBlob } from '../../../utils/download';
import { ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../../../utils/constants';
import { formatDate, formatDateTime, peso } from '../../../utils/format';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: order, saving, error } = useSelector((s) => s.adminOrders);

  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState('');
  const [payStatus, setPayStatus] = useState('pending');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    dispatch(clearAdminOrder());
    dispatch(fetchAdminOrder(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (order?._id === id) setPayStatus(order.payment.status);
  }, [order?._id, order?.payment?.status, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (order?._id !== id) return error ? <Alert severity="error">{error}</Alert> : <Loader fullPage />;

  const st = ORDER_STATUS[order.status] || { label: order.status, color: 'default' };
  const ps = PAYMENT_STATUS[order.payment.status] || { label: order.payment.status, color: 'default' };
  const payMethod = PAYMENT_METHODS.find((m) => m.value === order.payment.method)?.label || order.payment.method;
  const a = order.shippingAddress || {};
  const paymentEdited = payStatus !== order.payment.status;
  const canSubmit = Boolean(status) || paymentEdited;

  const doUpdate = async () => {
    setConfirmCancel(false);
    const result = await dispatch(
      updateOrderStatus(id, {
        status: status || undefined,
        paymentStatus: paymentEdited ? payStatus : undefined,
        note: note.trim() || undefined,
        notify,
      })
    );
    if (!result) return;
    setStatus('');
    setNote('');
    if (result.email.sent) toast.success('Order updated. The customer was emailed the details and PDF receipt.');
    else if (result.email.skipped) toast.success('Order updated (customer not emailed).');
    else toast.warn(`Order updated, but the email could not be sent: ${result.email.error}`);
  };

  const submit = () => (status === 'cancelled' ? setConfirmCancel(true) : doUpdate());

  const handleReceipt = async () => {
    try {
      saveBlob(await downloadAdminReceipt(id), `Receipt-${order.orderNumber}.pdf`);
    } catch {
      toast.error('Could not download the receipt');
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const d = await resendEmailApi(id);
      toast.success(d.message);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1
        }}>
        <div>
          <Typography variant="h4" sx={{
            fontWeight: 800
          }}>{order.orderNumber}</Typography>
          <Typography sx={{
            color: "text.secondary"
          }}>Placed {formatDateTime(order.createdAt)}</Typography>
        </div>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <Chip label={st.label} color={st.color} />
          <Chip label={`Payment: ${ps.label}`} color={ps.color} variant="outlined" />
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            <Paper sx={{ p: 2 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  mb: 1
                }}>Items</Typography>
              {order.items.map((it, i) => {
                const addOnSum = it.addOns.reduce((s, x) => s + x.price, 0);
                return (
                  <div key={it._id || i}>
                    {i > 0 && <Divider sx={{ my: 1 }} />}
                    <Stack direction="row" sx={{
                      justifyContent: "space-between"
                    }}>
                      <div>
                        <Typography>{it.name} × {it.quantity}</Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            display: "block"
                          }}>
                          {it.modelNumber} · {peso(it.price)} each
                        </Typography>
                        {it.addOns.map((x, j) => (
                          <Typography
                            key={j}
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              display: "block"
                            }}>
                            + {x.name} ({peso(x.price)})
                          </Typography>
                        ))}
                      </div>
                      <Typography sx={{
                        fontWeight: 700
                      }}>{peso((it.price + addOnSum) * it.quantity)}</Typography>
                    </Stack>
                  </div>
                );
              })}
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  mb: 1
                }}>Status history</Typography>
              <Stack spacing={0.5}>
                {order.statusHistory.map((h, i) => (
                  <Typography key={i} variant="body2">
                    <b>{ORDER_STATUS[h.status]?.label || h.status}</b> · {formatDateTime(h.changedAt)}
                    {h.changedBy?.name ? ` · ${h.changedBy.name}` : ''}
                    {h.note ? ` · ${h.note}` : ''}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>
            <Paper sx={{ p: 2 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  mb: 1.5
                }}>Update order</Typography>
              <Stack spacing={2}>
                {order.nextStatuses.length > 0 ? (
                  <TextField select size="small" fullWidth label="Move to status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <MenuItem value="">No status change</MenuItem>
                    {order.nextStatuses.map((s) => (
                      <MenuItem key={s} value={s}>{ORDER_STATUS[s]?.label || s}</MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>No further status changes are available.</Typography>
                )}

                <TextField select size="small" fullWidth label="Payment status" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                  {Object.entries(PAYMENT_STATUS).map(([value, p]) => (
                    <MenuItem key={value} value={value}>{p.label}</MenuItem>
                  ))}
                </TextField>

                <TextField size="small" fullWidth multiline minRows={2} label="Note to customer (optional)" value={note} onChange={(e) => setNote(e.target.value)} />

                <FormControlLabel
                  control={<Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} />}
                  label="Email the customer the updated details and PDF receipt"
                />

                {status === 'delivered' && order.payment.method === 'cod' && order.payment.status === 'pending' && (
                  <Alert severity="info">Cash on delivery: payment will be marked as paid.</Alert>
                )}

                <Button variant="contained" disabled={!canSubmit || saving} onClick={submit}>
                  {saving ? 'Updating…' : 'Update order'}
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <OrderSummary totals={order} />
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography sx={{
                fontWeight: 700
              }}>Customer</Typography>
              <Typography variant="body2">
                {order.user?.name}<br />{order.user?.email}{order.user?.phone ? <><br />{order.user.phone}</> : null}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 700,
                  mt: 1.5
                }}>Payment</Typography>
              <Typography variant="body2">{payMethod}</Typography>
              <Typography
                sx={{
                  fontWeight: 700,
                  mt: 1.5
                }}>
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
                  <Typography
                    sx={{
                      fontWeight: 700,
                      mt: 1.5
                    }}>Installation</Typography>
                  <Typography variant="body2">Preferred date: {formatDate(order.installation.preferredDate)}</Typography>
                </>
              )}
            </Paper>

            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={handleReceipt}>Download receipt (PDF)</Button>
              <Button variant="outlined" disabled={resending} onClick={handleResend}>
                {resending ? 'Sending…' : 'Resend email'}
              </Button>
              <Button component={RouterLink} to="/admin/orders">Back to orders</Button>
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        message="Items go back to stock, any installation job is cancelled, and a paid payment is marked refunded. The customer is emailed if notifications are on."
        confirmText="Cancel order"
        loading={saving}
        onConfirm={doUpdate}
        onClose={() => setConfirmCancel(false)}
      />
    </Stack>
  );
}