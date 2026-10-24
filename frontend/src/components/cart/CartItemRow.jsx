import { useDispatch } from 'react-redux';
import { Alert, Box, Checkbox, FormControlLabel, FormGroup, IconButton, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { updateCartItem, removeCartItem } from '../../store/actions/cartActions';
import { MAX_CART_QTY } from '../../utils/constants';
import { peso } from '../../utils/format';

export default function CartItemRow({ item, addOnOptions }) {
  const dispatch = useDispatch();
  const selected = item.addOns.map((a) => a._id);

  const toggleAddOn = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    dispatch(updateCartItem(item._id, { addOns: next }));
  };
  const setQty = (qty) => dispatch(updateCartItem(item._id, { quantity: qty }));

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Box sx={{ width: 96, height: 96, bgcolor: '#eef2fb', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {item.product.image && (
            <img src={item.product.image} alt={item.product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "flex-start"
            }}>
            <div>
              <Typography sx={{
                fontWeight: 700
              }}>{item.product.name}</Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {item.product.modelNumber} · {peso(item.product.price)} each
              </Typography>
            </div>
            <IconButton aria-label="Remove item" onClick={() => dispatch(removeCartItem(item._id))}>
              <DeleteOutlineIcon />
            </IconButton>
          </Stack>

          {item.issue && <Alert severity="warning" sx={{ my: 1 }}>{item.issue}. Adjust the quantity or remove it to continue.</Alert>}

          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              my: 1
            }}>
            <IconButton size="small" aria-label="Decrease quantity" disabled={item.quantity <= 1} onClick={() => setQty(item.quantity - 1)}>
              <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</Typography>
            <IconButton size="small" aria-label="Increase quantity" disabled={item.quantity >= MAX_CART_QTY || item.quantity >= item.product.stock} onClick={() => setQty(item.quantity + 1)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>

          {addOnOptions.length > 0 && (
            <>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>Add-ons</Typography>
              <FormGroup>
                {addOnOptions.map((a) => (
                  <FormControlLabel
                    key={a._id}
                    control={<Checkbox size="small" checked={selected.includes(a._id)} onChange={() => toggleAddOn(a._id)} />}
                    label={<Typography variant="body2">{a.name} (+{peso(a.price)} each)</Typography>}
                  />
                ))}
              </FormGroup>
            </>
          )}
        </Box>

        <Typography
          sx={{
            fontWeight: 800,
            alignSelf: { sm: 'center' },
            minWidth: 100,
            textAlign: 'right'
          }}>
          {peso(item.lineTotal)}
        </Typography>
      </Stack>
    </Paper>
  );
}