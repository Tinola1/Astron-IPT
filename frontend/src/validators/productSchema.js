import * as yup from 'yup';

// '' -> undefined so empty optional number inputs pass validation
const optNum = (label, min = 0) =>
  yup
    .number()
    .transform((v, original) => (original === '' || original === null ? undefined : v))
    .typeError(`${label} must be a number`)
    .min(min, `${label} must be at least ${min}`);

export const productSchema = yup.object({
  name: yup.string().trim().required('Product name is required').max(120, 'Max 120 characters'),
  modelNumber: yup.string().trim().required('Model number is required').max(60, 'Max 60 characters'),
  description: yup.string().trim().max(2000, 'Max 2000 characters'),
  category: yup.string().required('Select a product type'),
  brand: yup.string().required('Select a brand'),
  price: optNum('Price').required('Price is required'),
  isAvailable: yup.boolean(),

  capacityBTU: optNum('Capacity', 1).required('Capacity (BTU) is required'),
  capacityHP: optNum('HP'),
  isInverter: yup.boolean(),
  energyRating: yup.string(),
  powerConsumptionWatts: optNum('Power'),
  refrigerantType: yup.string().trim(),
  noiseLevelDb: optNum('Noise level'),
  width: optNum('Width'),
  height: optNum('Height'),
  depth: optNum('Depth'),
  warrantyMonths: optNum('Warranty'),

  minSqm: optNum('Min size'),
  maxSqm: optNum('Max size').test('gte-min', 'Max must be at least the min', function (v) {
    const min = this.parent.minSqm;
    return v == null || min == null || v >= min;
  }),

  onlineStock: optNum('Online stock').integer('Whole units only'),
  showroomStock: optNum('Showroom stock').integer('Whole units only'),
});