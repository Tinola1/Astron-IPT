import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Paper, Typography } from '@mui/material';
import { clearCompare } from '../../store/actions/compareActions';
import CompareDialog from './CompareDialog';

export default function CompareBar() {
  const dispatch = useDispatch();
  const compare = useSelector((s) => s.compare);
  const [open, setOpen] = useState(false);

  if (!compare.length) return null;

  return (
    <>
      <Paper
        elevation={6}
        sx={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 2, zIndex: 1200,
        }}
      >
        <Typography><b>{compare.length}</b> of 3 selected</Typography>
        <Button variant="contained" size="small" disabled={compare.length < 2} onClick={() => setOpen(true)}>
          Compare
        </Button>
        <Button size="small" onClick={() => dispatch(clearCompare())}>Clear</Button>
      </Paper>
      <CompareDialog open={open} onClose={() => setOpen(false)} products={compare} />
    </>
  );
}