import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

export default function ConfirmDialog({
  open, title, message, confirmText = 'Confirm', color = 'error', loading = false, onConfirm, onClose,
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><DialogContentText>{message}</DialogContentText></DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} color={color} variant="contained" disabled={loading}>
          {loading ? 'Working…' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}