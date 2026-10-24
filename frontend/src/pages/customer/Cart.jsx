import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { fetchCart } from '../../store/actions/cartActions';
import { getAddOns } from '../../api/catalog';
import CartItemRow from '../../components/cart/CartItemRow';
import OrderSummary from '../../components/cart/OrderSummary';

export default function Cart() {
  const dispatch = useDispatch();
  const cart = useSelector((s) => s.cart);
  const [addOnOptions, setAddOnOptions] = useState([]);

  useEffect(() => {
    dispatch(fetchCart());
    getAddOns().then(setAddOnOptions).catch(() => {});
  }, [dispatch]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{
        fontWeight: 800
      }}>Your cart</Typography>
      {cart.loading && <LinearProgress />}
      {cart.error && <Alert severity="error">{cart.error}</Alert>}

      {!cart.loading && cart.items.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ mb: 2 }}>Your cart is empty.</Typography>
          <Button component={RouterLink} to="/" variant="contained">Browse air conditioners</Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={2}>
              {cart.items.map((item) => (
                <CartItemRow key={item._id} item={item} addOnOptions={addOnOptions} />
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2, position: { md: 'sticky' }, top: { md: 80 } }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  mb: 1.5
                }}>Order summary</Typography>
              <OrderSummary totals={cart} deliveryPending />
              <Button
                component={RouterLink}
                to="/checkout"
                variant="contained"
                fullWidth
                size="large"
                sx={{ mt: 2 }}
                disabled={cart.hasIssues || cart.items.length === 0}
              >
                Proceed to checkout
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
}