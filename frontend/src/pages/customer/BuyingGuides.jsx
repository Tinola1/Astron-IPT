import { useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, LinearProgress, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SmartLink from '../../components/common/SmartLink';
import { getContent } from '../../api/content';

export default function BuyingGuides() {
  const [guides, setGuides] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getContent('buying_guide').then(setGuides).catch((e) => setError(e.message));
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Buying guides</Typography>
      <Typography sx={{ color: 'text.secondary', mt: -1 }}>Tips for choosing the right air conditioner.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {!guides && !error && <LinearProgress />}
      {guides?.length === 0 && <Alert severity="info">No guides yet. Please check back soon.</Alert>}
      {guides?.map((g, i) => (
        <Accordion key={g._id} defaultExpanded={i === 0} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography sx={{ fontWeight: 700 }}>{g.title}</Typography></AccordionSummary>
          <AccordionDetails>
            {g.image && <Box component="img" src={g.image} alt="" sx={{ maxWidth: '100%', maxHeight: 280, borderRadius: 2, mb: 2 }} />}
            {/* shown as plain text, never as HTML */}
            <Typography sx={{ whiteSpace: 'pre-line' }}>{g.body}</Typography>
            <SmartLink to={g.link} size="small" sx={{ mt: 1 }}>Related</SmartLink>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}