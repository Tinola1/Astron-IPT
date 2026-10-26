import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import RHFTextField from '../common/RHFTextField';
import RHFSwitch from '../common/RHFSwitch';
import { addressSchema } from '../../validators/accountSchemas';
import { addAddress, clearAccountError, updateAddress } from '../../store/actions/accountActions';

const valuesFor = (address, profile) => ({
  label: address?.label || 'Home',
  recipient: address?.recipient || profile.name || '',
  phone: address?.phone || profile.phone || '',
  street: address?.street || '',
  barangay: address?.barangay || '',
  city: address?.city || '',
  province: address?.province || '',
  postalCode: address?.postalCode || '',
  isDefault: address?.isDefault || false,
});

// address = null -> add a new one; otherwise edit it
export default function AddressDialog({ open, address, profile, onClose }) {
  const dispatch = useDispatch();
  const { saving, error } = useSelector((s) => s.account);
  const {
    register, handleSubmit, reset, control,
    formState: { errors },
  } = useForm({ resolver: yupResolver(addressSchema), defaultValues: valuesFor(address, profile) });

  useEffect(() => {
    if (open) {
      dispatch(clearAccountError());
      reset(valuesFor(address, profile));
    }
  }, [open, address, profile, reset, dispatch]);

  const onSubmit = async (values) => {
    const ok = await dispatch(address ? updateAddress(address._id, values) : addAddress(values));
    if (ok) {
      toast.success(address ? 'Address updated' : 'Address saved');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle>{address ? 'Edit address' : 'Add an address'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}
          <Grid container columnSpacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <RHFTextField name="label" label="Label (Home, Office…)" register={register} errors={errors} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <RHFTextField name="recipient" label="Recipient" register={register} errors={errors} />
            </Grid>
            <Grid size={12}>
              <RHFTextField name="phone" label="Mobile number" register={register} errors={errors} />
            </Grid>
            <Grid size={12}>
              <RHFTextField name="street" label="House no. / street" register={register} errors={errors} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RHFTextField name="barangay" label="Barangay (optional)" register={register} errors={errors} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RHFTextField name="city" label="City / municipality" register={register} errors={errors} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RHFTextField name="province" label="Province" register={register} errors={errors} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RHFTextField name="postalCode" label="Postal code (optional)" register={register} errors={errors} />
            </Grid>
          </Grid>
          {address?.isDefault ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              This is your default address. To change the default, set another address as default.
            </Typography>
          ) : (
            <RHFSwitch name="isDefault" control={control} label="Use as my default address" />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save address'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}