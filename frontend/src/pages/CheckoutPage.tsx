import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OrderSummary } from "../components/OrderSummary";
import { useCart } from "../context/CartContext";
import { api } from "../services/api";
import type { AppliedCoupon, Totals } from "../types";
import { baseTotals, money } from "../utils/money";

export function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ customerName: "", email: "", shippingPlanet: "", shippingAddress: "", paymentMethod: "" });
  const coupon = sessionStorage.getItem("galactic-coupon") || undefined;
  let appliedCoupons: AppliedCoupon[] = [];
  let displayedTotals: Totals = baseTotals(cart.subtotal);

  try {
    const stored = JSON.parse(sessionStorage.getItem("galactic-totals") ?? "null") as Totals | null;
    appliedCoupons = JSON.parse(sessionStorage.getItem("galactic-applied-coupons") ?? "[]") as AppliedCoupon[];
    if (stored?.subtotal === displayedTotals.subtotal) displayedTotals = stored;
  } catch {
    sessionStorage.removeItem("galactic-totals");
    sessionStorage.removeItem("galactic-applied-coupons");
  }

  if (!cart.items.length) return <div className="wrap page empty">
    <span>🛰️</span><h1>Nothing to check out</h1>
    <p>Your cargo escaped while you weren't looking.</p>
    <Link className="button primary" to="/products">Return to shop</Link>
  </div>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const order = await api.checkout({
        ...form,
        coupon,
        items: cart.items.map((item) => ({ productId: item.product.id, quantity: item.quantity }))
      });
      cart.clear();
      sessionStorage.removeItem("galactic-coupon");
      sessionStorage.removeItem("galactic-totals");
      sessionStorage.removeItem("galactic-applied-coupons");
      navigate(`/orders/${order.id}/confirmation`, { state: { order } });
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally { setBusy(false); }
  };

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [name]: event.target.value })
  });

  return<>
    <Link to="/cart" className="back-link">← Return to cart</Link>
    <div className="catalog-head"><span className="kicker">Final docking procedure</span><h1>Checkout</h1><p>No real payment will be processed. Gary promises.</p></div>
    <div className="checkout-layout">
      <form className="checkout-form" onSubmit={submit}>
        <fieldset><legend><span>1</span> Contact signal</legend><div className="field-grid">
          <label>Customer name<input autoComplete="name" placeholder="Earth name" {...field("customerName")}/></label>
          <label>Email<input autoComplete="email" placeholder="you@planet.example" {...field("email")}/></label>
        </div></fieldset>
        <fieldset><legend><span>2</span> Delivery coordinates</legend><div className="field-grid">
          <label>Shipping planet<input placeholder="Earth" {...field("shippingPlanet")}/></label>
          <label className="full">Shipping address<input autoComplete="street-address" placeholder="Building, street, region, postal code" {...field("shippingAddress")}/></label>
        </div></fieldset>
        <fieldset><legend><span>3</span> Payment simulation</legend>
          <label>Payment method<select {...field("paymentMethod")}><option value="">No method selected</option><option>Intergalactic Credit Card</option><option>Space Cash on Delivery</option><option>Three Shiny Rocks</option></select></label>
          <div className="payment-placeholder">💳 <div><b>Workshop payment mode</b><small>No card numbers are collected or transmitted.</small></div></div>
        </fieldset>
        {error && <div className="state error">⚠ {error}</div>}
        <button className="button primary wide">{busy ? "Gary is filing paperwork…" : "Place order (no real charge)"}</button>
      </form>
      <aside className="order-summary checkout-summary">
        <h2>Your cargo</h2>
        {cart.items.map((item) => <div className="mini-item" key={item.product.id}><span>{item.product.image_url}</span><div><b>{item.product.name}</b><small>Qty {item.quantity}</small></div><b>{money(item.product.price * item.quantity)}</b></div>)}
        <OrderSummary totals={displayedTotals} appliedCoupons={appliedCoupons}/>
      </aside>
    </div>
    </>
    ;
}
