import { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar, Box, Collapse, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LogoutIcon from '@mui/icons-material/Logout';
import PaidIcon from '@mui/icons-material/Paid';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import HomeRepairServiceIcon from '@mui/icons-material/HomeRepairService';
import PeopleIcon from '@mui/icons-material/People';
import WebIcon from '@mui/icons-material/Web';
import BadgeIcon from '@mui/icons-material/Badge';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CategoryIcon from '@mui/icons-material/Category';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BuildIcon from '@mui/icons-material/Build';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import StoreIcon from '@mui/icons-material/Store';
import { toast } from 'react-toastify';
import { logout } from '../../store/actions/authActions';
import NotificationBell from '../common/NotificationBell';

const WIDTH = 260;

// Each group is a folder in the sidebar, named for the part of the store it manages.
// A person only sees the items their role may open, and a group with none is hidden.
const GROUPS = [
  {
    key: 'sales', label: 'Sales', icon: <PaidIcon />,
    items: [
      { label: 'Orders', to: '/admin/orders', icon: <ReceiptLongIcon />, roles: ['admin'] },
      { label: 'Reports', to: '/admin/reports', icon: <AssessmentIcon />, roles: ['admin'] },
      { label: 'Promotions', to: '/admin/promotions', icon: <LocalOfferIcon />, roles: ['admin'] },
    ],
  },
  {
    key: 'catalog', label: 'Products & stock', icon: <Inventory2Icon />,
    items: [
      { label: 'Products', to: '/admin/products', icon: <Inventory2Icon />, roles: ['admin'] },
      { label: 'Types & brands', to: '/admin/catalog', icon: <CategoryIcon />, roles: ['admin'] },
      { label: 'Inventory', to: '/admin/inventory', icon: <WarehouseIcon />, roles: ['admin'] },
      { label: 'Delivery & add-ons', to: '/admin/shop', icon: <LocalShippingIcon />, roles: ['admin'] },
    ],
  },
  {
    key: 'service', label: 'Installation & service', icon: <HomeRepairServiceIcon />,
    items: [
      { label: 'Installations', to: '/admin/installations', icon: <EngineeringIcon />, roles: ['admin', 'staff'] },
      { label: 'Service requests', to: '/admin/service-requests', icon: <BuildIcon />, roles: ['admin', 'staff'] },
    ],
  },
  {
    key: 'customers', label: 'Customers', icon: <PeopleIcon />,
    items: [
      { label: 'Customer records', to: '/admin/customers', icon: <PeopleIcon />, roles: ['admin', 'staff'] },
      { label: 'Reviews', to: '/admin/reviews', icon: <RateReviewIcon />, roles: ['admin'] },
    ],
  },
  {
    key: 'website', label: 'Website', icon: <WebIcon />,
    items: [
      { label: 'Website content', to: '/admin/content', icon: <ViewCarouselIcon />, roles: ['admin'] },
      { label: 'Store info', to: '/admin/store-info', icon: <StoreIcon />, roles: ['admin'] },
    ],
  },
  {
    key: 'team', label: 'Team', icon: <BadgeIcon />,
    items: [{ label: 'Staff & technicians', to: '/admin/team', icon: <BadgeIcon />, roles: ['admin'] }],
  },
];

export default function AdminLayout() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  // folders the person opened or closed by hand; the others open by themselves when they hold the current page
  const [manual, setManual] = useState({});
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success('Logged out');
    navigate('/');
  };

  const isActive = (n) => pathname === n.to || pathname.startsWith(`${n.to}/`);
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((n) => n.roles.includes(user?.role)) })).filter((g) => g.items.length);

  const drawer = (
    <Box sx={{ width: WIDTH, display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden' }}>
      <Toolbar>
        <Typography variant="h6" color="primary" noWrap sx={{ fontWeight: 800, flex: 1, minWidth: 0 }}>Astron Admin</Typography>
        <NotificationBell />
      </Toolbar>
      <Divider />

      {/* only this middle part scrolls (up and down); the header and the log out buttons stay in place */}
      <List dense sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <ListItemButton component={RouterLink} to="/admin" selected={pathname === '/admin'} onClick={() => setOpen(false)}>
          <ListItemIcon sx={{ minWidth: 40 }}><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>

        {groups.map((g) => {
          const holdsPage = g.items.some(isActive);
          const expanded = manual[g.key] ?? holdsPage;
          return (
            <Box key={g.key}>
              <ListItemButton onClick={() => setManual((m) => ({ ...m, [g.key]: !expanded }))} aria-expanded={expanded}>
                <ListItemIcon sx={{ minWidth: 40, color: holdsPage ? 'primary.main' : 'inherit' }}>{g.icon}</ListItemIcon>
                <ListItemText primary={g.label} slotProps={{ primary: { noWrap: true, sx: { fontWeight: 700 } } }} />
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </ListItemButton>
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <List dense disablePadding>
                  {g.items.map((n) => (
                    <ListItemButton
                      key={n.to} component={RouterLink} to={n.to} selected={isActive(n)} onClick={() => setOpen(false)}
                      sx={{ pl: 4 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{n.icon}</ListItemIcon>
                      <ListItemText primary={n.label} slotProps={{ primary: { noWrap: true } }} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </List>

      <Divider />
      <List dense>
        <ListItemButton component={RouterLink} to="/">
          <ListItemIcon sx={{ minWidth: 40 }}><StorefrontIcon /></ListItemIcon>
          <ListItemText primary="View store" />
        </ListItemButton>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon sx={{ minWidth: 40 }}><LogoutIcon /></ListItemIcon>
          {/* a long email has no spaces to wrap at, so it is cut with "..." instead of stretching the menu */}
          <ListItemText
            primary="Log out" secondary={user?.email} sx={{ minWidth: 0 }}
            slotProps={{ secondary: { noWrap: true, title: user?.email } }}
          />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {desktop ? (
        <Drawer variant="permanent" sx={{ width: WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: WIDTH, boxSizing: 'border-box', overflowX: 'hidden' } }}>
          {drawer}
        </Drawer>
      ) : (
        <>
          <AppBar position="fixed" color="inherit" elevation={1}>
            <Toolbar>
              <IconButton edge="start" onClick={() => setOpen(true)} aria-label="Open menu"><MenuIcon /></IconButton>
              <Typography color="primary" sx={{ fontWeight: 800, ml: 1 }}>Astron Admin</Typography>
            </Toolbar>
          </AppBar>
          <Drawer open={open} onClose={() => setOpen(false)} sx={{ '& .MuiDrawer-paper': { width: WIDTH, maxWidth: '85vw', boxSizing: 'border-box', overflowX: 'hidden' } }}>
            {drawer}
          </Drawer>
        </>
      )}

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, pt: { xs: 10, md: 3 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}