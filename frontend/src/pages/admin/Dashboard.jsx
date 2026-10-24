import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Chip, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import SummaryCard from '../../components/admin/SummaryCard';
import SalesPanel from '../../components/admin/SalesPanel';
import { fetchDashboard } from '../../store/actions/reportActions';
import { formatDate, peso } from '../../utils/format';

export default function Dashboard() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const { dashboard: d, dashLoading, dashError } = useSelector((s) => s.reports);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Dashboard
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>Welcome back, {user?.name}.</Typography>
      </div>

      {dashLoading && !d && <LinearProgress />}
      {dashError && <Alert severity="error">{dashError}</Alert>}

      {d && (
        <>
          <Grid container spacing={2}>
            {isAdmin && d.sales && (
              <>
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                  <SummaryCard
                    title="Sales today"
                    value={peso(d.sales.today.revenue)}
                    caption={`${d.sales.today.orders} order${d.sales.today.orders === 1 ? '' : 's'}`}
                    color="success.main"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                  <SummaryCard
                    title="Sales this month"
                    value={peso(d.sales.month.revenue)}
                    caption={`${d.sales.month.orders} order${d.sales.month.orders === 1 ? '' : 's'}`}
                    color="success.main"
                  />
                </Grid>
              </>
            )}
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <SummaryCard
                title="Pending orders"
                value={d.orders.pending}
                caption={`${d.orders.processing} processing · ${d.orders.outForDelivery} out for delivery`}
                to={isAdmin ? '/admin/orders?status=pending' : undefined}
                color="warning.main"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <SummaryCard
                title="Low stock"
                value={d.lowStock.count}
                caption={
                  d.lowStock.count ? 'products at or below their stock threshold' : 'All products are well stocked'
                }
                to={isAdmin ? '/admin/products' : undefined}
                color="error.main"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <SummaryCard
                title="Upcoming installations"
                value={d.installations.count}
                caption={`next 14 days · ${d.installations.unassigned} without a technician`}
                color="info.main"
              />
            </Grid>
          </Grid>

          {isAdmin && <SalesPanel />}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Low stock</Typography>
                {d.lowStock.items.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Nothing to restock right now.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {d.lowStock.items.map((p) => (
                      <Stack
                        key={p._id}
                        direction="row"
                        sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
                      >
                        <div>
                          {isAdmin ? (
                            <Typography
                              component={RouterLink}
                              to={`/admin/products/${p._id}/edit`}
                              variant="body2"
                              sx={{ fontWeight: 600, color: 'inherit' }}
                            >
                              {p.name}
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {p.name}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {p.modelNumber}
                          </Typography>
                        </div>
                        <Chip
                          size="small"
                          color={p.stock === 0 ? 'error' : 'warning'}
                          label={p.stock === 0 ? 'Out of stock' : `${p.stock} left (min ${p.threshold})`}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Upcoming installations</Typography>
                {d.installations.upcoming.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No installations scheduled in the next 14 days.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {d.installations.upcoming.map((i) => (
                      <Stack
                        key={i._id}
                        direction="row"
                        sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
                      >
                        <div>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatDate(i.scheduledDate)} · {i.customer}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {i.city || 'No city'}
                          </Typography>
                        </div>
                        <Chip
                          size="small"
                          color={i.technician ? 'success' : 'default'}
                          variant={i.technician ? 'filled' : 'outlined'}
                          label={i.technician || 'Unassigned'}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  );
}