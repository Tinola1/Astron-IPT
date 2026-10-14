import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { peso } from '../../utils/format';

const dash = (v) => (v === undefined || v === null || v === '' ? '-' : v);

const ROWS = [
  ['Brand', (p) => dash(p.brand)],
  ['Type', (p) => dash(p.category)],
  ['Price', (p) => peso(p.price)],
  ['Capacity', (p) => `${(p.specs.capacityBTU || 0).toLocaleString()} BTU / ${dash(p.specs.capacityHP)} HP`],
  ['Inverter', (p) => (p.specs.isInverter ? 'Yes' : 'No')],
  ['Energy rating', (p) => (p.specs.energyRating ? `${p.specs.energyRating}★` : '-')],
  ['Power consumption', (p) => (p.specs.powerConsumptionWatts ? `${p.specs.powerConsumptionWatts} W` : '-')],
  ['Refrigerant', (p) => dash(p.specs.refrigerantType)],
  ['Noise level', (p) => (p.specs.noiseLevelDb ? `${p.specs.noiseLevelDb} dB` : '-')],
  ['Dimensions (W×H×D)', (p) => {
    const d = p.specs.dimensions;
    return d?.width ? `${d.width} × ${d.height} × ${d.depth}` : '-';
  }],
  ['Warranty', (p) => (p.specs.warrantyMonths ? `${p.specs.warrantyMonths} months` : '-')],
  ['Customer rating', (p) => (p.numReviews ? `${p.averageRating.toFixed(1)}★ (${p.numReviews})` : 'No reviews')],
  ['Availability', (p) => (p.available ? 'In stock' : 'Out of stock')],
];

export default function CompareDialog({ open, onClose, products }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Compare units</DialogTitle>
      <DialogContent dividers sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              {products.map((p) => <TableCell key={p._id} sx={{ fontWeight: 700 }}>{p.name}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {ROWS.map(([label, fn]) => (
              <TableRow key={label}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{label}</TableCell>
                {products.map((p) => <TableCell key={p._id}>{fn(p)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}