import { TextField } from '@mui/material';

export default function RHFTextField({ name, register, errors, ...props }) {
  const { ref, ...field } = register(name);
  return (
    <TextField
      inputRef={ref}
      {...field}
      error={!!errors[name]}
      helperText={errors[name]?.message}
      fullWidth
      margin="normal"
      {...props}
    />
  );
}