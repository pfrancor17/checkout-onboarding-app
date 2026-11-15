import styles from './App.module.css';
import { useAppSelector } from './app/hooks';
import { PaymentModal } from './features/payment/PaymentModal';
import { ProductPage } from './features/products/ProductPage';
import { SummaryBackdrop } from './features/summary/SummaryBackdrop';
import { ResultPage } from './features/transaction/ResultPage';

/**
 * App shell. The 5-step flow is driven by the (persisted) checkout step:
 * 1. Product → 2. Card/Delivery (modal) → 3. Summary → 4. Result → 5. Product
 * A refresh lands the customer back on the step they were on.
 */
function App() {
  const step = useAppSelector((state) => state.checkout.step);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>Checkout Store</span>
      </header>
      <main className={styles.main}>
        {(step === 'PRODUCT' || step === 'PAYMENT_FORM') && (
          <>
            {/* While the payment modal is open, the page behind it is
                inert: it cannot get focus, be clicked or be read by
                screen readers, so keyboard users stay inside the dialog. */}
            <div
              className={styles.page}
              inert={step === 'PAYMENT_FORM'}
              data-testid="product-page"
            >
              <ProductPage />
            </div>
            {step === 'PAYMENT_FORM' && <PaymentModal />}
          </>
        )}
        {step === 'SUMMARY' && <SummaryBackdrop />}
        {step === 'RESULT' && <ResultPage />}
      </main>
    </div>
  );
}

export default App;
