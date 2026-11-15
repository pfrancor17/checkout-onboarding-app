import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { formatMoney } from '../../shared/format/currency';
import { asSentence } from '../../shared/format/text';
import { checkoutFinished, paymentRetried } from '../checkout/checkoutSlice';
import { CardBrandLogo } from '../payment/CardBrandLogo';
import styles from './ResultPage.module.css';
import { fetchTransaction } from './transactionSlice';
import type { Transaction, TransactionStatus } from './types';

export const POLL_INTERVAL_MS = 3000;
/** ~2 minutes of polling, then the customer can refresh manually. */
export const MAX_POLLS = 40;
export const REDIRECT_SECONDS = 10;

type Tone = 'success' | 'danger' | 'pending';

const COPY: Record<
  TransactionStatus,
  { tone: Tone; title: string; message: (t: Transaction) => string }
> = {
  APPROVED: {
    tone: 'success',
    title: '¡Pago aprobado!',
    message: (t) =>
      `Tu pedido de ${t.product.name} está confirmado. Lo enviaremos a ${t.delivery.addressLine1}, ${t.delivery.city}.`,
  },
  DECLINED: {
    tone: 'danger',
    title: 'Pago rechazado',
    message: (t) =>
      `${asSentence(t.statusMessage ?? 'Tu banco rechazó el pago')} No se hizo ningún cobro.`,
  },
  VOIDED: {
    tone: 'danger',
    title: 'Pago anulado',
    message: () => 'El pago fue anulado. No se hizo ningún cobro.',
  },
  ERROR: {
    tone: 'danger',
    title: 'No pudimos completar el pago',
    message: (t) =>
      asSentence(t.statusMessage ?? 'Ocurrió un error con el pago'),
  },
  PENDING: {
    tone: 'pending',
    title: 'Estamos confirmando tu pago…',
    message: () =>
      'Puede tardar unos segundos. Si recargas la página, retomamos donde ibas.',
  },
};

const ICONS: Record<Tone, string> = { success: '✓', danger: '✕', pending: '' };

/**
 * Step 4: the result of the payment. Recovers the transaction after a
 * refresh (from the persisted id), polls while it is PENDING, and goes
 * back to the product page (step 5) where the stock is fetched again.
 */
export function ResultPage() {
  const dispatch = useAppDispatch();
  const transactionId = useAppSelector((state) => state.checkout.transactionId);
  const { current, status, error, errorStatus } = useAppSelector(
    (state) => state.transaction,
  );
  const [polls, setPolls] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  const backToStore = () => dispatch(checkoutFinished());

  // After a refresh the result is not in memory: recover it by id.
  useEffect(() => {
    if (!current && transactionId && status === 'idle') {
      void dispatch(fetchTransaction(transactionId));
    }
  }, [dispatch, current, transactionId, status]);

  // Ask again while the gateway is still processing the payment.
  useEffect(() => {
    if (current?.status !== 'PENDING' || polls >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      void dispatch(fetchTransaction(current.id));
      setPolls((count) => count + 1);
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [dispatch, current, polls]);

  // Approved: back to the store (with the updated stock) automatically.
  const approved = current?.status === 'APPROVED';
  useEffect(() => {
    if (!approved) return;
    if (secondsLeft === 0) {
      dispatch(checkoutFinished());
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [dispatch, approved, secondsLeft]);

  if (!current) {
    if (status === 'failed' || !transactionId) {
      const notFound = errorStatus === 404 || !transactionId;
      return (
        <section className={styles.card} aria-live="polite">
          <h1 className={styles.title}>
            {notFound
              ? 'No encontramos tu transacción'
              : 'No pudimos consultar tu pago'}
          </h1>
          {!notFound && <p className={styles.message}>{error}</p>}
          <div className={styles.actions}>
            {!notFound && (
              <button
                type="button"
                className={styles.primary}
                onClick={() =>
                  void dispatch(fetchTransaction(transactionId as string))
                }
              >
                Reintentar
              </button>
            )}
            <button
              type="button"
              className={styles.secondary}
              onClick={backToStore}
            >
              Volver a la tienda
            </button>
          </div>
        </section>
      );
    }
    return (
      <section className={styles.card} aria-busy="true">
        <span
          className={`${styles.icon} ${styles.pending}`}
          aria-hidden="true"
        />
        <h1 className={styles.title}>Consultando el estado de tu pago…</h1>
      </section>
    );
  }

  const copy = COPY[current.status];
  const failed = copy.tone === 'danger';
  const stillPending = current.status === 'PENDING';
  const gaveUpPolling = stillPending && polls >= MAX_POLLS;

  return (
    <section className={styles.card} aria-live="polite">
      <span
        className={`${styles.icon} ${styles[copy.tone]}`}
        aria-hidden="true"
      >
        {ICONS[copy.tone]}
      </span>
      <h1 className={styles.title}>{copy.title}</h1>
      <p className={styles.message}>{copy.message(current)}</p>

      <dl className={styles.details}>
        <div className={styles.row}>
          <dt>Producto</dt>
          <dd>
            {current.product.name} × {current.amounts.quantity}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Total</dt>
          <dd>
            {formatMoney(
              current.amounts.totalAmountInCents,
              current.amounts.currency,
            )}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Tarjeta</dt>
          <dd className={styles.cardValue}>
            <CardBrandLogo brand={current.card.brand} />
            •••• {current.card.lastFour}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Referencia</dt>
          <dd className={styles.reference}>{current.reference}</dd>
        </div>
      </dl>

      {gaveUpPolling && (
        <p className={styles.message}>
          Tu pago sigue en proceso. Guarda tu referencia y vuelve a consultarlo
          en unos minutos.
        </p>
      )}

      <div className={styles.actions}>
        {failed && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => dispatch(paymentRetried())}
          >
            Intentar con otra tarjeta
          </button>
        )}
        {gaveUpPolling && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              setPolls(0);
              void dispatch(fetchTransaction(current.id));
            }}
          >
            Consultar de nuevo
          </button>
        )}
        {!stillPending && (
          <button
            type="button"
            className={approved ? styles.primary : styles.secondary}
            onClick={backToStore}
          >
            {approved ? 'Volver a la tienda ahora' : 'Volver a la tienda'}
          </button>
        )}
      </div>

      {approved && (
        <p className={styles.countdown}>
          Volverás a la tienda en {secondsLeft} s.
        </p>
      )}
    </section>
  );
}
