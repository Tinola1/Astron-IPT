import * as yup from 'yup';

const email = yup.string().trim().email('Enter a valid email').required('Email is required');
const password = yup
  .string()
  .required('Password is required')
  .min(8, 'Password must be at least 8 characters');

export const loginSchema = yup.object({
  email,
  password: yup.string().required('Password is required'),
});

export const registerSchema = yup.object({
  name: yup.string().trim().required('Name is required'),
  email,
  phone: yup
    .string()
    .trim()
    .matches(/^(\+?63|0)?9\d{9}$/, { message: 'Enter a valid PH mobile number', excludeEmptyString: true }),
  password,
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

export const forgotSchema = yup.object({ email });

export const resetSchema = yup.object({
  password,
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});