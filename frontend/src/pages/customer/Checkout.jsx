import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert, Button, Checkbox, FormControl, FormControlLabel, FormHelperText, FormLabel, Grid,
  MenuItem, Paper, Radio, RadioGroup, Stack, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import RHFTextField from '../../components/common/RHFTextField';
import Loader from '../../components/common/Loader';
import OrderSummary from '../../components/cart/OrderSummary';
import useDebounce from '../../hooks/useDebounce';
import { fetchCart } from '../../store/actions/cartActions';
import { placeOrder, clearOrderError } from '../../store/actions/orderActions';
import { getQuote } from '../../api/orders';
import { fetchMe } from '../../api/auth';
import { makeCheckoutSchema } from '../../validators/checkoutSchema';
import { PAYMENT_METHODS } from '../../utils/constants';
import { peso } from '../../utils/format';

const ADDRESS_FIELDS = ['recipient', 'phone', 'street', 'barangay', 'city', 'province', 'postalCode'];

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const cart = useSelector((s) => s.cart);
  const { loading: placing, error } = useSelector((s) => s.orders);

  const [cartLoaded, setCartLoaded] = useState(false);
  const [saved, setSaved] = useState([]);
  const [quote, setQuote] = useState(null);
  const [appliedPromo, setAppliedPromo] = useState('');
  const [promoMsg, setPromoMsg] = useState(null);

  const schema = useMemo(() => makeCheckoutSchema(cart.hasInstallation), [cart.hasInstallation]);
  const {
    register, handleSubmit, control, watch, setValue, getValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      fulfillment: 'delivery', recipient: user?.name || '', phone: user?.phone || '',
      street: '', barangay: '', city: '', province: '', postalCode: '',
      saveAddress: false, installationDate: '', paymentMethod: '', promoCode: '',
    },
  });

  const fulfillment = watch('fulfillment');
  const city = useDebounce(watch('city'), 500);
  const province = useDebounce(watch('province'), 500);

  useEffect(() => {
    dispatch(clearOrderError());
    dispatch(fetchCart()).then(() => setCartLoaded(true));
    fetchMe().then((d) => setSaved(d.user.addresses || [])).catch(() => {});
  }, [dispatch]);

  // installation needs delivery to an address
  useEffect(() => {
    if (cart.hasInstallation) setValue('fulfillment', 'delivery');
  }, [cart.hasInstallation, setValue]);

  // live totals (delivery fee depends on city/province, discount on promo)
  useEffect(() => {
    if (!cart.items.length) return;
    let ignore = false;
    getQuote({ fulfillment, city, province, promoCode: appliedPromo })
      .then((q) => {
        if (ignore) return;
        setQuote(q);
        if (q.promoError) {
          setPromoMsg({ error: q.promoError });
          setAppliedPromo('');
        } else if (appliedPromo) {
          setPromoMsg({ ok: `Code ${appliedPromo} applied` });
        }
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [fulfillment, city, province, appliedPromo, cart.items.length, cart.subtotal]);

  const fillAddress = (index) => {
    const a = saved[index];
    if (a) ADDRESS_FIELDS.forEach((f) => setValue(f, a[f] || '', { shouldValidate: true }));
  };

  const applyPromo = () => {
    setPromoMsg(null);
    setAppliedPromo((getValues('promoCode') || '').trim().toUpperCase());
  };

  const onSubmit = async (v) => {
    const payload = {
      fulfillment: v.fulfillment,
      paymentMethod: v.paymentMethod,
      promoCode: appliedPromo,
      installationDate: cart.hasInstallation ? v.installationDate : undefined,
      saveAddress: v.saveAddress,
      shippingAddress:
        v.fulfillment === 'delivery'
          ? Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, v[f]]))
          : undefined,
    };
    const order = await dispatch(placeOrder(payload));
    if (order) {
      toast.success('Order placed!');
      navigate(`/account/orders/${order._id}`, { replace: true, state: { justPlaced: true } });
    }
  };

  if (!cartLoaded) return <Loader fullPage />;
  if (!cart.items.length)
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ mb: 2 }}>Your cart is empty.</Typography>
        <Button component={RouterLink} to="/" variant="contained">Browse air conditioners</Button>
      </Paper>
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 2 }}>Checkout</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {cart.hasIssues && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some items in your cart have stock issues. <RouterLink to="/cart">Review your cart</RouterLink>.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {/* 1. Fulfillment */}
            <Paper sx={{ p: 2 }}>
              <FormControl>
                <FormLabel>Delivery or pickup</FormLabel>
                <Controller
                  name="fulfillment"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup row {...field}>
                      <FormControlLabel value="delivery" control={<Radio />} label="Delivery" />
                      <FormControlLabel value="pickup" control={<Radio />} label="Pickup at showroom" disabled={cart.hasInstallation} />
                    </RadioGroup>
                  )}
                />
                {cart.hasInstallation && (
                  <FormHelperText>Installation is on your order, so we deliver to your address.</FormHelperText>
                )}
              </FormControl>
            </Paper>

            {/* 2. Address */}
            {fulfillment === 'delivery' && (
              <Paper sx={{ p: 2 }}>
                <Typography fontWeight={700}>Delivery address</Typography>
                {saved.length > 0 && (
                  <TextField select fullWidth size="small" label="Use a saved address" value="" sx={{ mt: 2 }} onChange={(e) => fillAddress(e.target.value)}>
                    {saved.map((a, i) => (
                      <MenuItem key={a._id} value={i}>{a.label} - {a.street}, {a.city}</MenuItem>
                    ))}
                  </TextField>
                )}
                <Grid container columnSpacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}><RHFTextField name="recipient" label="Recipient" register={register} errors={errors} /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><RHFTextField name="phone" label="Mobile number" register={register} errors={errors} /></Grid>
                  <Grid size={12}><RHFTextField name="street" label="House no. / street" register={register} errors={errors} /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><RHFTextField name="barangay" label="Barangay (optional)" register={register} errors={errors} /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><RHFTextField name="city" label="City / municipality" register={register} errors={errors} /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><RHFTextField name="province" label="Province" register={register} errors={errors} /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><RHFTextField name="postalCode" label="Postal code (optional)" register={register} errors={errors} /></Grid>
                </Grid>
                <FormControlLabel
                  control={<Controller name="saveAddress" control={control} render={({ field }) => <Checkbox checked={!!field.value} onChange={field.onChange} />} />}
                  label="Save this address to my account"
                />
              </Paper>
            )}

            {/* 3. Installation date */}
            {cart.hasInstallation && (
              <Paper sx={{ p: 2 }}>
                <Typography fontWeight={700}>Installation</Typography>
                <Typography variant="body2" color="text.secondary">
                  Pick the date you'd like our technician to visit. We'll confirm the schedule by email.
                </Typography>
                <RHFTextField
                  name="installationDate"
                  label="Preferred installation date"
                  type="date"
                  register={register}
                  errors={errors}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Paper>
            )}

            {/* 4. Payment */}
            <Paper sx={{ p: 2 }}>
              <FormControl error={!!errors.paymentMethod}>
                <FormLabel>Payment method</FormLabel>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup {...field}>
                      {PAYMENT_METHODS.map((m) => (
                        <FormControlLabel key={m.value} value={m.value} control={<Radio />} label={m.label} />
                      ))}
                    </RadioGroup>
                  )}
                />
                <FormHelperText>{errors.paymentMethod?.message}</FormHelperText>
              </FormControl>
            </Paper>
          </Stack>
        </Grid>

        {/* Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, position: { md: 'sticky' }, top: { md: 80 } }}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>Order summary</Typography>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              {cart.items.map((i) => (
                <Stack key={i._id} direction="row" justifyContent="space-between">
                  <Typography variant="body2">{i.product.name} × {i.quantity}</Typography>
                  <Typography variant="body2">{peso(i.lineTotal)}</Typography>
                </Stack>
              ))}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
              <TextField size="small" fullWidth label="Promo code" {...register('promoCode')} />
              <Button variant="outlined" onClick={applyPromo}>Apply</Button>
            </Stack>
            {promoMsg?.error && <Typography variant="caption" color="error">{promoMsg.error}</Typography>}
            {promoMsg?.ok && <Typography variant="caption" color="success.main">{promoMsg.ok}</Typography>}

            <div style={{ marginTop: 16 }}>
              <OrderSummary
                totals={quote || { ...cart, grandTotal: cart.subtotal }}
                deliveryPending={!quote || quote.deliveryPending}
              />
            </div>
            {quote?.deliveryZone && (
              <Typography variant="caption" color="text.secondary">Delivery zone: {quote.deliveryZone}</Typography>
            )}

            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={placing || cart.hasIssues}>
              {placing ? 'Placing order…' : 'Place order'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </form>
  );
}