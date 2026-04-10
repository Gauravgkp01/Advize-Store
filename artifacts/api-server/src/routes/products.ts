import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

router.get("/products", async (req, res) => {
  const { store_id } = req.query;
  let query = supabase.from("products").select("*, variants:product_variants(*)");
  if (store_id) query = query.eq("store_id", store_id);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.get("/products/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: "Product not found" });
  return res.json(data);
});

router.post("/products", async (req, res) => {
  const { store_id, name, price, description, image_url, category, units, variants } = req.body;
  if (!store_id || !name || !price) {
    return res.status(400).json({ error: "store_id, name, and price are required" });
  }
  const { data: product, error } = await supabase
    .from("products")
    .insert({ store_id, name, price, description, image_url, category, units: units ?? 0 })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  if (variants && Array.isArray(variants) && variants.length > 0) {
    const rows = variants.map((v: { label: string; values: string[] }) => ({
      product_id: product.id,
      label: v.label,
      values: v.values,
    }));
    await supabase.from("product_variants").insert(rows);
  }

  const { data: full } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("id", product.id)
    .single();

  return res.status(201).json(full);
});

router.patch("/products/:id", async (req, res) => {
  const { variants, ...fields } = req.body;
  const { data: product, error } = await supabase
    .from("products")
    .update(fields)
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  if (variants && Array.isArray(variants)) {
    await supabase.from("product_variants").delete().eq("product_id", req.params.id);
    if (variants.length > 0) {
      const rows = variants.map((v: { label: string; values: string[] }) => ({
        product_id: req.params.id,
        label: v.label,
        values: v.values,
      }));
      await supabase.from("product_variants").insert(rows);
    }
  }

  const { data: full } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("id", product.id)
    .single();

  return res.json(full);
});

router.delete("/products/:id", async (req, res) => {
  const { error } = await supabase.from("products").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  return res.status(204).send();
});

export default router;
