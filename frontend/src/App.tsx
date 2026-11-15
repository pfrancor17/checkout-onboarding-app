import styles from './App.module.css';
import { useAppSelector } from './app/hooks';
import type { CheckoutStep } from './features/checkout/checkoutSlice';
import { PaymentModal } from './features/payment/PaymentModal';
import { ProductPage } from './features/products/ProductPage';

type PlaceholderStep = Exclude<CheckoutStep, 'PRODUCT' | 'PAYMENT_FORM'>;

const STEP_TITLES: Record<PlaceholderStep, string> = {
  SUMMARY: 'Resumen',
  RESULT: 'Resultado del pago',
};

/**
 * App shell. The current step comes from the store (persisted), so a
 * refresh lands the customer back where they were.
 * Each step's screen is built in its own feature branch.
 */
function App() {
  const step = useAppSelector((state) => state.checkout.step);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>Checkout Store</span>
      </header>
      <main className={styles.main}>
        {step === 'PRODUCT' || step === 'PAYMENT_FORM' ? (
          // The payment form opens as a modal over the product page.
          <>
            <ProductPage />
            {step === 'PAYMENT_FORM' && <PaymentModal />}
          </>
        ) : (
          <section className={styles.placeholder} aria-live="polite">
            <h1>{STEP_TITLES[step]}</h1>
            <p className={styles.placeholderHint}>Pantalla en construcción.</p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
