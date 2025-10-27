// app/middlewares/multer.js
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import streamifier from "streamifier";
import sharp from "sharp";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "profile_photo" || file.fieldname === "id_proof") {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`${file.fieldname} must be an image file`), false);
    }
  } else if (file.fieldname === "images") {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Images must be image files"), false);
    }
  } else if (file.fieldname === "brouchers") {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Brouchers must be a PDF"), false);
    }
  } else {
    cb(new Error("Unexpected field"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
}).fields([
  { name: "profile_photo", maxCount: 1 },
  { name: "id_proof", maxCount: 1 },
  { name: "images", maxCount: 10 },
  { name: "brouchers", maxCount: 1 },
]);

const resizeImageBuffer = async (buffer) => {
  return await sharp(buffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
};

const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        format: "webp",
        transformation: [{ quality: "auto" }],
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary Upload Error:", error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

const uploadFilesToCloudinary = async (files) => {
  const results = {};

  for (const [key, value] of Object.entries(files)) {
    if (!value) {
      results[key] = null;
      continue;
    }

    // Check if value is an array (multer style)
    if (Array.isArray(value)) {
      // For images array - resize & upload each
      if (key === "images") {
        const uploadPromises = value.map(async (file) => {
          const optimizedBuffer = await resizeImageBuffer(file.buffer);
          return uploadToCloudinary(optimizedBuffer, `projects/${key}`);
        });
        results[key] = await Promise.all(uploadPromises);
      }
      // For brouchers array - upload first file as PDF/raw
      else if (key === "brouchers") {
        const file = value[0];
        results[key] = [
          await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: `projects/${key}`,
                resource_type: "raw", // PDFs
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
              }
            );
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
          }),
        ];
      }
      // For other fields, handle as needed or error
      else {
        results[key] = null;
      }
    } else if (Buffer.isBuffer(value)) {
      // For single Buffer (profile_photo, id_proof)
      const optimizedBuffer = await resizeImageBuffer(value);
      results[key] = await uploadToCloudinary(optimizedBuffer, `channelPartners/${key}s`);
    } else {
      results[key] = null;
    }
  }

  return results;
};

export { cloudinary, upload, uploadToCloudinary, uploadFilesToCloudinary };