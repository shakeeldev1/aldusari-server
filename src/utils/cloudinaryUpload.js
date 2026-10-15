import { Readable } from 'node:stream';
import cloudinary from '../config/cloudinary.js';

export function uploadImage(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'al-dosari/articles', resource_type: 'image' }, (error, result) => {
      if (error) reject(error); else resolve(result);
    });
    Readable.from(file.buffer).pipe(stream);
  });
}
