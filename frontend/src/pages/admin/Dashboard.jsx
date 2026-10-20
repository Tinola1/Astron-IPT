import { Link as RouterLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button, Paper, Typography } from '@mui/material';

export default function Dashboard() {
  const user = useSelector((s) => s.auth.user);
  return (
    <>
      <Typography variant="h4" fontWeight={800}>Dashboard</Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography>Welcome, {user?.name}. Sales, pending orders, low stock and upcoming installations will appear here.</Typography>
        {user?.role === 'admin' && (
          <Button component={RouterLink} to="/admin/products" variant="contained" sx={{ mt: 2 }}>
            Manage products
          </Button>
        )}
      </Paper>
    </>
  );
}