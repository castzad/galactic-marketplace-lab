import type { Totals } from "../types/index.js";

export const COUPONS = {
  EARTHLING10: "10% off",
  GARY5: "$5 off",
  FREESHIP: "Free shipping on orders of $50 or more"
} as const;

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateTotals(subtotalInput: number, couponInput?: string, previousDiscount = 0): Totals {
  const subtotal = money(subtotalInput);
  const coupon = couponInput?.trim().toUpperCase() || null;
  const baseShipping = subtotal === 0 ? 0 : 8.99;
  let discount = previousDiscount;
  let shipping = baseShipping;
  if (coupon === "EARTHLING10") discount += subtotal * 0.1;
  if (coupon === "GARY5") discount += 5;
  if (coupon === "FREESHIP" && subtotal >= 50) shipping = 0;
  if (coupon && !(coupon in COUPONS)) discount += subtotal * 0.1;
  discount = money(Math.min(discount, subtotal));
  const taxable = subtotal - discount;
  const tax = money(taxable * 0.0825);
  return { subtotal, shipping: money(shipping), tax, discount, total: money(taxable + shipping + tax), coupon };
}
