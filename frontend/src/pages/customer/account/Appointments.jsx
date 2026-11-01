import { useEffect, useState } from 'react';
import { Alert, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { fetchAppointments } from '../../../api/afterSales';
import { formatDate } from '../../../utils/format';

const COLOR = { pending: 'default', submitted: 'default', scheduled: 'info', in_progress: 'warning', completed: 'success', cancelled: 'error' };
const label = (s) => String(s).replace(/_/g, ' ');

export default function Appointments() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments().then(setRows).catch((e) => setError(e.message));
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>My appointments</Typography>
      <Typography sx={{ color: 'text.secondary', mt: -1 }}>Your installations and service visits.</Typography>
      {!rows && !error && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {rows?.length === 0 && <Alert severity="info">No appointments yet. Installations appear here once your order is delivered and scheduled.</Alert>}
      {rows?.map((a) => (
        <Paper key={`${a.kind}-${a._id}`} sx={{ p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <div>
              <Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{a.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {a.date ? `Scheduled for ${formatDate(a.date)}` : 'Waiting to be scheduled'}{a.staff ? ` · Technician: ${a.staff}` : ''}
              </Typography>
            </div>
            <Chip size="small" color={COLOR[a.status] || 'default'} label={label(a.status)} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}