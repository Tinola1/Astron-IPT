import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  LinearProgress, Stack, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { fetchMyJobs, updateJobStatus } from '../../api/installations';
import { formatDate, formatDateTime } from '../../utils/format';

const COLORS = { scheduled: 'info', in_progress: 'primary', completed: 'success' };
const label = (s) => String(s).replace(/_/g, ' ');
const addressLine = (a = {}) => [a.street, a.barangay, a.city, a.province, a.postalCode].filter(Boolean).join(', ');

export default function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState(null); // { job, status }
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setJobs(await fetchMyJobs());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async () => {
    setSaving(true);
    try {
      await updateJobStatus(action.job._id, { status: action.status, note });
      toast.success(action.status === 'completed' ? 'Job completed. The customer was notified.' : 'Job started');
      setAction(null);
      setNote('');
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>My installation jobs</Typography>
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && jobs.length === 0 && <Alert severity="info">No jobs have been assigned to you yet.</Alert>}

      {jobs.map((j) => {
        const delivered = j.order.status === 'delivered';
        const next = j.status === 'scheduled' ? 'in_progress' : j.status === 'in_progress' ? 'completed' : null;
        return (
          <Card key={j._id} variant="outlined">
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{j.order.orderNumber} · {formatDate(j.scheduledDate)}</Typography>
                <Chip size="small" color={COLORS[j.status]} label={label(j.status)} />
              </Stack>
              <Typography sx={{ mt: 1 }}>{j.customer.name}{j.customer.phone ? ` · ${j.customer.phone}` : ''}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{addressLine(j.address)}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Units: {j.order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
              </Typography>
              {j.notes && (
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line', color: 'text.secondary' }}>Notes: {j.notes}</Typography>
              )}
              {j.completedAt && <Typography variant="caption">Completed {formatDateTime(j.completedAt)}</Typography>}
              {next && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button variant="contained" disabled={!delivered} onClick={() => { setNote(''); setAction({ job: j, status: next }); }}>
                    {next === 'in_progress' ? 'Start job' : 'Mark completed'}
                  </Button>
                  {!delivered && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Waiting for the order to be delivered</Typography>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!action} onClose={() => !saving && setAction(null)} fullWidth maxWidth="xs">
        <DialogTitle>{action?.status === 'completed' ? 'Complete this job?' : 'Start this job?'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {action?.status === 'completed'
              ? 'The order will be marked as installed and the customer will get their receipt by email.'
              : 'The customer will be told that installation has started.'}
          </DialogContentText>
          <TextField
            fullWidth multiline minRows={2} label="Note (optional)" value={note}
            onChange={(e) => setNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAction(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={confirm} disabled={saving}>{saving ? 'Saving…' : 'Confirm'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}