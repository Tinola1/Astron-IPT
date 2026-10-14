import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button } from '@mui/material';
import { toast } from 'react-toastify';
import AuthCard from '../../components/common/AuthCard';
import RHFTextField from '../../components/common/RHFTextField';
import { resetSchema } from '../../validators/authSchemas';
import { resetUserPassword, clearAuthError } from '../../store/actions/authActions';

export default function ResetPassword() {
  const { token } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const error = useSelector((state) => state.auth.error);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(resetSchema) });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = async ({ password }) => {
    // backend logs the user in after a successful reset
    const user = await dispatch(resetUserPassword(token, password));
    if (user) {
      toast.success('Password updated');
      navigate('/', { replace: true });
    }
  };

  return (
    <AuthCard title="Reset password" subtitle="Choose a new password.">
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <RHFTextField name="password" label="New password" type="password" register={register} errors={errors} autoComplete="new-password" />
        <RHFTextField name="confirmPassword" label="Confirm password" type="password" register={register} errors={errors} autoComplete="new-password" />
        <Button type="submit" variant="contained" fullWidth size="large" disabled={isSubmitting} sx={{ mt: 2 }}>
          {isSubmitting ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </AuthCard>
  );
}