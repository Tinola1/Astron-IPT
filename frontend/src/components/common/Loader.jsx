import { Box, CircularProgress } from '@mui/material';

export default function Loader({ fullPage = false }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        py: 6,
        minHeight: fullPage ? '60vh' : 'auto',
      }}
    >
      <CircularProgress />
    </Box>
  );
}