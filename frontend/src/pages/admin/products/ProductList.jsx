import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import {
  Alert, Avatar, Button, Chip, IconButton, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import useDebounce from '../../../hooks/useDebounce';
import { fetchAdminProducts, deleteProduct, bulkDeleteProducts } from '../../../store/actions/adminProductActions';
import { formatDate, peso } from '../../../utils/format';

const EMPTY_SELECTION = { type: 'include', ids: new Set() };

export default function ProductList() {
  const dispatch = useDispatch();
  const { rows, total, loading, error } = useSelector((s) => s.adminProducts);

  const [paging, setPaging] = useState({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState([{ field: 'createdAt', sort: 'desc' }]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [selection, setSelection] = useState(EMPTY_SELECTION);
  const [confirm, setConfirm] = useState(null); // { ids, label }
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    dispatch(
      fetchAdminProducts({
        page: paging.page + 1,
        limit: paging.pageSize,
        q: debouncedSearch || undefined,
        sortField: sortModel[0]?.field,
        sortOrder: sortModel[0]?.sort,
      })
    );
  }, [dispatch, paging.page, paging.pageSize, debouncedSearch, sortModel]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedIds = selection.type === 'include' ? [...selection.ids] : [];

  const handleConfirmDelete = async () => {
    setDeleting(true);
    const { ids } = confirm;
    const ok = ids.length === 1 ? await dispatch(deleteProduct(ids[0])) : await dispatch(bulkDeleteProducts(ids));
    setDeleting(false);
    if (!ok) return;
    toast.success(ids.length === 1 ? 'Product deleted' : `${ids.length} products deleted`);
    setConfirm(null);
    setSelection(EMPTY_SELECTION);
    if (paging.page > 0) setPaging((p) => ({ ...p, page: 0 })); // effect reloads
    else load();
  };

  const columns = useMemo(
    () => [
      {
        field: 'image', headerName: '', width: 72, sortable: false, disableColumnMenu: true,
        renderCell: (p) => (
          <Avatar variant="rounded" src={p.row.images?.[0]?.url} sx={{ width: 44, height: 44 }}>
            {p.row.name?.[0]}
          </Avatar>
        ),
      },
      { field: 'name', headerName: 'Product', flex: 1.4, minWidth: 180 },
      { field: 'modelNumber', headerName: 'Model', width: 120 },
      { field: 'brand', headerName: 'Brand', width: 110, sortable: false, valueGetter: (v, row) => row.brand?.name },
      { field: 'category', headerName: 'Type', width: 140, sortable: false, valueGetter: (v, row) => row.category?.name },
      { field: 'price', headerName: 'Price', width: 110, type: 'number', valueFormatter: (v) => peso(v) },
      {
        field: 'capacity', headerName: 'Capacity', width: 110, sortable: false,
        valueGetter: (v, row) => (row.specs?.capacityBTU ? `${row.specs.capacityBTU.toLocaleString()} BTU` : '-'),
      },
      {
        field: 'onlineStock', headerName: 'Online', width: 80, type: 'number', sortable: false,
        renderCell: (p) => (
          <Typography variant="body2" color={p.value <= 5 ? 'warning.main' : 'text.primary'} sx={{
            fontWeight: p.value <= 5 ? 700 : 400
          }}>
            {p.value}
          </Typography>
        ),
      },
      { field: 'showroomStock', headerName: 'Showroom', width: 95, type: 'number', sortable: false },
      {
        field: 'isAvailable', headerName: 'Status', width: 110, sortable: false,
        renderCell: (p) => (
          <Chip size="small" label={p.value ? 'Active' : 'Hidden'} color={p.value ? 'success' : 'default'} />
        ),
      },
      { field: 'createdAt', headerName: 'Added', width: 120, valueFormatter: (v) => formatDate(v) },
      {
        field: 'actions', headerName: '', width: 110, sortable: false, disableColumnMenu: true, align: 'right',
        renderCell: (p) => (
          <>
            <Tooltip title="Edit">
              <IconButton component={RouterLink} to={`/admin/products/${p.row._id}/edit`} aria-label="Edit product">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton aria-label="Delete product" onClick={() => setConfirm({ ids: [p.row._id], label: p.row.name })}>
                <DeleteIcon fontSize="small" color="error" />
              </IconButton>
            </Tooltip>
          </>
        ),
      },
    ],
    []
  );

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: "space-between",
          alignItems: { sm: 'center' }
        }}>
        <Typography variant="h4" sx={{
          fontWeight: 800
        }}>Products</Typography>
        <Button component={RouterLink} to="/admin/products/new" variant="contained" startIcon={<AddIcon />}>
          Add product
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
        alignItems: { sm: 'center' }
      }}>
        <TextField
          size="small" label="Search name or model" value={search} sx={{ minWidth: 260 }}
          onChange={(e) => { setSearch(e.target.value); setPaging((p) => ({ ...p, page: 0 })); }}
        />
        <Button
          color="error" variant="outlined" startIcon={<DeleteIcon />}
          disabled={selectedIds.length === 0}
          onClick={() => setConfirm({ ids: selectedIds, label: `${selectedIds.length} selected products` })}
        >
          Delete selected ({selectedIds.length})
        </Button>
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
          checkboxSelection
          disableRowSelectionOnClick
          keepNonExistentRowsSelected
          rowSelectionModel={selection}
          onRowSelectionModelChange={setSelection}
          disableColumnFilter
          sx={{ border: 0 }}
        />
      </Paper>

      <ConfirmDialog
        open={!!confirm}
        title="Delete products?"
        message={
          confirm
            ? `Delete ${confirm.label}? They will be removed from the store and from customers' carts. Past orders keep their records.`
            : ''
        }
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirm(null)}
      />
    </Stack>
  );
}