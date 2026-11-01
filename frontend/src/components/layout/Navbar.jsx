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
import NotificationBell from '../common/NotificationBell';

export default function Navbar() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const cartCount = useSelector((state) => state.cart.count);
  
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

  const isStaff = user && ['admin', 'staff'].includes(user.role);

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
        <Button component={RouterLink} to="/guides" color="inherit">Buying guides</Button>

        <IconButton component={RouterLink} to="/cart" aria-label="Cart">
          <Badge badgeContent={cartCount} color="primary" showZero>
            <ShoppingCartIcon />
          </Badge>
        </IconButton>

        {user ? (
          <>
            <NotificationBell />
            <Button
              color="inherit"
              startIcon={<AccountCircleIcon />}
              onClick={(e) => setAnchor(e.currentTarget)}
            >
              {user.name.split(' ')[0]}
            </Button>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                {user.role === 'customer' && [
                <MenuItem key="o" onClick={() => go('/account/orders')}>My orders</MenuItem>,
                <MenuItem key="w" onClick={() => go('/account/warranties')}>Warranties</MenuItem>,
                <MenuItem key="s" onClick={() => go('/account/service-requests')}>Service requests</MenuItem>,
              ]}
              {user.role === 'technician' && <MenuItem onClick={() => go('/technician/jobs')}>My jobs</MenuItem>}
              <MenuItem onClick={() => go('/account/profile')}>My profile</MenuItem>
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