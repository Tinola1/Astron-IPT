import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Link, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import AuthCard from '../../components/common/AuthCard';
import RHFTextField from '../../components/common/RHFTextField';
import { loginSchema } from '../../validators/authSchemas';
import { login, clearAuthError } from '../../store/actions/authActions';
import GoogleButton from '../../components/auth/GoogleButton';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const error = useSelector((state) => state.auth.error);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(loginSchema) });

  // don't show a stale error from another auth page
  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = async (values) => {
    const user = await dispatch(login(values));
    if (user) {
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  };

  return (
    <AuthCard title="Log in" subtitle="Welcome back to Astron.">
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <RHFTextField name="email" label="Email" type="email" register={register} errors={errors} autoComplete="email" />
        <RHFTextField name="password" label="Password" type="password" register={register} errors={errors} autoComplete="current-password" />
        <Button type="submit" variant="contained" fullWidth size="large" disabled={isSubmitting} sx={{ mt: 2 }}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <GoogleButton />
      <Typography variant="body2" sx={{ mt: 2 }}>
        <Link component={RouterLink} to="/forgot-password">Forgot password?</Link>
      </Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        No account? <Link component={RouterLink} to="/register">Register</Link>
      </Typography>
    </AuthCard>
  );
}