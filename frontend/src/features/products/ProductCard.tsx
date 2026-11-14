import { useState } from 'react';
import { formatMoney } from '../../shared/format/currency';
import styles from './ProductCard.module.css';
import { QuantitySelector } from './QuantitySelector';
import { MAX_UNITS_PER_ORDER, type Product } from './types';

const LOW_STOCK = 3;

interface Props {
  product: Product;
  onBuy: (quantity: number) => void;
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return <span className={`${styles.badge} ${styles.soldOut}`}>Agotado</span>;
  }
  if (stock <= LOW_STOCK) {
    return (
      <span className={`${styles.badge} ${styles.low}`}>
        ¡Solo {stock === 1 ? 'queda 1 unidad' : `quedan ${stock} unidades`}!
      </span>
    );
  }
  return <span className={styles.badge}>{stock} unidades disponibles</span>;
}

export function ProductCard({ product, onBuy }: Props) {
  const maxQuantity = Math.min(product.stock, MAX_UNITS_PER_ORDER);
  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  // If the stock dropped (another purchase), never offer more than exists.
  const safeQuantity = Math.min(quantity, Math.max(maxQuantity, 1));
  const soldOut = product.stock === 0;

  return (
    <article className={styles.card} aria-labelledby={`product-${product.id}`}>
      {/* The initial is always underneath; the photo fades in on top only
          once it has loaded, so a slow, hanging or broken image never
          leaves an empty box. */}
      <div className={styles.media} role="img" aria-label={product.name}>
        <span className={styles.initial} aria-hidden="true">
          {product.name.charAt(0)}
        </span>
        {product.imageUrl && !imageFailed && (
          <img
            className={`${styles.image} ${imageLoaded ? styles.loaded : ''}`}
            src={product.imageUrl}
            alt=""
            loading="lazy"
            width={600}
            height={450}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.heading}>
          <h2 id={`product-${product.id}`} className={styles.name}>
            {product.name}
          </h2>
          <StockBadge stock={product.stock} />
        </div>
        <p className={styles.description}>{product.description}</p>
        <p className={styles.price}>
          {formatMoney(product.priceInCents, product.currency)}
        </p>

        {!soldOut && maxQuantity > 1 && (
          <div className={styles.quantityRow}>
            <span className={styles.quantityLabel}>Cantidad</span>
            <QuantitySelector
              value={safeQuantity}
              max={maxQuantity}
              onChange={setQuantity}
              label={`Cantidad de ${product.name}`}
            />
          </div>
        )}

        <button
          type="button"
          className={styles.buy}
          onClick={() => onBuy(safeQuantity)}
          disabled={soldOut}
        >
          {soldOut
            ? 'Sin unidades disponibles'
            : 'Pagar con tarjeta de crédito'}
        </button>
      </div>
    </article>
  );
}
