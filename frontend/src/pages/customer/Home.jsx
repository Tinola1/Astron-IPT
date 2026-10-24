import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert, Box, Grid, LinearProgress, MenuItem, Pagination, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { fetchProducts, loadCatalogMeta, setFilters, setViewMode } from '../../store/actions/productActions';
import { toggleCompare } from '../../store/actions/compareActions';
import { MAX_COMPARE } from '../../store/reducers/compareReducer';
import { useNavigate } from 'react-router-dom';
import { addToCart } from '../../store/actions/cartActions';
import RoomSizeFinder from '../../components/product/RoomSizeFinder';
import ProductFilters from '../../components/product/ProductFilters';
import ProductCard from '../../components/product/ProductCard';
import CompareBar from '../../components/product/CompareBar';

export default function Home() {
  const dispatch = useDispatch();
  const { items, page, pages, total, loading, error, filters, viewMode } = useSelector((s) => s.products);
  const compare = useSelector((s) => s.compare);
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const sentinelRef = useRef(null);

  useEffect(() => {
    dispatch(loadCatalogMeta());
  }, [dispatch]);

  // any filter / view-mode change starts again from page 1
  useEffect(() => {
    dispatch(fetchProducts(1));
  }, [dispatch, filters, viewMode]);

  // ---- infinite scroll ----
  const loadMore = useCallback(() => {
    if (!loading && page < pages) dispatch(fetchProducts(page + 1, true));
  }, [dispatch, loading, page, pages]);

  useEffect(() => {
    if (viewMode !== 'infinite' || !sentinelRef.current) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), {
      rootMargin: '300px',
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [viewMode, loadMore]);

  const handleToggleCompare = (product) => {
    const isSelected = compare.some((p) => p._id === product._id);
    if (!isSelected && compare.length >= MAX_COMPARE) {
      toast.warn(`You can compare up to ${MAX_COMPARE} units`);
      return;
    }
    dispatch(toggleCompare(product));
  };

  const handleAddToCart = async (product) => {
    if (!user) {
      toast.info('Please log in to add items to your cart');
      navigate('/login', { state: { from: { pathname: '/' } } });
      return;
    }
    if (user.role !== 'customer') {
      toast.info('The cart is for customer accounts');
      return;
    }
    if (await dispatch(addToCart(product._id))) toast.success(`${product.name} added to cart`);
  };

  const handlePage = (_, p) => {
    dispatch(fetchProducts(p));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Stack spacing={3}>
      <RoomSizeFinder />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <ProductFilters />
        </Grid>

        <Grid size={{ xs: 12, md: 9 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{
              justifyContent: "space-between",
              alignItems: { sm: 'center' },
              mb: 2
            }}>
            <Typography sx={{
              color: "text.secondary"
            }}>{total} unit{total === 1 ? '' : 's'} found</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                select size="small" label="Sort by" value={filters.sort} sx={{ minWidth: 180 }}
                onChange={(e) => dispatch(setFilters({ sort: e.target.value }))}
              >
                <MenuItem value="price_asc">Price: low to high</MenuItem>
                <MenuItem value="price_desc">Price: high to low</MenuItem>
                <MenuItem value="rating">Top rated</MenuItem>
                <MenuItem value="newest">Newest</MenuItem>
                <MenuItem value="name">Name</MenuItem>
              </TextField>
              <ToggleButtonGroup
                size="small" exclusive value={viewMode}
                onChange={(_, v) => v && dispatch(setViewMode(v))}
                aria-label="List mode"
              >
                <ToggleButton value="pagination">Pages</ToggleButton>
                <ToggleButton value="infinite">Scroll</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>

          {loading && <LinearProgress sx={{ mb: 2 }} />}
          {error && <Alert severity="error" sx={{ mb: 2 }}>Can't load products: {error}. Is the backend running?</Alert>}
          {!loading && !error && items.length === 0 && (
            <Alert severity="info">No units match these filters. Clear a filter to see more.</Alert>
          )}

          <Grid container spacing={2}>
            {items.map((p) => (
              <Grid key={p._id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <ProductCard
                  product={p}
                  compared={compare.some((c) => c._id === p._id)}
                  onToggleCompare={handleToggleCompare}
                  onAddToCart={handleAddToCart}
                />
              </Grid>
            ))}
          </Grid>

          {viewMode === 'pagination' && pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={pages} page={page} onChange={handlePage} color="primary" disabled={loading} />
            </Box>
          )}

          {viewMode === 'infinite' && (
            <Box ref={sentinelRef} sx={{ py: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {page >= pages && items.length > 0 ? "You've reached the end" : ''}
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      <CompareBar />
    </Stack>
  );
}