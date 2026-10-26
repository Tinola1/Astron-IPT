import * as yup from 'yup';

const PH_PHONE = /^(\+?63|0)?9\d{9}$/;
const PHONE_MSG = 'Enter a valid PH mobile number, e.g. 09171234567';

export const profileSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be at most 80 characters'),
  phone: yup.string().trim().matches(PH_PHONE, { message: PHONE_MSG, excludeEmptyString: true }),
});

// requireCurrent is false for accounts created with Google that have no password yet
export const makePasswordSchema = (requireCurrent) =>
  yup.object({
    currentPassword: requireCurrent ? yup.string().required('Enter your current password') : yup.string(),
    newPassword: yup
      .string()
      .required('Enter a new password')
      .min(6, 'Password must be at least 6 characters')
      .max(72, 'Password must be at most 72 characters')
      .test('different', 'Your new password must be different from the current one', function (value) {
        return !value || !requireCurrent || value !== this.parent.currentPassword;
      }),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('newPassword')], 'Passwords do not match')
      .required('Confirm your new password'),
  });

export const addressSchema = yup.object({
  label: yup.string().trim().max(30, 'At most 30 characters'),
  recipient: yup.string().trim().max(80, 'At most 80 characters').required('Recipient is required'),
  phone: yup.string().trim().required('Phone is required').matches(PH_PHONE, PHONE_MSG),
  street: yup.string().trim().max(150, 'At most 150 characters').required('Street address is required'),
  barangay: yup.string().trim().max(80, 'At most 80 characters'),
  city: yup.string().trim().max(80, 'At most 80 characters').required('City is required'),
  province: yup.string().trim().max(80, 'At most 80 characters').required('Province is required'),
  postalCode: yup.string().trim().matches(/^\d{4}$/, { message: 'Postal code must be 4 digits', excludeEmptyString: true }),
  isDefault: yup.boolean(),
});