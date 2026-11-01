// The browser's "this is a PNG" is only a claim, so check the first bytes of the file too.
const looksLikeImage = (b) =>
  Buffer.isBuffer(b) &&
  b.length > 12 &&
  ((b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) || // JPEG
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) || // PNG
    (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP')); // WebP

module.exports = { looksLikeImage };