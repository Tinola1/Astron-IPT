import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Avatar, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Paper, Stack, Switch,
  Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { createContent, deleteContent, listContent, setContentPublished, updateContent } from '../../../api/content';

const KINDS = [
  { type: 'banner', title: 'Banners', one: 'banner', maxBody: 500, imageRequired: true },
  { type: 'promotion', title: 'Promotions', one: 'promotion', maxBody: 500, imageRequired: false },
  { type: 'buying_guide', title: 'Buying guides', one: 'guide', maxBody: 5000, imageRequired: false },
];
const MAX_SIZE = 5 * 1024 * 1024;
const TYPES_OK = ['image/jpeg', 'image/png', 'image/webp'];
const linkOk = (v) => !v || /^\/(?!\/)[A-Za-z0-9\-._~/?=&#%]*$/.test(v) || /^https?:\/\/\S+$/i.test(v);

export default function ContentList() {
  const [tab, setTab] = useState(0);
  const kind = KINDS[tab];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // { id?, title, body, link, order, isPublished, image (url), file, removeImage }
  const [preview, setPreview] = useState('');
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await listContent(kind.type));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [kind.type]);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form?.file) return setPreview('');
    const url = URL.createObjectURL(form.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form?.file]);

  const run = async (fn, okMsg, after) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      after?.();
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!TYPES_OK.includes(f.type)) return toast.error('Use a JPG, PNG or WebP image');
    if (f.size > MAX_SIZE) return toast.error('The image must be 5MB or smaller');
    setForm({ ...form, file: f, removeImage: false });
  };

  const shownImage = form && !form.removeImage ? preview || form.image : '';
  const orderNum = Number(form?.order);
  const valid = form && form.title.trim() && form.body.length <= kind.maxBody && linkOk(form.link.trim())
    && Number.isInteger(orderNum) && orderNum >= 0 && orderNum <= 9999 && (!kind.imageRequired || shownImage);

  const save = () => {
    const body = {
      type: kind.type, title: form.title, body: form.body, link: form.link.trim(), order: orderNum,
      isPublished: form.isPublished, ...(form.removeImage ? { removeImage: true } : {}),
    };
    return run(() => (form.id ? updateContent(form.id, body, form.file) : createContent(body, form.file)), 'Saved', () => setForm(null));
  };
  const blank = { title: '', body: '', link: '', order: '0', isPublished: true, image: '', file: null, removeImage: false };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Website content</Typography>
        <Button variant="contained" onClick={() => setForm({ ...blank })}>Add {kind.one}</Button>
      </Stack>
      <Typography sx={{ color: 'text.secondary', mt: -1 }}>Banners and promotions show at the top of the shop. Guides are on the Buying guides page. Lower order numbers come first.</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>{KINDS.map((k) => <Tab key={k.type} label={k.title} />)}</Tabs>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>Image</TableCell><TableCell>Title</TableCell><TableCell>Link</TableCell><TableCell align="right">Order</TableCell><TableCell>Published</TableCell><TableCell /></TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>{r.image ? <Avatar variant="rounded" src={r.image} alt="" sx={{ width: 56, height: 36 }} /> : '-'}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>{r.link ? <Chip size="small" variant="outlined" label={r.link.length > 28 ? `${r.link.slice(0, 28)}…` : r.link} /> : '-'}</TableCell>
                  <TableCell align="right">{r.order}</TableCell>
                  <TableCell>
                    <Switch size="small" checked={r.isPublished} disabled={busy} onChange={(e) => run(() => setContentPublished(r._id, e.target.checked), e.target.checked ? 'Published' : 'Hidden from the shop')} slotProps={{ input: { 'aria-label': 'Published' } }} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setForm({ id: r._id, title: r.title, body: r.body, link: r.link, order: String(r.order), isPublished: r.isPublished, image: r.image, file: null, removeImage: false })}>Edit</Button>
                    <Button size="small" color="error" onClick={() => setDel(r)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">Nothing here yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!form} onClose={busy ? undefined : () => setForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{form?.id ? 'Edit' : 'Add'} {kind.one}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} slotProps={{ htmlInput: { maxLength: 100 } }} />
              <TextField label={kind.type === 'buying_guide' ? 'Guide text' : 'Short text (optional)'} multiline minRows={kind.type === 'buying_guide' ? 6 : 2} value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })} error={form.body.length > kind.maxBody} helperText={`${form.body.length}/${kind.maxBody} · plain text`} />
              <TextField label="Link (optional)" placeholder="/guides or https://…" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
                error={!linkOk(form.link.trim())} helperText={!linkOk(form.link.trim()) ? 'A page on this site (like /guides) or a full https:// address' : ''} />
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <TextField label="Order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} sx={{ width: 110 }} />
                <Stack direction="row" sx={{ alignItems: 'center' }}>
                  <Switch checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                  <Typography>Published</Typography>
                </Stack>
              </Stack>
              <div>
                <Typography variant="body2" sx={{ mb: 0.5 }}>Image {kind.imageRequired ? '(required)' : '(optional)'} · JPG, PNG or WebP, up to 5MB</Typography>
                {shownImage && <img src={shownImage} alt="" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, display: 'block', marginBottom: 8 }} />}
                <Button component="label" size="small" variant="outlined">
                  {shownImage ? 'Change image' : 'Choose image'}
                  <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} />
                </Button>
                {shownImage && !kind.imageRequired && (
                  <Button size="small" color="error" sx={{ ml: 1 }} onClick={() => setForm({ ...form, file: null, removeImage: true })}>Remove image</Button>
                )}
              </div>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!valid || busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!del} title={`Delete ${kind.one}?`} message={del ? `"${del.title}" will be removed from the shop for good.` : ''} confirmText="Delete" loading={busy}
        onConfirm={() => run(() => deleteContent(del._id), 'Deleted', () => setDel(null))} onClose={() => setDel(null)} />
    </Stack>
  );
}