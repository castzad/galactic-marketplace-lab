import { useLocation, useParams, Link } from "react-router-dom";
import { ErrorMessage, Loading } from "../components/States";
import { useFetch } from "../hooks/useFetch";
import { api } from "../services/api";
import type { Order } from "../types";
import { money } from "../utils/money";

export function ConfirmationPage() {
  const { id = "" } = useParams(); const state = useLocation().state as { order?: Order } | null; const fetched = useFetch(() => state?.order ? Promise.resolve(state.order) : api.order(id), [id]);
  if (fetched.loading) return <div className="wrap page"><Loading/></div>; if (fetched.error || !fetched.data) return <div className="wrap page"><ErrorMessage message={fetched.error || "Order unavailable"}/></div>;
  const order = fetched.data;
  return <div className="wrap page confirmation"><div className="confirmation-icon">✓</div><span className="kicker">Transmission received</span><h1>Order confirmed!</h1><p>Gary has printed your order on the universe's smallest clipboard.</p><article><div><small>ORDER NUMBER</small><b>GM-{String(order.id).padStart(5, "0")}</b></div><div><small>DESTINATION</small><b>{order.shipping_planet}</b></div><div><small>STATUS</small><b className="status">● {order.status}</b></div><div><small>TOTAL</small><b>{money(order.total)}</b></div></article><p className="confirmation-note">A pretend confirmation was sent to <b>{order.email}</b>. Your cargo is now Gary's top priority, tied with lunch.</p><div className="button-row"><Link to="/orders" className="button primary">View order history</Link><Link to="/products" className="button secondary">Continue shopping</Link></div></div>;
}
