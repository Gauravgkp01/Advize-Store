import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

router.get("/reviews", async (req, res) => {
  const { product_id } = req.query;
  if (!product_id) return res.status(400).json({ error: "product_id is required" });
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", product_id)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.post("/reviews", async (req, res) => {
  const { product_id, name, rating, comment } = req.body;
  if (!product_id || !name || !rating || !comment) {
    return res.status(400).json({ error: "product_id, name, rating, and comment are required" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be between 1 and 5" });
  }
  const { data, error } = await supabase
    .from("reviews")
    .insert({ product_id, name, rating, comment })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
});

export default router;
