import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { bucket } from "../lib/firebase.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post("/upload", (req: Request, res: Response, next: NextFunction) => {
  upload.single("image")(req, res, (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "Image is too large. Please use an image under 15 MB." });
      }
      return res.status(400).json({ error: err.message ?? "Upload error" });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No image file provided" });

  try {
    const ext = file.originalname.split(".").pop() ?? "jpg";
    const filename = `product-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const fileRef = bucket.file(filename);
    await fileRef.save(file.buffer, {
      contentType: file.mimetype,
      metadata: { cacheControl: "public, max-age=31536000" },
    });
    await fileRef.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    return res.status(201).json({ url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Upload failed" });
  }
});

export default router;
