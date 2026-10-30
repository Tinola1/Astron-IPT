import * as yup from 'yup';
import { todayISO } from '../utils/dates';

export const REQUEST_TYPES = [
  { value: 'repair', label: 'Repair' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'warranty_claim', label: 'Warranty claim' },
];

export const serviceRequestSchema = yup.object({
  type: yup.string().oneOf(REQUEST_TYPES.map((t) => t.value), 'Choose a request type').required('Choose a request type'),
  warranty: yup.string().when('type', {
    is: 'warranty_claim',
    then: (s) => s.required('Choose the unit you are claiming for'),
  }),
  description: yup
    .string()
    .trim()
    .required('Describe the problem or the service you need')
    .min(10, 'Please write at least 10 characters')
    .max(1000, 'At most 1000 characters'),
  preferredDate: yup.string().test('not-past', 'Choose today or a later date', (v) => !v || v >= todayISO()),
});