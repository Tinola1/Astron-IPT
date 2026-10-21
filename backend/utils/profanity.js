const { Filter } = require('bad-words');

const filter = new Filter();

// bad-words ships an English list; add common Filipino profanity too. Extend as needed.
filter.addWords(
  'gago', 'gaga', 'tangina', 'tanginamo', 'putangina', 'putang',
  'bobo', 'ulol', 'tarantado', 'pakyu', 'punyeta'
);

// Returns the text with bad words replaced by asterisks, and whether anything was masked
function maskProfanity(text) {
  const original = String(text || '');
  if (!original) return { text: '', masked: false };
  const clean = filter.clean(original);
  return { text: clean, masked: clean !== original };
}

module.exports = { maskProfanity };