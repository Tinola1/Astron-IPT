import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Link, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import AuthCard from '../../components/common/AuthCard';
import RHFTextField from '../../components/common/RHFTextField';
import { registerSchema } from '../../validators/authSchemas';
import { register as registerAction, clearAuthError } from '../../store/actions/authActions';
import GoogleButton from '../../components/auth/GoogleButton';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const error = useSelector((state) => state.auth.error);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(registerSchema) });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = async ({ confirmPassword, ...values }) => {
    const user = await dispatch(registerAction(values));
    if (user) {
      toast.success('Account created!');
      navigate('/', { replace: true });
    }
  };

  return (
    <AuthCard title="Create an account" subtitle="Shop, track orders and manage your warranties.">
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <RHFTextField name="name" label="Full name" register={register} errors={errors} autoComplete="name" />
        <RHFTextField name="email" label="Email" type="email" register={register} errors={errors} autoComplete="email" />
        <RHFTextField name="phone" label="Mobile number (optional)" register={register} errors={errors} autoComplete="tel" />
        <RHFTextField name="password" label="Password" type="password" register={register} errors={errors} autoComplete="new-password" />
        <RHFTextField name="confirmPassword" label="Confirm password" type="password" register={register} errors={errors} autoComplete="new-password" />
        <Button type="submit" variant="contained" fullWidth size="large" disabled={isSubmitting} sx={{ mt: 2 }}>
          {isSubmitting ? 'Creating account…' : 'Register'}
        </Button>
      </form>
      <GoogleButton label="Sign up with Google" />
      <Typography variant="body2" sx={{ mt: 2 }}>
        Already have an account? <Link component={RouterLink} to="/login">Log in</Link>
      </Typography>
    </AuthCard>
  );
}