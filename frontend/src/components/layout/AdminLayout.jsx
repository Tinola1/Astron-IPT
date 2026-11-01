import { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LogoutIcon from '@mui/icons-material/Logout';
import { toast } from 'react-toastify';
import { logout } from '../../store/actions/authActions';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RateReviewIcon from '@mui/icons-material/RateReview';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BuildIcon from '@mui/icons-material/Build';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StoreIcon from '@mui/icons-material/Store';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import NotificationBell from '../common/NotificationBell';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BadgeIcon from '@mui/icons-material/Badge';
import CategoryIcon from '@mui/icons-material/Category';

const WIDTH = 240;
const NAV = [
  { label: 'Dashboard', to: '/admin', icon: <DashboardIcon />, exact: true },
  { label: 'Inventory', to: '/admin/inventory', icon: <WarehouseIcon />, roles: ['admin'] },
  { label: 'Installations', to: '/admin/installations', icon: <EngineeringIcon />, roles: ['admin', 'staff'] },
  { label: 'Products', to: '/admin/products', icon: <Inventory2Icon />, roles: ['admin'] },
  { label: 'Types & brands', to: '/admin/catalog', icon: <CategoryIcon />, roles: ['admin'] },
  { label: 'Orders', to: '/admin/orders', icon: <ReceiptLongIcon />, roles: ['admin'] },
  { label: 'Service requests', to: '/admin/service-requests', icon: <BuildIcon />, roles: ['admin', 'staff'] },
  { label: 'Customers', to: '/admin/customers', icon: <PeopleIcon />, roles: ['admin', 'staff'] },
  { label: 'Staff & technicians', to: '/admin/team', icon: <BadgeIcon />, roles: ['admin'] },
  { label: 'Reports', to: '/admin/reports', icon: <AssessmentIcon />, roles: ['admin'] },
  { label: 'Promotions', to: '/admin/promotions', icon: <LocalOfferIcon />, roles: ['admin'] },
  { label: 'Website content', to: '/admin/content', icon: <ViewCarouselIcon />, roles: ['admin'] },
  { label: 'Store info', to: '/admin/store-info', icon: <StoreIcon />, roles: ['admin'] },
  { label: 'Reviews', to: '/admin/reviews', icon: <RateReviewIcon />, roles: ['admin'] },
];

export default function AdminLayout() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success('Logged out');
    navigate('/');
  };

  const drawer = (
    <Box sx={{ width: WIDTH, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Typography variant="h6" color="primary" sx={{
          fontWeight: 800,
          flex: 1
        }}>Astron Admin</Typography>
        <NotificationBell />
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1 }}>
        {NAV.filter((n) => !n.roles || n.roles.includes(user?.role)).map((n) => (
          <ListItemButton
            key={n.to}
            component={RouterLink}
            to={n.to}
            selected={n.exact ? pathname === n.to : pathname.startsWith(n.to)}
            onClick={() => setOpen(false)}
          >
            <ListItemIcon>{n.icon}</ListItemIcon>
            <ListItemText primary={n.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List>
        <ListItemButton component={RouterLink} to="/">
          <ListItemIcon><StorefrontIcon /></ListItemIcon>
          <ListItemText primary="View store" />
        </ListItemButton>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Log out" secondary={user?.email} />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {desktop ? (
        <Drawer variant="permanent" sx={{ width: WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: WIDTH } }}>
          {drawer}
        </Drawer>
      ) : (
        <>
          <AppBar position="fixed" color="inherit" elevation={1}>
            <Toolbar>
              <IconButton edge="start" onClick={() => setOpen(true)} aria-label="Open menu"><MenuIcon /></IconButton>
              <Typography
                color="primary"
                sx={{
                  fontWeight: 800,
                  ml: 1
                }}>Astron Admin</Typography>
            </Toolbar>
          </AppBar>
          <Drawer open={open} onClose={() => setOpen(false)}>{drawer}</Drawer>
        </>
      )}

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, pt: { xs: 10, md: 3 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}