import { Link as RouterLink } from 'react-router-dom';
import { Button, Typography } from '@mui/material';

export default function NotFound() {
  return (
    <>
      <Typography variant="h4" fontWeight={800}>Page not found</Typography>
      <Button component={RouterLink} to="/" sx={{ mt: 2 }} variant="contained">Back to shop</Button>
    </>
  );
}