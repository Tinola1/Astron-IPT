import { Divider, Stack, Typography } from '@mui/material';
import { peso } from '../../utils/format';

function Row({ label, value, color, bold }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 800 : 400}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 800 : 400} color={color}>{value}</Typography>
    </Stack>
  );
}

// totals: { itemsTotal, addOnsTotal, installationFee, deliveryFee, discount, grandTotal }
export default function OrderSummary({ totals, deliveryPending = false }) {
  const t = totals || {};
  return (
    <Stack spacing={1}>
      <Row label="Items" value={peso(t.itemsTotal)} />
      {t.addOnsTotal > 0 && <Row label="Add-ons" value={peso(t.addOnsTotal)} />}
      {t.installationFee > 0 && <Row label="Installation" value={peso(t.installationFee)} />}
      <Row
        label="Delivery"
        value={deliveryPending ? 'Calculated at checkout' : t.deliveryFee > 0 ? peso(t.deliveryFee) : 'Free'}
      />
      {t.discount > 0 && <Row label="Discount" value={`-${peso(t.discount)}`} color="success.main" />}
      <Divider />
      <Row label="Total" value={peso(t.grandTotal ?? t.subtotal)} bold />
    </Stack>
  );
}