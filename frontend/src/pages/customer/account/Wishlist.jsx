import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, Paper, Rating, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { fetchWishlist, toggleWishlist } from '../../../store/actions/wishlistActions';
import { addToCart } from '../../../store/actions/cartActions';
import { peso } from '../../../utils/format';

export default function Wishlist() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((s) => s.wishlist);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const add = async (p) => {
    if (await dispatch(addToCart(p._id))) toast.success(`${p.name} added to cart`);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>My wishlist</Typography>
      <Typography sx={{ color: 'text.secondary', mt: -1 }}>Units you saved for later.</Typography>
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && items.length === 0 && (
        <Alert severity="info" action={<Button component={RouterLink} to="/" size="small">Browse units</Button>}>
          Nothing saved yet. Tap the heart on a unit to keep it here.
        </Alert>
      )}
      {items.map((p) => (
        <Paper key={p._id} sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Box component={RouterLink} to={`/products/${p._id}`} sx={{ width: 96, height: 72, bgcolor: '#eef2fb', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {p.image && <img src={p.image} alt={p.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{p.brand} · {p.category}</Typography>
              <Typography component={RouterLink} to={`/products/${p._id}`} sx={{ display: 'block', fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>{p.name}</Typography>
              {p.numReviews > 0 && <Rating value={p.averageRating} precision={0.5} size="small" readOnly />}
              <Typography variant="caption" color={p.available ? 'success.main' : 'error.main'} sx={{ display: 'block' }}>{p.available ? 'In stock' : 'Out of stock'}</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{peso(p.price)}</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" disabled={!p.available} onClick={() => add(p)}>Add to cart</Button>
              <Button size="small" color="error" onClick={() => dispatch(toggleWishlist(p._id))}>Remove</Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}