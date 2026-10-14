import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Badge, Menu, MenuItem, Box, Divider,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/actions/authActions';

export default function Navbar() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const cartCount = 0; // wired to CartContext in a later batch

  const go = (path) => {
    setAnchor(null);
    navigate(path);
  };

  const handleLogout = async () => {
    setAnchor(null);
    await dispatch(logout());
    toast.success('Logged out');
    navigate('/');
  };

  const isStaff = user && user.role !== 'customer';

  return (
    <AppBar position="sticky" color="inherit" elevation={1}>
      <Toolbar sx={{ gap: 1 }}>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ fontWeight: 800, color: 'primary.main', textDecoration: 'none', mr: 'auto' }}
        >
          Astron
        </Typography>

        <Button component={RouterLink} to="/" color="inherit">Shop</Button>

        <IconButton component={RouterLink} to="/cart" aria-label="Cart">
          <Badge badgeContent={cartCount} color="primary" showZero>
            <ShoppingCartIcon />
          </Badge>
        </IconButton>

        {user ? (
          <>
            <Button
              color="inherit"
              startIcon={<AccountCircleIcon />}
              onClick={(e) => setAnchor(e.currentTarget)}
            >
              {user.name.split(' ')[0]}
            </Button>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
              {user.role === 'customer' && [
                <MenuItem key="p" onClick={() => go('/account/profile')}>My profile</MenuItem>,
                <MenuItem key="o" onClick={() => go('/account/orders')}>My orders</MenuItem>,
                <MenuItem key="w" onClick={() => go('/account/warranties')}>Warranties</MenuItem>,
                <MenuItem key="s" onClick={() => go('/account/service-requests')}>Service requests</MenuItem>,
              ]}
              {isStaff && <MenuItem onClick={() => go('/admin')}>Dashboard</MenuItem>}
              <Divider />
              <MenuItem onClick={handleLogout}>Log out</MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button component={RouterLink} to="/login" color="inherit">Log in</Button>
            <Button component={RouterLink} to="/register" variant="contained">Register</Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}