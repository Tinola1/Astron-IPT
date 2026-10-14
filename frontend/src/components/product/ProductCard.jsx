import { Box, Button, Card, CardContent, Checkbox, Chip, FormControlLabel, Rating, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { peso } from '../../utils/format';

export default function ProductCard({ product: p, compared, onToggleCompare }) {
  const lowStock = p.available && p.onlineStock <= 3;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ height: 140, bgcolor: '#eef2fb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>
        {p.image ? (
          <img src={p.image} alt={p.name} style={{ maxHeight: 130, maxWidth: '100%', objectFit: 'contain' }} />
        ) : (
          <svg width="64" height="40" viewBox="0 0 64 40" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <rect x="3" y="4" width="58" height="22" rx="5" />
            <path d="M12 32c3 4 7 4 10 0M27 32c3 4 7 4 10 0M42 32c3 4 7 4 10 0" />
          </svg>
        )}
      </Box>

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography variant="caption" color="text.secondary">{p.brand} · {p.category}</Typography>
        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.25}>{p.name}</Typography>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          {p.numReviews > 0 ? (
            <>
              <Rating value={p.averageRating} precision={0.5} size="small" readOnly />
              <Typography variant="caption" color="text.secondary">({p.numReviews})</Typography>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">No reviews yet</Typography>
          )}
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          <Chip size="small" label={`${(p.specs.capacityBTU || 0).toLocaleString()} BTU / ${p.specs.capacityHP} HP`} />
          <Chip size="small" label={p.specs.isInverter ? 'Inverter' : 'Non-inverter'} />
          {p.specs.energyRating && <Chip size="small" label={`Energy ${p.specs.energyRating}★`} />}
        </Stack>

        <Typography variant="h6" fontWeight={800} sx={{ mt: 'auto' }}>{peso(p.price)}</Typography>
        <Typography variant="caption" color={p.available ? (lowStock ? 'warning.main' : 'success.main') : 'error.main'}>
          {!p.available ? 'Out of stock' : lowStock ? `Only ${p.onlineStock} left` : 'In stock'}
        </Typography>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <FormControlLabel
            control={<Checkbox size="small" checked={compared} onChange={() => onToggleCompare(p)} />}
            label={<Typography variant="body2">Compare</Typography>}
          />
          <Button
            variant="contained"
            size="small"
            disabled={!p.available}
            onClick={() => toast.info('Add to cart is not yet available.')}
          >
            Add to cart
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}