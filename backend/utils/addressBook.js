const mongoose = require('mongoose');
const { httpError } = require('./http');

const MAX_ADDRESSES = 10;

// All of these mutate the (Mongoose) user document; the caller saves it.

function findAddress(user, id) {
  const addr = mongoose.isValidObjectId(id) ? user.addresses.id(id) : null;
  if (!addr) throw httpError(404, 'Address not found');
  return addr;
}

function setDefault(user, id) {
  user.addresses.forEach((a) => {
    a.isDefault = String(a._id) === String(id);
  });
}

function addAddress(user, data) {
  if (user.addresses.length >= MAX_ADDRESSES) throw httpError(400, `You can save up to ${MAX_ADDRESSES} addresses`);
  const { isDefault, ...fields } = data;
  const makeDefault = isDefault || user.addresses.length === 0; // the first address is always the default
  if (makeDefault) user.addresses.forEach((a) => { a.isDefault = false; });
  user.addresses.push({ ...fields, isDefault: makeDefault });
  return user.addresses[user.addresses.length - 1];
}

function updateAddress(user, id, data) {
  const addr = findAddress(user, id);
  const { isDefault, ...fields } = data;
  addr.set(fields); // blank optional fields come through as undefined, which clears them
  if (isDefault) setDefault(user, id); // un-defaulting directly isn't allowed: pick another one as the default instead
  return addr;
}

function removeAddress(user, id) {
  const addr = findAddress(user, id);
  const wasDefault = addr.isDefault;
  user.addresses.pull(addr._id);
  if (wasDefault && user.addresses.length) user.addresses[0].isDefault = true; // always keep a default
}

module.exports = { MAX_ADDRESSES, addAddress, updateAddress, removeAddress, setDefault, findAddress };