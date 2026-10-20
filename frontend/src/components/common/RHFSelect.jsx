import { Controller } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';

// options: [{ value, label }]
export default function RHFSelect({ name, control, errors, label, options, ...props }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          select
          fullWidth
          margin="normal"
          label={label}
          {...field}
          value={field.value ?? ''}
          error={!!errors[name]}
          helperText={errors[name]?.message}
          {...props}
        >
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}