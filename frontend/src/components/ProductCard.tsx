import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import type { Product } from "../types";
import { money } from "../utils/money";

export function ProductCard({ product }: { product: Product }) {
  const { add, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const cartQuantity = items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const canAdd = cartQuantity < product.inventory;

  useEffect(() => {
    if (!justAdded) return;
    const timer = window.setTimeout(() => setJustAdded(false), 500);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  const addToCart = () => {
    if (!canAdd || justAdded) return;
    add(product, 1);
    setJustAdded(true);
  };

  return <article className="product-card">
    <Link to={`/products/${product.id}`} className="product-art" aria-label={`View ${product.name}`}><span>{product.image_url}</span>{product.badge && <em>{product.badge}</em>}</Link>
    <div className="product-info"><small>{product.category}</small><Link to={`/products/${product.id}`}><h3>{product.name}</h3></Link><p>{product.description}</p>
      <div className="product-bottom"><strong>{money(product.price)}</strong><button className={`icon-button${justAdded ? " added" : ""}`} disabled={!canAdd || justAdded} onClick={addToCart} aria-label={justAdded ? `${product.name} added to cart` : canAdd ? `Add ${product.name} to cart` : `${product.name} has reached its inventory limit`}>{justAdded ? "✓" : canAdd ? "+" : "×"}</button></div>
    </div>
  </article>;
}
