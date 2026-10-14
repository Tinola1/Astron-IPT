import { createTheme } from '@mui/material/styles';

export default createTheme({
  palette: {
    primary: { main: '#0b5fff' },
    secondary: { main: '#00a8a8' },
    background: { default: '#f5f7fb' },
  },
  typography: {
    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
});