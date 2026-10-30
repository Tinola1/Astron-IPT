import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Paper, Stack, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import RHFSelect from '../../../components/common/RHFSelect';
import RHFTextField from '../../../components/common/RHFTextField';
import { createServiceRequest, fetchMyRequests, fetchWarranties } from '../../../api/afterSales';
import { REQUEST_TYPES, serviceRequestSchema } from '../../../validators/serviceSchemas';
import { todayISO } from '../../../utils/dates';
import { formatDate } from '../../../utils/format';

const STATUS_COLOR = {
  submitted: 'default', under_review: 'info', approved: 'success', rejected: 'error',
  scheduled: 'info', in_progress: 'primary', completed: 'success',
};
const label = (s) => String(s).replace(/_/g, ' ');

function RequestDialog({ warranties, defaults, onClose, onCreated }) {
  const {
    register, handleSubmit, control, formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(serviceRequestSchema),
    defaultValues: { type: defaults.type, warranty: defaults.warranty, description: '', preferredDate: '' },
  });

  const onSubmit = async (v) => {
    try {
      await createServiceRequest({
        type: v.type,
        warranty: v.warranty || undefined,
        description: v.description,
        preferredDate: v.preferredDate || undefined,
      });
      toast.success('Request sent. We will update you by email.');
      onCreated();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle>New service request</DialogTitle>
        <DialogContent>
          <RHFSelect name="type" label="What do you need?" control={control} errors={errors} options={REQUEST_TYPES} />
          <RHFSelect
            name="warranty" label="Which unit? (required for warranty claims)" control={control} errors={errors}
            options={[{ value: '', label: 'Not listed / not sure' }, ...warranties.map((w) => ({ value: w._id, label: `${w.product.name} · ${w.serialNumber}` }))]}
          />
          <RHFTextField
            name="description" label="Describe the problem or service" register={register} errors={errors}
            multiline minRows={3} slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
          <RHFTextField
            name="preferredDate" label="Preferred date (optional)" type="date" register={register} errors={errors}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayISO() } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send request'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function ServiceRequests() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // opened straight from the Warranties page: /account/service-requests?warranty=ID&type=warranty_claim
  const [dialog, setDialog] = useState(() =>
    params.get('warranty') || params.get('type')
      ? { type: params.get('type') || 'repair', warranty: params.get('warranty') || '' }
      : null
  );

  const load = useCallback(async () => {
    try {
      const [reqs, wars] = await Promise.all([fetchMyRequests(), fetchWarranties()]);
      setList(reqs);
      setWarranties(wars);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeDialog = () => {
    setDialog(null);
    if (params.toString()) setParams({}, { replace: true });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Service requests</Typography>
        <Button variant="contained" onClick={() => setDialog({ type: 'repair', warranty: '' })}>New request</Button>
      </Stack>
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && list.length === 0 && (
        <Alert severity="info">You have not made any service requests yet.</Alert>
      )}

      {list.map((r) => (
        <Paper key={r._id} sx={{ p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{label(r.type)}</Typography>
            <Chip size="small" color={STATUS_COLOR[r.status]} label={label(r.status)} />
          </Stack>
          {r.product && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{r.product} · Serial {r.serialNumber}</Typography>
          )}
          <Typography sx={{ mt: 1, whiteSpace: 'pre-line' }}>{r.description}</Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            Sent {formatDate(r.createdAt)}
            {r.preferredDate && ` · You asked for ${formatDate(r.preferredDate)}`}
            {r.scheduledDate && ` · Scheduled for ${formatDate(r.scheduledDate)}`}
          </Typography>
          {r.note && <Alert severity="info" sx={{ mt: 1 }}>Note from Astron: {r.note}</Alert>}
        </Paper>
      ))}

      {dialog && (
        <RequestDialog
          warranties={warranties}
          defaults={dialog}
          onClose={closeDialog}
          onCreated={() => { closeDialog(); load(); }}
        />
      )}
    </Stack>
  );
}