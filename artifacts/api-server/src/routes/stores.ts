import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

router.get("/stores/:slug", async (req, res) => {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", req.params.slug)
    .single();
  if (error) return res.status(404).json({ error: "Store not found" });
  return res.json(data);
});

router.post("/stores", async (req, res) => {
  const { name, slug, whatsapp, category, location } = req.body;
  if (!name || !slug || !whatsapp) {
    return res.status(400).json({ error: "name, slug, and whatsapp are required" });
  }
  const { data, error } = await supabase
    .from("stores")
    .insert({ name, slug, whatsapp, category, location })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
});

router.patch("/stores/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("stores")
    .update(req.body)
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

export default router;
