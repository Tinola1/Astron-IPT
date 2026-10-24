import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Alert, Button, FormHelperText, Paper, Rating, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import RHFTextField from '../common/RHFTextField';
import { submitReview } from '../../store/actions/productDetailActions';

const schema = yup.object({
  rating: yup
    .number()
    .typeError('Choose a star rating')
    .min(1, 'Choose a star rating')
    .max(5)
    .required('Choose a star rating'),
  comment: yup.string().trim().max(1000, 'Your review can be at most 1000 characters'),
});

export default function ReviewForm({ productId }) {
  const dispatch = useDispatch();
  const { mine, saving, reviewError } = useSelector((s) => s.productDetail);
  const existing = mine.review;

  const {
    control, register, handleSubmit, reset, watch,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema), defaultValues: { rating: 0, comment: '' } });

  // prefill when the customer already has a review (and refresh after saving)
  useEffect(() => {
    reset({ rating: existing?.rating || 0, comment: existing?.comment || '' });
  }, [existing, reset]);

  const onSubmit = async (values) => {
    const wasEdit = Boolean(existing);
    const result = await dispatch(submitReview(productId, values));
    if (!result) return;
    if (result.masked) toast.info('Your review was saved. Some words were masked.');
    else toast.success(wasEdit ? 'Review updated' : 'Thanks for your review!');
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography sx={{
        fontWeight: 700
      }}>{existing ? 'Your review' : 'Write a review'}</Typography>
      {existing?.isEdited && (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>You edited this review before.</Typography>
      )}
      {reviewError && <Alert severity="error" sx={{ mt: 1 }}>{reviewError}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={0.5} sx={{ mt: 1.5 }}>
          <Controller
            name="rating"
            control={control}
            render={({ field }) => (
              <Rating
                size="large"
                value={Number(field.value) || 0}
                onChange={(_, v) => field.onChange(v ?? 0)}
              />
            )}
          />
          {errors.rating && <FormHelperText error>{errors.rating.message}</FormHelperText>}
        </Stack>

        <RHFTextField
          name="comment"
          label="Share your experience (optional)"
          multiline
          minRows={3}
          register={register}
          errors={errors}
          helperText={errors.comment?.message || `${(watch('comment') || '').length}/1000`}
        />

        <Button type="submit" variant="contained" disabled={saving} sx={{ mt: 1 }}>
          {saving ? 'Saving…' : existing ? 'Update my review' : 'Submit review'}
        </Button>
      </form>
    </Paper>
  );
}