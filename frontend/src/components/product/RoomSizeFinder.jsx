import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Box, Button, Paper, Slider, Typography } from '@mui/material';
import { setFilters } from '../../store/actions/productActions';
import { recommendCapacity } from '../../utils/roomSize';

export default function RoomSizeFinder() {
  const dispatch = useDispatch();
  const [sqm, setSqm] = useState(20);
  const { btu, hp, needsMultiple } = recommendCapacity(sqm);

  return (
    <Paper sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { md: '1.3fr 1fr' }, alignItems: 'center' }}>
        <div>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              lineHeight: 1.15
            }}>
            The right aircon for your room, not just the biggest one.
          </Typography>
          <Typography sx={{ mt: 1, opacity: 0.9 }}>
            Tell us your room size and we'll match the cooling capacity. Then compare units and add installation at checkout.
          </Typography>
        </div>

        <Paper sx={{ p: 2, color: 'text.primary' }}>
          <Typography sx={{
            fontWeight: 700
          }}>Find my capacity</Typography>
          <Typography variant="body2" id="sqm-label">Room size: {sqm} m²</Typography>
          <Slider aria-labelledby="sqm-label" min={6} max={70} value={sqm} onChange={(_, v) => setSqm(v)} />
          <Typography aria-live="polite">
            Recommended: <strong>{btu.toLocaleString()} BTU</strong> (about {hp} HP)
          </Typography>
          {needsMultiple && (
            <Typography variant="caption" sx={{
              color: "warning.main"
            }}>
              This room is large; consider two units.
            </Typography>
          )}
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 1.5 }}
            onClick={() => dispatch(setFilters({ btu: String(btu) }))}
          >
            Show matching units
          </Button>
        </Paper>
      </Box>
    </Paper>
  );
}