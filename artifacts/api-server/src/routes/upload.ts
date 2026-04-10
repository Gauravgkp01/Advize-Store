import { Router, Request, Response } from "express";
import multer from "multer";
import { supabase } from "../lib/supabase.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const BUCKET = "product-images";

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

router.post("/upload", upload.single("image"), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No image file provided" });

  try {
    await ensureBucket();

    const ext = file.originalname.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) return res.status(500).json({ error: error.message });

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return res.status(201).json({ url: data.publicUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Upload failed" });
  }
});

export default router;
