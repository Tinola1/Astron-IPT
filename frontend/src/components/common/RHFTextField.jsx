import { TextField } from '@mui/material';

// Pass `watch` (from useForm) on fields whose value can be set from code (e.g. "use a saved address"),
// so the label floats up when the value is filled in without typing.
export default function RHFTextField({ name, register, errors, watch, slotProps, ...props }) {
  const { ref, ...field } = register(name);
  const filled = watch ? Boolean(watch(name)) : false;
  const mergedSlotProps = filled
    ? { ...slotProps, inputLabel: { ...slotProps?.inputLabel, shrink: true } }
    : slotProps;
  return (
    <TextField
      inputRef={ref}
      {...field}
      error={!!errors[name]}
      helperText={errors[name]?.message}
      fullWidth
      margin="normal"
      slotProps={mergedSlotProps}
      {...props}
    />
  );
}