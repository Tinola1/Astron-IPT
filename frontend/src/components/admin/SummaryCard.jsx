import { Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography } from '@mui/material';

// A headline number. Pass `to` to make the whole card a link.
export default function SummaryCard({ title, value, caption, to, color = 'primary.main' }) {
  const card = (
    <Paper sx={{ p: 2.5, height: '100%', borderTop: '4px solid', borderColor: color }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5 }}>
        {value}
      </Typography>
      {caption && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {caption}
        </Typography>
      )}
    </Paper>
  );
  if (!to) return card;
  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{ display: 'block', height: '100%', color: 'inherit', textDecoration: 'none' }}
    >
      {card}
    </Box>
  );
}