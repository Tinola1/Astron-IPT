import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, Chip, FormControlLabel, FormGroup, Grid, IconButton, Paper, Rating, Stack,
  Table, TableBody, TableCell, TableRow, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { toast } from 'react-toastify';
import Loader from '../../components/common/Loader';
import ReviewSection from '../../components/product/ReviewSection';
import WishlistButton from '../../components/product/WishlistButton';
import { fetchProductDetail, clearProductDetail } from '../../store/actions/productDetailActions';
import { addToCart } from '../../store/actions/cartActions';
import { getAddOns } from '../../api/catalog';
import { MAX_CART_QTY } from '../../utils/constants';
import { peso } from '../../utils/format';

const dash = (v) => (v === undefined || v === null || v === '' ? '–' : v);

function specRows(p) {
  const s = p.specs || {};
  const d = s.dimensions;
  return [
    ['Cooling capacity', s.capacityBTU ? `${s.capacityBTU.toLocaleString()} BTU / ${dash(s.capacityHP)} HP` : '–'],
    ['Inverter', s.isInverter ? 'Yes' : 'No'],
    ['Energy rating', s.energyRating ? `${s.energyRating} star${s.energyRating === '1' ? '' : 's'}` : '–'],
    ['Power consumption', s.powerConsumptionWatts ? `${s.powerConsumptionWatts} W` : '–'],
    ['Refrigerant', dash(s.refrigerantType)],
    ['Noise level', s.noiseLevelDb ? `${s.noiseLevelDb} dB` : '–'],
    ['Dimensions (W×H×D)', d?.width ? `${d.width} × ${d.height} × ${d.depth} mm` : '–'],
    ['Warranty', s.warrantyMonths ? `${s.warrantyMonths} months` : '–'],
    ['Recommended room size', p.recommendedRoomSize?.minSqm != null
      ? `${p.recommendedRoomSize.minSqm}–${dash(p.recommendedRoomSize.maxSqm)} m²` : '–'],
  ];
}

export default function ProductDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const { product, error } = useSelector((s) => s.productDetail);

  const [addOnOptions, setAddOnOptions] = useState([]);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    dispatch(clearProductDetail());
    dispatch(fetchProductDetail(id));
    setQty(1);
    setSelectedAddOns([]);
    setImgIndex(0);
    window.scrollTo({ top: 0 });
  }, [dispatch, id]);

  useEffect(() => {
    getAddOns().then(setAddOnOptions).catch(() => {});
  }, []);

  if (product?._id !== id)
    return error ? (
      <Stack spacing={2} sx={{
        alignItems: "flex-start"
      }}>
        <Alert severity="error">{error}</Alert>
        <Button component={RouterLink} to="/" variant="contained">Back to shop</Button>
      </Stack>
    ) : (
      <Loader fullPage />
    );

  const maxQty = Math.max(Math.min(MAX_CART_QTY, product.onlineStock), 1);
  const toggleAddOn = (aid) =>
    setSelectedAddOns((cur) => (cur.includes(aid) ? cur.filter((x) => x !== aid) : [...cur, aid]));

  const handleAdd = async () => {
    if (!user) {
      toast.info('Please log in to add items to your cart');
      navigate('/login', { state: { from: { pathname: `/products/${product._id}` } } });
      return;
    }
    if (user.role !== 'customer') {
      toast.info('The cart is for customer accounts');
      return;
    }
    if (await dispatch(addToCart(product._id, qty, selectedAddOns))) toast.success(`${product.name} added to cart`);
  };

  const mainImage = product.images[imgIndex];

  return (
    <Stack spacing={4}>
      <Button component={RouterLink} to="/" sx={{ alignSelf: 'flex-start' }}>← Back to shop</Button>

      <Grid container spacing={4}>
        {/* gallery */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ height: { xs: 280, md: 380 }, bgcolor: '#eef2fb', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {mainImage ? (
              <img src={mainImage} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <Typography sx={{
                color: "text.secondary"
              }}>No photo available</Typography>
            )}
          </Box>
          {product.images.length > 1 && (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: "wrap",
                mt: 1.5
              }}>
              {product.images.map((url, i) => (
                <Box
                  key={url}
                  component="button"
                  type="button"
                  onClick={() => setImgIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  sx={{
                    width: 72, height: 72, p: 0, cursor: 'pointer', borderRadius: 1.5, overflow: 'hidden', bgcolor: '#eef2fb',
                    border: '2px solid', borderColor: i === imgIndex ? 'primary.main' : 'transparent',
                  }}
                >
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))}
            </Stack>
          )}
        </Grid>

        {/* info + purchase */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={1.5}>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>{product.brand} · {product.category}</Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                lineHeight: 1.15
              }}>{product.name}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>Model {product.modelNumber}</Typography>

            <Stack direction="row" spacing={1} sx={{
              alignItems: "center"
            }}>
              <Rating value={product.averageRating} precision={0.1} readOnly />
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {product.numReviews ? `${product.averageRating.toFixed(1)} (${product.numReviews})` : 'No reviews yet'}
              </Typography>
            </Stack>

            <Typography variant="h4" sx={{
              fontWeight: 800
            }}>{peso(product.price)}</Typography>
            <Box>
              <Chip
                size="small"
                color={product.available ? 'success' : 'error'}
                label={!product.available ? 'Out of stock' : product.onlineStock <= 3 ? `Only ${product.onlineStock} left` : 'In stock'}
              />
            </Box>

            {product.available && addOnOptions.length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="body2" sx={{
                  fontWeight: 600
                }}>Add-ons (optional)</Typography>
                <FormGroup>
                  {addOnOptions.map((a) => (
                    <FormControlLabel
                      key={a._id}
                      control={<Checkbox size="small" checked={selectedAddOns.includes(a._id)} onChange={() => toggleAddOn(a._id)} />}
                      label={<Typography variant="body2">{a.name} (+{peso(a.price)})</Typography>}
                    />
                  ))}
                </FormGroup>
              </Paper>
            )}

            <Stack direction="row" spacing={2} sx={{
              alignItems: "center"
            }}>
              <Stack direction="row" sx={{
                alignItems: "center"
              }}>
                <IconButton aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}><RemoveIcon /></IconButton>
                <Typography sx={{ minWidth: 28, textAlign: 'center' }}>{qty}</Typography>
                <IconButton aria-label="Increase quantity" disabled={qty >= maxQty} onClick={() => setQty(qty + 1)}><AddIcon /></IconButton>
              </Stack>
              <Button variant="contained" size="large" disabled={!product.available} onClick={handleAdd} sx={{ flex: 1 }}>
                Add to cart
              </Button>
              <WishlistButton productId={product._id} sx={{ border: 1, borderColor: 'divider' }} />
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      {product.description && (
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              mb: 1
            }}>About this unit</Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{product.description}</Typography>
        </Box>
      )}

      <Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            mb: 1
          }}>Specifications</Typography>
        <Paper variant="outlined">
          <Table size="small">
            <TableBody>
              {specRows(product).map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600, width: '40%' }}>{label}</TableCell>
                  <TableCell>{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <ReviewSection productId={product._id} />
    </Stack>
  );
}