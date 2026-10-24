import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Alert, Box, Chip, Divider, LinearProgress, Pagination, Paper, Rating, Stack, Typography } from '@mui/material';
import RatingSummary from './RatingSummary';
import ReviewForm from './ReviewForm';
import {
  fetchReviews, fetchMyReviewStatus, setRatingFilter,
} from '../../store/actions/productDetailActions';
import { formatDate } from '../../utils/format';

export default function ReviewSection({ productId }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const { product, reviews, total, page, pages, distribution, ratingFilter, reviewsLoading, mine } =
    useSelector((s) => s.productDetail);

  // (re)load the list when the product or the star filter changes
  useEffect(() => {
    dispatch(fetchReviews(productId, 1));
  }, [dispatch, productId, ratingFilter]);

  // can this customer review it, and did they already?
  useEffect(() => {
    if (user?.role === 'customer') dispatch(fetchMyReviewStatus(productId));
  }, [dispatch, productId, user?._id, user?.role]);

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{
        fontWeight: 800
      }}>Customer reviews</Typography>

      <RatingSummary
        average={product.averageRating}
        count={product.numReviews}
        distribution={distribution}
        selected={ratingFilter}
        onSelect={(r) => dispatch(setRatingFilter(r))}
      />

      {/* write / edit area */}
      {!user && (
        <Alert severity="info">
          <RouterLink to="/login" state={{ from: location }}>Log in</RouterLink> to review this product if you have bought it.
        </Alert>
      )}
      {user?.role === 'customer' && mine.loaded && (
        mine.eligible ? (
          <ReviewForm productId={productId} />
        ) : (
          <Alert severity="info">Only customers who have received this product can leave a review.</Alert>
        )
      )}

      <Divider />

      {ratingFilter && (
        <Box>
          <Chip label={`Showing ${ratingFilter}★ reviews`} onDelete={() => dispatch(setRatingFilter(''))} />
        </Box>
      )}
      {reviewsLoading && <LinearProgress />}
      {!reviewsLoading && reviews.length === 0 && (
        <Typography sx={{
          color: "text.secondary"
        }}>
          {ratingFilter ? 'No reviews with this rating yet.' : 'No reviews yet. Be the first after you receive your unit!'}
        </Typography>
      )}

      <Stack spacing={2}>
        {reviews.map((r) => (
          <Paper key={r._id} variant="outlined" sx={{ p: 2 }}>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1
              }}>
              <Stack direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <Rating value={r.rating} readOnly size="small" />
                <Typography sx={{
                  fontWeight: 600
                }}>{r.author}</Typography>
                {r.isEdited && <Chip size="small" label="Edited" />}
              </Stack>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>{formatDate(r.createdAt)}</Typography>
            </Stack>
            {r.comment && <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.comment}</Typography>}
          </Paper>
        ))}
      </Stack>

      {pages > 1 && (
        <Pagination
          count={pages}
          page={page}
          color="primary"
          disabled={reviewsLoading}
          onChange={(_, p) => dispatch(fetchReviews(productId, p))}
          sx={{ alignSelf: 'center' }}
        />
      )}
      {total > 0 && (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>{total} review{total === 1 ? '' : 's'} shown</Typography>
      )}
    </Stack>
  );
}