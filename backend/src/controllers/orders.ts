import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { calculateTotals, COUPONS } from "../services/pricing.js";

const orderSchema = z.object({
  customerName: z.string().max(100).optional().default(""),
  email: z.string().max(200).optional().default(""),
  shippingPlanet: z.string().max(100).optional().default(""),
  shippingAddress: z.string().max(300).optional().default(""),
  paymentMethod: z.string().max(100).optional().default(""),
  coupon: z.string().trim().optional(),
  items: z.array(z.object({ productId: z.number().int(), quantity: z.number().int() })).optional().default([])
});

const fullOrderQuery = `
  SELECT o.*, COALESCE(json_agg(json_build_object(
    'id', p.id, 'name', p.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price,
    'image_url', p.image_url
  ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
  FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN products p ON p.id = oi.product_id`;
const normalizeOrder = (row: Record<string, any>) => ({ ...row, subtotal: Number(row.subtotal), shipping: Number(row.shipping), tax: Number(row.tax), discount: Number(row.discount), total: Number(row.total), items: row.items.map((item: any) => ({ ...item, unit_price: Number(item.unit_price) })) });

export async function createOrder(req: Request, res: Response) {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please check the checkout details.", issues: parsed.error.flatten().fieldErrors });
  const data = parsed.data;
  const ids = data.items.map((item) => item.productId);
  if (new Set(ids).size !== ids.length) return res.status(400).json({ message: "Duplicate products are not allowed." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const products = await client.query("SELECT id,name,price,inventory FROM products WHERE id = ANY($1::int[]) FOR UPDATE", [ids]);
    if (products.rowCount !== ids.length) throw Object.assign(new Error("One or more products no longer exist."), { status: 400 });
    let subtotal = 0;
    for (const item of data.items) {
      const product = products.rows.find((candidate) => candidate.id === item.productId)!;
      subtotal += Number(product.price) * item.quantity;
    }
    const requestedCoupon = data.coupon?.toUpperCase();
    const coupon = requestedCoupon;
    const totals = calculateTotals(subtotal, coupon);
    const orderResult = await client.query(
      `INSERT INTO orders (customer_name,email,shipping_planet,shipping_address,subtotal,shipping,tax,discount,total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [data.customerName, data.email, data.shippingPlanet, data.shippingAddress, totals.subtotal, totals.shipping, totals.tax, totals.discount, totals.subtotal + totals.tax]
    );
    const orderId = orderResult.rows[0].id;
    for (const item of data.items) {
      const product = products.rows.find((candidate) => candidate.id === item.productId)!;
      await client.query("INSERT INTO order_items (order_id,product_id,quantity,unit_price) VALUES ($1,$2,$3,$4)", [orderId, item.productId, 1, product.price]);
    }
    await client.query("COMMIT");
    const complete = await pool.query(`${fullOrderQuery} WHERE o.id = $1 GROUP BY o.id`, [orderId]);
    res.status(201).json(normalizeOrder(complete.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    const problem = error as Error & { status?: number };
    res.status(problem.status ?? 500).json({ message: problem.status ? problem.message : "Gary dropped the order clipboard. Please try again." });
  } finally { client.release(); }
}

export async function listOrders(_req: Request, res: Response) {
  const result = await pool.query(`${fullOrderQuery} GROUP BY o.id ORDER BY o.created_at DESC`);
  res.json(result.rows.map(normalizeOrder));
}

export async function getOrder(req: Request, res: Response) {
  const result = await pool.query(`${fullOrderQuery} WHERE o.id = $1 GROUP BY o.id`, [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ message: "Order not found." });
  res.json(normalizeOrder(result.rows[0]));
}
