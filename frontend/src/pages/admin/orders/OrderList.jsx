import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { Alert, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import useDebounce from '../../../hooks/useDebounce';
import { fetchAdminOrders } from '../../../store/actions/adminOrderActions';
import { ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../../../utils/constants';
import { formatDateTime, peso } from '../../../utils/format';

export default function OrderList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { rows, total, loading, error } = useSelector((s) => s.adminOrders);

  const [paging, setPaging] = useState({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState([{ field: 'createdAt', sort: 'desc' }]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    dispatch(
      fetchAdminOrders({
        page: paging.page + 1,
        limit: paging.pageSize,
        status: status || undefined,
        q: debouncedSearch || undefined,
        sortField: sortModel[0]?.field,
        sortOrder: sortModel[0]?.sort,
      })
    );
  }, [dispatch, paging.page, paging.pageSize, status, debouncedSearch, sortModel]);

  const columns = useMemo(
    () => [
      { field: 'orderNumber', headerName: 'Order', flex: 1.2, minWidth: 190 },
      {
        field: 'customer', headerName: 'Customer', flex: 1.2, minWidth: 180, sortable: false,
        renderCell: (p) => (
          <Stack justifyContent="center" sx={{ height: '100%', lineHeight: 1.3 }}>
            <Typography variant="body2" fontWeight={600}>{p.row.customer.name}</Typography>
            <Typography variant="caption" color="text.secondary">{p.row.customer.email}</Typography>
          </Stack>
        ),
      },
      { field: 'createdAt', headerName: 'Placed', width: 170, valueFormatter: (v) => formatDateTime(v) },
      { field: 'itemCount', headerName: 'Items', width: 75, type: 'number', sortable: false },
      { field: 'grandTotal', headerName: 'Total', width: 120, type: 'number', valueFormatter: (v) => peso(v) },
      {
        field: 'paymentStatus', headerName: 'Payment', width: 190, sortable: false,
        renderCell: (p) => {
          const ps = PAYMENT_STATUS[p.value] || { label: p.value, color: 'default' };
          const method = PAYMENT_METHODS.find((m) => m.value === p.row.paymentMethod)?.label || p.row.paymentMethod;
          return (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
              <Chip size="small" label={ps.label} color={ps.color} />
              <Typography variant="caption" color="text.secondary" noWrap>{method.split(' ')[0]}</Typography>
            </Stack>
          );
        },
      },
      {
        field: 'status', headerName: 'Status', width: 150,
        renderCell: (p) => {
          const st = ORDER_STATUS[p.value] || { label: p.value, color: 'default' };
          return <Chip size="small" label={st.label} color={st.color} />;
        },
      },
      {
        field: 'actions', headerName: '', width: 90, sortable: false, disableColumnMenu: true,
        renderCell: (p) => (
          <Button component={RouterLink} to={`/admin/orders/${p.row._id}`} size="small" variant="outlined">
            View
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>Orders</Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          size="small" label="Search order number, customer name or email" value={search} sx={{ minWidth: 320 }}
          onChange={(e) => { setSearch(e.target.value); setPaging((p) => ({ ...p, page: 0 })); }}
        />
        <TextField
          select size="small" label="Status" value={status} sx={{ minWidth: 180 }}
          onChange={(e) => { setStatus(e.target.value); setPaging((p) => ({ ...p, page: 0 })); }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {Object.entries(ORDER_STATUS).map(([value, s]) => (
            <MenuItem key={value} value={value}>{s.label}</MenuItem>
          ))}
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
          onRowClick={(p) => navigate(`/admin/orders/${p.row._id}`)}
          sx={{ border: 0, '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Paper>
    </Stack>
  );
}