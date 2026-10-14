import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Link, Typography } from '@mui/material';
import AuthCard from '../../components/common/AuthCard';
import RHFTextField from '../../components/common/RHFTextField';
import { forgotSchema } from '../../validators/authSchemas';
import { forgotPassword } from '../../api/auth';

export default function ForgotPassword() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(forgotSchema) });

  const onSubmit = async ({ email }) => {
    setError('');
    setMessage('');
    try {
      const d = await forgotPassword(email);
      setMessage(d.message);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <AuthCard title="Forgot password" subtitle="We'll email you a link to reset it.">
      {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <RHFTextField name="email" label="Email" type="email" register={register} errors={errors} />
        <Button type="submit" variant="contained" fullWidth size="large" disabled={isSubmitting} sx={{ mt: 2 }}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <Typography variant="body2" sx={{ mt: 2 }}>
        <Link component={RouterLink} to="/login">Back to log in</Link>
      </Typography>
    </AuthCard>
  );
}