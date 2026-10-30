import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { fetchWarranties } from '../../../api/afterSales';
import { formatDate } from '../../../utils/format';

const STATE = {
  active: { label: 'Active', color: 'success' },
  expired: { label: 'Expired', color: 'default' },
  void: { label: 'Void', color: 'error' },
};

export default function Warranties() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWarranties()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>My warranties</Typography>
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && list.length === 0 && (
        <Alert severity="info">Your warranties appear here after your order has been delivered.</Alert>
      )}

      {list.map((w) => {
        const st = STATE[w.state] || STATE.expired;
        return (
          <Paper key={w._id} sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
              <div>
                <Typography sx={{ fontWeight: 700 }}>{w.product.name}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Model {w.product.modelNumber || '-'} · Serial {w.serialNumber}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Purchased {formatDate(w.purchaseDate)} · Covered until {formatDate(w.expiryDate)}
                  {w.state === 'active' && ` (${w.daysLeft} day${w.daysLeft === 1 ? '' : 's'} left)`}
                </Typography>
                {w.nextMaintenanceDate && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Next cleaning suggested around {formatDate(w.nextMaintenanceDate)}
                  </Typography>
                )}
              </div>
              <Chip label={st.label} color={st.color} size="small" />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button size="small" variant="outlined" component={RouterLink} to={`/account/service-requests?warranty=${w._id}`}>
                Request service
              </Button>
              {w.state === 'active' && (
                <Button size="small" variant="contained" component={RouterLink} to={`/account/service-requests?warranty=${w._id}&type=warranty_claim`}>
                  File a warranty claim
                </Button>
              )}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}