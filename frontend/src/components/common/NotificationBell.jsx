import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Divider, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { fetchNotifications, markAllRead, markRead } from '../../api/notifications';
import { formatDateTime } from '../../utils/format';

// Bell with the user's latest notifications. Checks again every minute while it is on screen.
export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const [data, setData] = useState({ items: [], unread: 0 });

  const load = useCallback(() => fetchNotifications().then(setData).catch(() => {}), []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);

  const openItem = async (n) => {
    setAnchor(null);
    if (!n.isRead) await markRead(n._id).catch(() => {});
    load();
    // only ever follow links inside this site
    if (typeof n.link === 'string' && n.link.startsWith('/') && !n.link.startsWith('//')) navigate(n.link);
  };

  const readAll = async () => {
    await markAllRead().catch(() => {});
    load();
  };

  return (
    <>
      <IconButton aria-label="Notifications" onClick={(e) => { setAnchor(e.currentTarget); load(); }}>
        <Badge badgeContent={data.unread} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { width: 360, maxWidth: '92vw' } } }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>Notifications</Typography>
          <Button size="small" onClick={readAll} disabled={data.unread === 0}>Mark all read</Button>
        </Box>
        <Divider />
        {data.items.length === 0 && <Typography sx={{ p: 2, color: 'text.secondary' }}>Nothing yet.</Typography>}
        {data.items.map((n) => (
          <MenuItem key={n._id} onClick={() => openItem(n)} sx={{ whiteSpace: 'normal', alignItems: 'flex-start', bgcolor: n.isRead ? 'transparent' : 'action.hover' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: n.isRead ? 400 : 700 }}>{n.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{n.message}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{formatDateTime(n.createdAt)}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}