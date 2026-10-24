import { Box, Paper, Typography } from '@mui/material';

export default function AuthCard({ title, subtitle, children }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 4, md: 8 }, px: 2 }}>
      <Paper elevation={2} sx={{ p: { xs: 3, md: 4 }, width: '100%', maxWidth: 440 }}>
        <Typography variant="h5" sx={{
          fontWeight: 800
        }}>{title}</Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mt: 0.5
            }}>
            {subtitle}
          </Typography>
        )}
        {children}
      </Paper>
    </Box>
  );
}