import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Avatar, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import RHFTextField from '../common/RHFTextField';
import { profileSchema } from '../../validators/accountSchemas';
import { saveProfile } from '../../store/actions/accountActions';

export default function ProfileForm({ profile }) {
  const dispatch = useDispatch();
  const { saving, error } = useSelector((s) => s.account);
  const {
    register, handleSubmit, reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: { name: profile.name, phone: profile.phone || '' },
  });

  // after saving, the form becomes "pristine" again with the new values
  useEffect(() => {
    reset({ name: profile.name, phone: profile.phone || '' });
  }, [profile.name, profile.phone, reset]);

  const onSubmit = async (values) => {
    if (await dispatch(saveProfile(values))) toast.success('Profile updated');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1 }}>
        <Avatar src={profile.avatar?.url} alt="" sx={{ width: 64, height: 64 }}>
          {profile.name?.[0]?.toUpperCase()}
        </Avatar>
        <div>
          <Typography sx={{ fontWeight: 700 }}>{profile.name}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {profile.email}
          </Typography>
          {profile.authProvider === 'google' && <Chip size="small" label="Signed in with Google" sx={{ mt: 0.5 }} />}
        </div>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      <RHFTextField name="name" label="Full name" register={register} errors={errors} autoComplete="name" />
      <TextField
        label="Email"
        value={profile.email}
        fullWidth
        margin="normal"
        disabled
        helperText="Your email can't be changed."
      />
      <RHFTextField
        name="phone"
        label="Mobile number"
        register={register}
        errors={errors}
        autoComplete="tel"
        placeholder="09171234567"
      />

      <Button type="submit" variant="contained" disabled={!isDirty || saving} sx={{ mt: 1 }}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}