import { useEffect, useState } from 'react';
import { Box, Container, Grid, Typography } from '@mui/material';
import client from '../../api/client';

export default function Footer() {
  const [store, setStore] = useState({});

  useEffect(() => {
    client.get('/store-info').then((r) => setStore(r.data)).catch(() => {});
  }, []);

  return (
    <Box component="footer" sx={{ bgcolor: '#0f1b33', color: '#cfd8ea', py: 4, mt: 6 }}>
      <Container>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography sx={{
              fontWeight: 700
            }}>{store.storeName || 'Astron Showroom'}</Typography>
            <Typography variant="body2">{store.address}</Typography>
            <Typography variant="body2">{store.businessHours}</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography sx={{
              fontWeight: 700
            }}>After-sales</Typography>
            <Typography variant="body2">
              Warranty claims, repair, cleaning and maintenance requests are available from your account.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography sx={{
              fontWeight: 700
            }}>Contact</Typography>
            <Typography variant="body2">{store.email}</Typography>
            <Typography variant="body2">{store.phone}</Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}