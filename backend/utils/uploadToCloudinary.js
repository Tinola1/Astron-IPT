const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = (buffer, folder = 'astron') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });

const deleteFromCloudinary = (publicId) => cloudinary.uploader.destroy(publicId);

module.exports = { uploadToCloudinary, deleteFromCloudinary };
