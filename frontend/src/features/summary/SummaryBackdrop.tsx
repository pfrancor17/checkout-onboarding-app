import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { formatMoney } from '../../shared/format/currency';
import { Backdrop } from '../../shared/ui/Backdrop';
import { paymentFormClosed, summaryDismissed } from '../checkout/checkoutSlice';
import { CardBrandLogo } from '../payment/CardBrandLogo';
import {
  fetchProducts,
  selectProductById,
  selectProductsStatus,
} from '../products/productsSlice';
import { payTransaction } from '../transaction/transactionSlice';
import {
  fetchAcceptanceTokens,
  fetchQuote,
  personalDataAcceptanceChanged,
  termsAcceptanceChanged,
} from './summarySlice';
import styles from './SummaryBackdrop.module.css';

const CONFLICT = 409;

/**
 * Step 3: payment summary (product amount + base fee + delivery fee) in a
 * backdrop, with the legal acceptances and the pay button.
 */
export function SummaryBackdrop() {
  const dispatch = useAppDispatch();
  const checkout = useAppSelector((state) => state.checkout);
  const cardToken = useAppSelector((state) => state.payment.cardToken);
  const summary = useAppSelector((state) => state.summary);
  const transaction = useAppSelector((state) => state.transaction);
  const product = useAppSelector((state) =>
    selectProductById(state, checkout.productId),
  );
  const productsStatus = useAppSelector(selectProductsStatus);

  // After a refresh the product list is not loaded yet: load it for the name.
  useEffect(() => {
    if (productsStatus === 'idle') void dispatch(fetchProducts());
  }, [dispatch, productsStatus]);

  const { productId, quantity } = checkout;
  useEffect(() => {
    if (!cardToken || !productId) return;
    void dispatch(fetchQuote({ productId, quantity }));
    void dispatch(fetchAcceptanceTokens());
  }, [dispatch, cardToken, productId, quantity]);

  const editData = () => dispatch(summaryDismissed());
  const backToProducts = () => {
    dispatch(summaryDismissed());
    dispatch(paymentFormClosed());
  };

  const quote = summary.quote.data;
  const acceptance = summary.acceptance.data;
  const paying = transaction.status === 'loading';
  const canPay =
    Boolean(quote && acceptance) &&
    summary.termsAccepted &&
    summary.personalDataAccepted &&
    !paying;

  const backContent = (
    <>
      <p className={styles.backProduct}>
        {product?.name ?? 'Tu producto'} × {quantity}
      </p>
      {quote && (
        <p className={styles.backTotal}>
          {formatMoney(quote.totalAmountInCents, quote.currency)}
        </p>
      )}
    </>
  );

  // The card token lives in memory only: after a refresh it is gone.
  if (!cardToken) {
    return (
      <Backdrop
        title="Resumen de tu compra"
        onBack={editData}
        backLabel="Volver a los datos de pago"
        backContent={backContent}
        frontTitle="Vuelve a ingresar tu tarjeta"
      >
        <p className={styles.notice}>
          Por seguridad no guardamos los datos de tu tarjeta. Ingrésalos de
          nuevo para continuar; tus datos de entrega se conservan.
        </p>
        <button type="button" className={styles.primary} onClick={editData}>
          Ingresar tarjeta
        </button>
      </Backdrop>
    );
  }

  return (
    <Backdrop
      title="Resumen de tu compra"
      onBack={editData}
      backLabel="Volver a los datos de pago"
      backContent={backContent}
      frontTitle="Detalle del pago"
    >
      {summary.quote.status === 'loading' && (
        <p className={styles.muted} aria-busy="true">
          Calculando el total…
        </p>
      )}
      {summary.quote.status === 'failed' && (
        <div className={styles.error} role="alert">
          <p>{summary.quote.error}</p>
          <button
            type="button"
            className={styles.secondary}
            onClick={() =>
              productId && void dispatch(fetchQuote({ productId, quantity }))
            }
          >
            Reintentar
          </button>
        </div>
      )}

      {quote && (
        <dl className={styles.breakdown}>
          <div className={styles.line}>
            <dt>
              Producto ({quote.quantity} ×{' '}
              {formatMoney(quote.unitPriceInCents, quote.currency)})
            </dt>
            <dd>{formatMoney(quote.productAmountInCents, quote.currency)}</dd>
          </div>
          <div className={styles.line}>
            <dt>Tarifa base</dt>
            <dd>{formatMoney(quote.baseFeeInCents, quote.currency)}</dd>
          </div>
          <div className={styles.line}>
            <dt>Envío</dt>
            <dd>{formatMoney(quote.deliveryFeeInCents, quote.currency)}</dd>
          </div>
          <div className={`${styles.line} ${styles.total}`}>
            <dt>Total</dt>
            <dd>{formatMoney(quote.totalAmountInCents, quote.currency)}</dd>
          </div>
        </dl>
      )}

      <div className={styles.details}>
        {checkout.card && (
          <div className={styles.detail}>
            <span className={styles.detailLabel}>Pago</span>
            <span className={styles.card}>
              <CardBrandLogo brand={checkout.card.brand} />
              •••• {checkout.card.lastFour} ·{' '}
              {checkout.installments === 1
                ? '1 cuota'
                : `${checkout.installments} cuotas`}
            </span>
          </div>
        )}
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Entrega</span>
          <span>
            {checkout.customer.fullName}
            <br />
            {checkout.delivery.addressLine1}
            {checkout.delivery.addressLine2 &&
              `, ${checkout.delivery.addressLine2}`}
            <br />
            {checkout.delivery.city}, {checkout.delivery.region}
          </span>
        </div>
        <button type="button" className={styles.link} onClick={editData}>
          Editar datos
        </button>
      </div>

      {summary.acceptance.status === 'failed' && (
        <div className={styles.error} role="alert">
          <p>{summary.acceptance.error}</p>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => void dispatch(fetchAcceptanceTokens())}
          >
            Reintentar
          </button>
        </div>
      )}
      {acceptance && (
        <div className={styles.acceptances}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={summary.termsAccepted}
              onChange={(e) =>
                dispatch(termsAcceptanceChanged(e.target.checked))
              }
            />
            <span>
              Acepto los{' '}
              <a href={acceptance.termsUrl} target="_blank" rel="noreferrer">
                términos y condiciones
              </a>
            </span>
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={summary.personalDataAccepted}
              onChange={(e) =>
                dispatch(personalDataAcceptanceChanged(e.target.checked))
              }
            />
            <span>
              Autorizo el{' '}
              <a
                href={acceptance.personalDataPolicyUrl}
                target="_blank"
                rel="noreferrer"
              >
                tratamiento de mis datos personales
              </a>
            </span>
          </label>
        </div>
      )}

      {transaction.status === 'failed' && (
        <div className={styles.error} role="alert">
          <p>{transaction.error}</p>
          {transaction.errorStatus === CONFLICT && (
            <button
              type="button"
              className={styles.secondary}
              onClick={backToProducts}
            >
              Volver a los productos
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        className={styles.primary}
        disabled={!canPay}
        onClick={() => void dispatch(payTransaction())}
      >
        {paying
          ? 'Procesando pago…'
          : quote
            ? `Pagar ${formatMoney(quote.totalAmountInCents, quote.currency)}`
            : 'Pagar'}
      </button>
      {paying && (
        <p className={styles.muted} aria-live="polite">
          No cierres ni recargues la página: estamos confirmando tu pago.
        </p>
      )}
    </Backdrop>
  );
}
