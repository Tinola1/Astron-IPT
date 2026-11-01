import { useEffect, useState } from 'react';
import { Alert, Button, Grid, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { getStoreInfo, saveStoreInfo } from '../../../api/store';
import { removeLogo, uploadLogo } from '../../../api/shop';

const webOk = (v) => !v || /^https?:\/\/\S+$/i.test(v.trim());

export default function StoreInfoForm() {
  const [f, setF] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  useEffect(() => {
    getStoreInfo().then((d) => setF({ ...d, maintenanceReminderMonths: String(d.maintenanceReminderMonths) })).catch((e) => setError(e.message));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!f) return <LinearProgress />;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const months = Number(f.maintenanceReminderMonths);
  const monthsOk = Number.isInteger(months) && months >= 1 && months <= 24;
  const emailOk = !f.email || /^\S+@\S+\.\S+$/.test(f.email.trim());
  const valid = f.storeName.trim() && emailOk && monthsOk && webOk(f.facebook) && webOk(f.instagram);

  const save = async () => {
    setSaving(true);
    try {
      await saveStoreInfo({ ...f, maintenanceReminderMonths: months });
      toast.success('Store information saved');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const pickLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('Use a JPG, PNG or WebP image');
    if (file.size > 5 * 1024 * 1024) return toast.error('The logo must be 5MB or smaller');
    setLogoBusy(true);
    try {
      const r = await uploadLogo(file);
      setF((x) => ({ ...x, logo: r.logo }));
      toast.success('Logo updated. Refresh the shop to see it.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLogoBusy(false);
    }
  };
  const dropLogo = async () => {
    setLogoBusy(true);
    try {
      await removeLogo();
      setF((x) => ({ ...x, logo: '' }));
      toast.success('Logo removed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Store information</Typography>
      <Typography sx={{ color: 'text.secondary', mt: -1 }}>Shown in the footer of the shop.</Typography>
      <Paper sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Store logo</Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {f.logo ? <img src={f.logo} alt="Store logo" style={{ height: 56, maxWidth: 200, objectFit: 'contain' }} /> : <Typography sx={{ color: 'text.secondary' }}>No logo yet. The shop shows the store name instead.</Typography>}
          <Button component="label" size="small" variant="outlined" disabled={logoBusy}>
            {f.logo ? 'Change logo' : 'Upload logo'}
            <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={pickLogo} />
          </Button>
          {f.logo && <Button size="small" color="error" onClick={dropLogo} disabled={logoBusy}>Remove</Button>}
        </Stack>
      </Paper>
      <Paper sx={{ p: 2.5 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Store name" value={f.storeName} onChange={set('storeName')} slotProps={{ htmlInput: { maxLength: 80 } }} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Email" value={f.email} onChange={set('email')} error={!emailOk} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Phone" value={f.phone} onChange={set('phone')} slotProps={{ htmlInput: { maxLength: 40 } }} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Business hours" value={f.businessHours} onChange={set('businessHours')} slotProps={{ htmlInput: { maxLength: 200 } }} /></Grid>
          <Grid size={12}><TextField fullWidth label="Address" value={f.address} onChange={set('address')} slotProps={{ htmlInput: { maxLength: 200 } }} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Facebook link" placeholder="https://facebook.com/..." value={f.facebook} onChange={set('facebook')} error={!webOk(f.facebook)} helperText={!webOk(f.facebook) ? 'Must start with http:// or https://' : ''} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Instagram link" placeholder="https://instagram.com/..." value={f.instagram} onChange={set('instagram')} error={!webOk(f.instagram)} helperText={!webOk(f.instagram) ? 'Must start with http:// or https://' : ''} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth type="number" label="Cleaning reminder every (months)" value={f.maintenanceReminderMonths} onChange={set('maintenanceReminderMonths')}
              error={!monthsOk} helperText="Customers get a reminder to clean their unit this often (1 to 24)." />
          </Grid>
        </Grid>
        <Button sx={{ mt: 2 }} variant="contained" onClick={save} disabled={!valid || saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </Paper>
    </Stack>
  );
}