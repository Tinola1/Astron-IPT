import { useEffect, useRef, useState } from 'react';
import { Box, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { toast } from 'react-toastify';

const MAX_SIZE = 5 * 1024 * 1024;

function Tile({ src, label, onRemove, onPrimary, primary }) {
  return (
    <Box sx={{ position: 'relative', width: 120, height: 120, borderRadius: 2, overflow: 'hidden', bgcolor: '#eef2fb', border: '1px solid', borderColor: 'divider' }}>
      {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      {primary && <Chip size="small" color="primary" label="Primary" sx={{ position: 'absolute', left: 4, bottom: 4 }} />}
      {label && !primary && <Chip size="small" label={label} sx={{ position: 'absolute', left: 4, bottom: 4 }} />}
      <IconButton size="small" aria-label="Remove image" onClick={onRemove}
        sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(255,255,255,.85)', '&:hover': { bgcolor: '#fff' } }}>
        <CloseIcon fontSize="small" />
      </IconButton>
      {onPrimary && (
        <Tooltip title="Make primary">
          <IconButton size="small" aria-label="Make primary image" onClick={onPrimary}
            sx={{ position: 'absolute', top: 2, left: 2, bgcolor: 'rgba(255,255,255,.85)', '&:hover': { bgcolor: '#fff' } }}>
            <StarBorderIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

// existing: [{ url, publicId }] already on the server; files: File[] chosen but not uploaded yet
export default function ImageUploader({ existing, files, onExistingChange, onFilesChange, max = 6 }) {
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const total = existing.length + files.length;

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const addFiles = (list) => {
    const valid = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith('image/')) toast.error(`${f.name} is not an image`);
      else if (f.size > MAX_SIZE) toast.error(`${f.name} is larger than 5MB`);
      else valid.push(f);
    }
    const room = Math.max(max - total, 0);
    if (valid.length > room) toast.warn(`A product can have at most ${max} images`);
    if (valid.length) onFilesChange([...files, ...valid.slice(0, room)]);
  };

  const makePrimary = (index) => {
    const next = [...existing];
    const [picked] = next.splice(index, 1);
    onExistingChange([picked, ...next]);
  };

  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        sx={{ p: 3, textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed' }}
      >
        <CloudUploadIcon color="primary" />
        <Typography>Drag photos here or click to browse</Typography>
        <Typography variant="caption" color="text.secondary">
          Up to {max} images, 5MB each. The first image is the main photo. ({total}/{max})
        </Typography>
        <input
          ref={inputRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
      </Paper>

      {total > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={1.5}>
          {existing.map((img, i) => (
            <Tile
              key={img.publicId}
              src={img.url}
              primary={i === 0}
              onRemove={() => onExistingChange(existing.filter((x) => x.publicId !== img.publicId))}
              onPrimary={i > 0 ? () => makePrimary(i) : undefined}
            />
          ))}
          {files.map((f, i) => (
            <Tile
              key={`${f.name}-${f.size}-${i}`}
              src={previews[i]}
              label="New"
              primary={existing.length === 0 && i === 0}
              onRemove={() => onFilesChange(files.filter((_, j) => j !== i))}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}