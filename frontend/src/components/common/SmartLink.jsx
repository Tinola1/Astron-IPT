import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@mui/material';

// A page on this site opens inside the app; anything else opens in a new tab without sharing our page
export default function SmartLink({ to, children, ...props }) {
  if (!to) return null;
  const inside = to.startsWith('/') && !to.startsWith('//');
  return inside ? (
    <Button component={RouterLink} to={to} {...props}>{children}</Button>
  ) : (
    <Button component="a" href={to} target="_blank" rel="noopener noreferrer" {...props}>{children}</Button>
  );
}