import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Grid, Paper, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import RHFTextField from '../../../components/common/RHFTextField';
import RHFSelect from '../../../components/common/RHFSelect';
import RHFSwitch from '../../../components/common/RHFSwitch';
import Loader from '../../../components/common/Loader';
import ImageUploader from '../../../components/admin/ImageUploader';
import { productSchema } from '../../../validators/productSchema';
import { loadCatalogMeta } from '../../../store/actions/productActions';
import { fetchAdminProduct, saveProduct, clearAdminProduct } from '../../../store/actions/adminProductActions';

const EMPTY = {
  name: '', modelNumber: '', description: '', category: '', brand: '', price: '', isAvailable: true,
  capacityBTU: '', capacityHP: '', isInverter: false, energyRating: '', powerConsumptionWatts: '',
  refrigerantType: '', noiseLevelDb: '', width: '', height: '', depth: '', warrantyMonths: 12,
  minSqm: '', maxSqm: '', onlineStock: 0, showroomStock: 0,
};

const ENERGY_OPTIONS = [
  { value: '', label: 'Not rated' },
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` })),
];

const toFormValues = (p) => {
  const s = p.specs || {};
  return {
    ...EMPTY,
    name: p.name, modelNumber: p.modelNumber, description: p.description || '',
    category: p.category?._id || '', brand: p.brand?._id || '',
    price: p.price, isAvailable: p.isAvailable,
    capacityBTU: s.capacityBTU ?? '', capacityHP: s.capacityHP ?? '', isInverter: !!s.isInverter,
    energyRating: s.energyRating || '', powerConsumptionWatts: s.powerConsumptionWatts ?? '',
    refrigerantType: s.refrigerantType || '', noiseLevelDb: s.noiseLevelDb ?? '',
    width: s.dimensions?.width ?? '', height: s.dimensions?.height ?? '', depth: s.dimensions?.depth ?? '',
    warrantyMonths: s.warrantyMonths ?? 12,
    minSqm: p.recommendedRoomSize?.minSqm ?? '', maxSqm: p.recommendedRoomSize?.maxSqm ?? '',
  };
};

// v holds the Yup-cast values (numbers or undefined)
const toPayload = (v, keepImages) => ({
  name: v.name, modelNumber: v.modelNumber, description: v.description,
  category: v.category, brand: v.brand, price: v.price, isAvailable: v.isAvailable,
  specs: {
    capacityBTU: v.capacityBTU, capacityHP: v.capacityHP, isInverter: v.isInverter,
    energyRating: v.energyRating || undefined, powerConsumptionWatts: v.powerConsumptionWatts,
    refrigerantType: v.refrigerantType || undefined, noiseLevelDb: v.noiseLevelDb,
    dimensions: v.width || v.height || v.depth ? { width: v.width, height: v.height, depth: v.depth } : undefined,
    warrantyMonths: v.warrantyMonths,
  },
  recommendedRoomSize: v.minSqm != null || v.maxSqm != null ? { minSqm: v.minSqm, maxSqm: v.maxSqm } : undefined,
  stock: { online: v.onlineStock ?? 0, showroom: v.showroomStock ?? 0 },
  keepImages,
});

function Section({ title, children }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography fontWeight={700} sx={{ mb: 1 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, saving, error } = useSelector((s) => s.adminProducts);
  const { categories, brands } = useSelector((s) => s.products);

  const [existing, setExisting] = useState([]);
  const [files, setFiles] = useState([]);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    dispatch(loadCatalogMeta());
    dispatch(clearAdminProduct());
    if (isEdit) dispatch(fetchAdminProduct(id));
  }, [dispatch, id, isEdit]);

  useEffect(() => {
    if (isEdit && current?._id === id) {
      reset(toFormValues(current));
      setExisting(current.images || []);
    }
  }, [current, id, isEdit, reset]);

  const onSubmit = async (values) => {
    const fd = new FormData();
    fd.append('data', JSON.stringify(toPayload(values, isEdit ? existing.map((i) => i.publicId) : undefined)));
    files.forEach((f) => fd.append('images', f));

    const saved = await dispatch(saveProduct(isEdit ? id : null, fd));
    if (saved) {
      toast.success(isEdit ? 'Product updated' : 'Product created');
      navigate('/admin/products');
    }
  };

  if (isEdit && current?._id !== id) return error ? <Alert severity="error">{error}</Alert> : <Loader fullPage />;

  const field = { register, errors };
  const typeOptions = categories.map((c) => ({ value: c._id, label: c.name }));
  const brandOptions = brands.map((b) => ({ value: b._id, label: b.name }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2.5}>
        <Typography variant="h4" fontWeight={800}>{isEdit ? 'Edit product' : 'Add product'}</Typography>
        {error && <Alert severity="error">{error}</Alert>}

        <Section title="Basic information">
          <Grid container columnSpacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}><RHFTextField name="name" label="Product name" {...field} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="modelNumber" label="Model number" {...field} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFSelect name="category" label="Type" control={control} errors={errors} options={typeOptions} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFSelect name="brand" label="Brand" control={control} errors={errors} options={brandOptions} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="price" label="Price (PHP)" type="number" {...field} /></Grid>
            <Grid size={12}><RHFTextField name="description" label="Description" multiline minRows={3} {...field} /></Grid>
            <Grid size={12}><RHFSwitch name="isAvailable" control={control} label="Visible and available for purchase" /></Grid>
          </Grid>
        </Section>

        <Section title="Specifications">
          <Grid container columnSpacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="capacityBTU" label="Cooling capacity (BTU)" type="number" {...field} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="capacityHP" label="Capacity (HP)" type="number" {...field} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFSelect name="energyRating" label="Energy efficiency" control={control} errors={errors} options={ENERGY_OPTIONS} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="powerConsumptionWatts" label="Power consumption (W)" type="number" {...field} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="refrigerantType" label="Refrigerant type" {...field} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="noiseLevelDb" label="Noise level (dB)" type="number" {...field} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="width" label="Width (mm)" type="number" {...field} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="height" label="Height (mm)" type="number" {...field} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="depth" label="Depth (mm)" type="number" {...field} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><RHFTextField name="warrantyMonths" label="Warranty (months)" type="number" {...field} /></Grid>
            <Grid size={{ xs: 6, sm: 4 }}><RHFTextField name="minSqm" label="Room size min (m²)" type="number" {...field} /></Grid>
            <Grid size={{ xs: 6, sm: 4 }}><RHFTextField name="maxSqm" label="Room size max (m²)" type="number" {...field} /></Grid>
            <Grid size={12}><RHFSwitch name="isInverter" control={control} label="Inverter" /></Grid>
          </Grid>
        </Section>

        {!isEdit && (
          <Section title="Initial stock">
            <Grid container columnSpacing={2}>
              <Grid size={{ xs: 6 }}><RHFTextField name="onlineStock" label="Online stock" type="number" {...field} /></Grid>
              <Grid size={{ xs: 6 }}><RHFTextField name="showroomStock" label="Showroom stock" type="number" {...field} /></Grid>
            </Grid>
          </Section>
        )}

        <Section title="Photos">
          <ImageUploader existing={existing} files={files} onExistingChange={setExisting} onFilesChange={setFiles} />
        </Section>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button component={RouterLink} to="/admin/products">Cancel</Button>
          <Button type="submit" variant="contained" size="large" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}