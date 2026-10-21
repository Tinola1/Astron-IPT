import { Box, ButtonBase, LinearProgress, Rating, Stack, Typography } from '@mui/material';

// Click a bar to filter the list by that star rating (click again to clear)
export default function RatingSummary({ average, count, distribution, selected, onSelect }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
      <Box sx={{ textAlign: 'center', minWidth: 140 }}>
        <Typography variant="h3" fontWeight={800} lineHeight={1}>
          {count ? average.toFixed(1) : '–'}
        </Typography>
        <Rating value={average} precision={0.1} readOnly />
        <Typography variant="body2" color="text.secondary">
          {count} review{count === 1 ? '' : 's'}
        </Typography>
      </Box>

      <Stack spacing={0.5} sx={{ flex: 1, maxWidth: 420 }}>
        {[5, 4, 3, 2, 1].map((star) => {
          const n = distribution[star] || 0;
          const active = selected === String(star);
          return (
            <ButtonBase
              key={star}
              onClick={() => onSelect(active ? '' : String(star))}
              aria-pressed={active}
              aria-label={`${star} star reviews: ${n}`}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, borderRadius: 1, p: 0.25, opacity: selected && !active ? 0.5 : 1 }}
            >
              <Typography variant="body2" sx={{ width: 28 }}>{star}★</Typography>
              <LinearProgress
                variant="determinate"
                value={count ? (n / count) * 100 : 0}
                sx={{ flex: 1, height: 8, borderRadius: 4 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ width: 28, textAlign: 'right' }}>{n}</Typography>
            </ButtonBase>
          );
        })}
      </Stack>
    </Stack>
  );
}