import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import AddressDialog from './AddressDialog';
import ConfirmDialog from '../common/ConfirmDialog';
import { deleteAddress, setDefaultAddress } from '../../store/actions/accountActions';

const MAX_ADDRESSES = 10;

export default function AddressBook({ profile }) {
  const dispatch = useDispatch();
  const { saving } = useSelector((s) => s.account);
  const [dialog, setDialog] = useState({ open: false, address: null });
  const [toDelete, setToDelete] = useState(null);
  const addresses = profile.addresses || [];

  const makeDefault = async (a) => {
    if (await dispatch(setDefaultAddress(a._id))) toast.success(`"${a.label}" is now your default address`);
  };
  const confirmDelete = async () => {
    if (await dispatch(deleteAddress(toDelete._id))) {
      toast.success('Address deleted');
      setToDelete(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Saved addresses
        </Typography>
        <Button
          variant="contained"
          disabled={addresses.length >= MAX_ADDRESSES}
          onClick={() => setDialog({ open: true, address: null })}
        >
          Add address
        </Button>
      </Stack>

      {addresses.length === 0 && (
        <Alert severity="info">
          You have no saved addresses yet. Add one to check out faster, or tick "save this address" at checkout.
        </Alert>
      )}
      {addresses.length >= MAX_ADDRESSES && <Alert severity="warning">You can save up to {MAX_ADDRESSES} addresses.</Alert>}

      {addresses.map((a) => (
        <Paper key={a._id} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
            <div>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                <Typography sx={{ fontWeight: 700 }}>{a.label}</Typography>
                {a.isDefault && <Chip size="small" color="primary" label="Default" />}
              </Stack>
              <Typography variant="body2">
                {a.recipient} · {a.phone}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {a.street}
                {a.barangay ? `, ${a.barangay}` : ''}, {a.city}, {a.province} {a.postalCode || ''}
              </Typography>
            </div>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {!a.isDefault && (
                <Button size="small" disabled={saving} onClick={() => makeDefault(a)}>
                  Set as default
                </Button>
              )}
              <Button size="small" onClick={() => setDialog({ open: true, address: a })}>
                Edit
              </Button>
              <Button size="small" color="error" onClick={() => setToDelete(a)}>
                Delete
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}

      <AddressDialog
        open={dialog.open}
        address={dialog.address}
        profile={profile}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete this address?"
        message={toDelete ? `"${toDelete.label}" (${toDelete.street}, ${toDelete.city}) will be removed from your account.` : ''}
        confirmText="Delete"
        loading={saving}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Stack>
  );
}