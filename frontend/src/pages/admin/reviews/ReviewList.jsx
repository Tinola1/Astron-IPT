import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DataGrid } from '@mui/x-data-grid';
import {
  Alert, Chip, IconButton, MenuItem, Paper, Rating, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import useDebounce from '../../../hooks/useDebounce';
import { fetchAdminReviews, deleteReview } from '../../../store/actions/adminReviewActions';
import { formatDate } from '../../../utils/format';

export default function ReviewList() {
  const dispatch = useDispatch();
  const { rows, total, loading, error } = useSelector((s) => s.adminReviews);

  const [paging, setPaging] = useState({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState([{ field: 'createdAt', sort: 'desc' }]);
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [target, setTarget] = useState(null); // review pending deletion
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    dispatch(
      fetchAdminReviews({
        page: paging.page + 1,
        limit: paging.pageSize,
        rating: rating || undefined,
        q: debouncedSearch || undefined,
        sortField: sortModel[0]?.field,
        sortOrder: sortModel[0]?.sort,
      })
    );
  }, [dispatch, paging.page, paging.pageSize, rating, debouncedSearch, sortModel]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    setDeleting(true);
    const ok = await dispatch(deleteReview(target._id));
    setDeleting(false);
    if (!ok) return;
    toast.success('Review deleted');
    setTarget(null);
    if (rows.length === 1 && paging.page > 0) setPaging((p) => ({ ...p, page: p.page - 1 })); // effect reloads
    else load();
  };

  const columns = useMemo(
    () => [
      { field: 'product', headerName: 'Product', flex: 1, minWidth: 160, sortable: false, valueGetter: (v, row) => row.product?.name },
      {
        field: 'customer', headerName: 'Customer', flex: 1, minWidth: 170, sortable: false,
        renderCell: (p) => (
          <Stack justifyContent="center" sx={{ height: '100%', lineHeight: 1.3 }}>
            <Typography variant="body2" fontWeight={600}>{p.row.customer.name}</Typography>
            <Typography variant="caption" color="text.secondary">{p.row.customer.email}</Typography>
          </Stack>
        ),
      },
      {
        field: 'rating', headerName: 'Rating', width: 130,
        renderCell: (p) => <Rating value={p.value} readOnly size="small" />,
      },
      {
        field: 'comment', headerName: 'Review', flex: 2, minWidth: 220, sortable: false,
        renderCell: (p) => (
          <Tooltip title={p.value || ''} placement="top-start">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%', minWidth: 0 }}>
              <Typography variant="body2" noWrap>{p.value || <i>No comment</i>}</Typography>
              {p.row.isEdited && <Chip size="small" label="Edited" />}
            </Stack>
          </Tooltip>
        ),
      },
      { field: 'createdAt', headerName: 'Date', width: 120, valueFormatter: (v) => formatDate(v) },
      {
        field: 'actions', headerName: '', width: 70, sortable: false, disableColumnMenu: true,
        renderCell: (p) => (
          <Tooltip title="Delete review">
            <IconButton aria-label="Delete review" onClick={() => setTarget(p.row)}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>Reviews</Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          size="small" label="Search review, product or customer" value={search} sx={{ minWidth: 300 }}
          onChange={(e) => { setSearch(e.target.value); setPaging((p) => ({ ...p, page: 0 })); }}
        />
        <TextField
          select size="small" label="Rating" value={rating} sx={{ minWidth: 150 }}
          onChange={(e) => { setRating(e.target.value); setPaging((p) => ({ ...p, page: 0 })); }}
        >
          <MenuItem value="">All ratings</MenuItem>
          {[5, 4, 3, 2, 1].map((n) => <MenuItem key={n} value={String(n)}>{n} star{n > 1 ? 's' : ''}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper>
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          getRowId={(r) => r._id}
          loading={loading}
          rowHeight={64}
          rowCount={total}
          paginationMode="server"
          sortingMode="server"
          paginationModel={paging}
          onPaginationModelChange={setPaging}
          pageSizeOptions={[5, 10, 25, 50]}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          disableRowSelectionOnClick
          disableColumnFilter
          sx={{ border: 0 }}
        />
      </Paper>

      <ConfirmDialog
        open={!!target}
        title="Delete this review?"
        message={target ? `Delete ${target.customer.name}'s ${target.rating}-star review of ${target.product.name}? The product's rating will be recalculated.` : ''}
        confirmText="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setTarget(null)}
      />
    </Stack>
  );
}