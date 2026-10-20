import { Controller } from 'react-hook-form';
import { FormControlLabel, Switch } from '@mui/material';

export default function RHFSwitch({ name, control, label }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControlLabel
          control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
          label={label}
        />
      )}
    />
  );
}