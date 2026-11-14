import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { checkoutStarted } from '../checkout/checkoutSlice';
import { ProductCard } from './ProductCard';
import styles from './ProductPage.module.css';
import {
  fetchProducts,
  selectProducts,
  selectProductsError,
  selectProductsStatus,
} from './productsSlice';

/**
 * Step 1 (and 5): the store's products with their current stock.
 * Products are fetched every time the page is shown, so after a purchase
 * the customer sees the updated units.
 */
export function ProductPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const status = useAppSelector(selectProductsStatus);
  const error = useAppSelector(selectProductsError);

  useEffect(() => {
    void dispatch(fetchProducts());
  }, [dispatch]);

  const loadingFirstTime = status === 'loading' && products.length === 0;

  return (
    <section className={styles.page} aria-labelledby="products-title">
      <h1 id="products-title" className={styles.title}>
        Nuestros productos
      </h1>

      {loadingFirstTime && (
        <div
          className={styles.grid}
          aria-busy="true"
          aria-label="Cargando productos"
        >
          {[0, 1].map((key) => (
            <div key={key} className={styles.skeleton} />
          ))}
        </div>
      )}

      {status === 'failed' && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => void dispatch(fetchProducts())}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'succeeded' && products.length === 0 && (
        <p className={styles.empty}>No hay productos disponibles por ahora.</p>
      )}

      {products.length > 0 && (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onBuy={(quantity) =>
                dispatch(checkoutStarted({ productId: product.id, quantity }))
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
