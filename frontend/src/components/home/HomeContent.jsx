import { useEffect, useState } from 'react';
import { Box, Card, CardContent, CardMedia, Grid, IconButton, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SmartLink from '../common/SmartLink';
import { getContent } from '../../api/content';

function Banners({ items }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n, paused]);

  const b = items[i % n];
  return (
    <Box
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', minHeight: { xs: 180, md: 260 }, bgcolor: '#0f1b33', color: '#fff' }}
    >
      {b.image && <Box component="img" src={b.image} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(15,27,51,.85), rgba(15,27,51,.1))' }} />
      <Stack spacing={1} sx={{ position: 'relative', p: { xs: 2.5, md: 5 }, maxWidth: 560, justifyContent: 'center', minHeight: { xs: 180, md: 260 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{b.title}</Typography>
        {b.body && <Typography sx={{ whiteSpace: 'pre-line' }}>{b.body}</Typography>}
        <div><SmartLink to={b.link} variant="contained" color="secondary">Learn more</SmartLink></div>
      </Stack>
      {n > 1 && (
        <>
          <IconButton aria-label="Previous banner" onClick={() => setI((i + n - 1) % n)} sx={{ position: 'absolute', left: 6, top: '50%', color: '#fff', bgcolor: 'rgba(0,0,0,.3)' }}><ChevronLeftIcon /></IconButton>
          <IconButton aria-label="Next banner" onClick={() => setI((i + 1) % n)} sx={{ position: 'absolute', right: 6, top: '50%', color: '#fff', bgcolor: 'rgba(0,0,0,.3)' }}><ChevronRightIcon /></IconButton>
          <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', bottom: 10, left: 0, right: 0, justifyContent: 'center' }}>
            {items.map((x, k) => (
              <Box key={x._id} component="button" aria-label={`Banner ${k + 1}`} onClick={() => setI(k)}
                sx={{ width: 10, height: 10, p: 0, border: 0, borderRadius: '50%', cursor: 'pointer', bgcolor: k === i % n ? '#fff' : 'rgba(255,255,255,.5)' }} />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}

// Banners and promotion cards at the top of the shop. Shows nothing if there are none or they can't load.
export default function HomeContent() {
  const [banners, setBanners] = useState([]);
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    getContent('banner').then(setBanners).catch(() => {});
    getContent('promotion').then(setPromos).catch(() => {});
  }, []);

  if (!banners.length && !promos.length) return null;
  return (
    <Stack spacing={2}>
      {banners.length > 0 && <Banners items={banners} />}
      {promos.length > 0 && (
        <Grid container spacing={2}>
          {promos.map((p) => (
            <Grid key={p._id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                {p.image && <CardMedia component="img" height="140" image={p.image} alt="" />}
                <CardContent>
                  <Typography sx={{ fontWeight: 700 }}>{p.title}</Typography>
                  {p.body && <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>{p.body}</Typography>}
                  <SmartLink to={p.link} size="small" sx={{ mt: 1 }}>See details</SmartLink>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}