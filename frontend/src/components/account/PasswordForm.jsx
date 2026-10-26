import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import RHFTextField from '../common/RHFTextField';
import { makePasswordSchema } from '../../validators/accountSchemas';
import { changePassword } from '../../store/actions/accountActions';

export default function PasswordForm({ profile }) {
  const dispatch = useDispatch();
  const { saving, error } = useSelector((s) => s.account);
  // accounts created with Google have no password yet, so there's no "current password" to ask for
  const hasPassword = profile.passwordSet;
  const schema = useMemo(() => makePasswordSchema(hasPassword), [hasPassword]);
  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    const ok = await dispatch(changePassword({ currentPassword: hasPassword ? currentPassword : undefined, newPassword }));
    if (ok) {
      toast.success(hasPassword ? 'Password updated' : 'Password set. You can now also log in with your email.');
      reset();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {hasPassword ? 'Change password' : 'Set a password'}
      </Typography>
      {!hasPassword && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          You sign in with Google. Set a password if you also want to log in with your email address.
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      {hasPassword && (
        <RHFTextField
          name="currentPassword"
          label="Current password"
          type="password"
          register={register}
          errors={errors}
          autoComplete="current-password"
        />
      )}
      <RHFTextField
        name="newPassword"
        label="New password"
        type="password"
        register={register}
        errors={errors}
        autoComplete="new-password"
      />
      <RHFTextField
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        register={register}
        errors={errors}
        autoComplete="new-password"
      />
      <Button type="submit" variant="contained" disabled={saving} sx={{ mt: 1 }}>
        {saving ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
      </Button>
    </form>
  );
}