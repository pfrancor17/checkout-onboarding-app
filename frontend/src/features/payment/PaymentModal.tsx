import { useState, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { ApiError } from '../../shared/api/httpClient';
import { Modal } from '../../shared/ui/Modal';
import { TextField } from '../../shared/ui/TextField';
import {
  customerFieldChanged,
  deliveryFieldChanged,
  paymentFormClosed,
  paymentInfoSubmitted,
} from '../checkout/checkoutSlice';
import { selectProductById } from '../products/productsSlice';
import { CardBrandLogo } from './CardBrandLogo';
import { tokenizeCard, TOKENIZE_ERROR_MESSAGE } from './cardTokenizer';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  onlyDigits,
  validateCardHolder,
  validateCardNumber,
  validateCvc,
  validateExpiry,
} from './cardValidation';
import {
  type CustomerForm,
  type DeliveryForm,
  validateCustomer,
  validateDelivery,
} from './deliveryValidation';
import styles from './PaymentModal.module.css';
import { cardTokenized } from './paymentSlice';

const INSTALLMENT_OPTIONS = [1, 2, 3, 6, 12, 24, 36];

interface CardDraft {
  number: string;
  holder: string;
  expiry: string;
  cvc: string;
}

const EMPTY_CARD: CardDraft = { number: '', holder: '', expiry: '', cvc: '' };

const validateCardDraft = (card: CardDraft) => {
  const errors: Partial<Record<keyof CardDraft, string>> = {};
  const number = validateCardNumber(card.number);
  if (number) errors.number = number;
  const holder = validateCardHolder(card.holder);
  if (holder) errors.holder = holder;
  const expiry = validateExpiry(card.expiry);
  if (expiry) errors.expiry = expiry;
  const cvc = validateCvc(card.cvc);
  if (cvc) errors.cvc = cvc;
  return errors;
};

/** Order in which fields appear, to focus the first invalid one. */
const FIELD_ORDER = [
  'card-number',
  'card-holder',
  'card-expiry',
  'card-cvc',
  'fullName',
  'email',
  'phone',
  'addressLine1',
  'addressLine2',
  'city',
  'region',
  'postalCode',
];

/**
 * Step 2: credit card + delivery data.
 * Card fields live ONLY in this component's local state: they are never
 * dispatched to Redux nor saved. Delivery fields go to the store as the
 * customer types, so a refresh does not lose them.
 */
export function PaymentModal() {
  const dispatch = useAppDispatch();
  const checkout = useAppSelector((state) => state.checkout);
  const product = useAppSelector((state) =>
    selectProductById(state, checkout.productId),
  );

  const [card, setCard] = useState<CardDraft>(EMPTY_CARD);
  const [installments, setInstallments] = useState(checkout.installments);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const brand = detectCardBrand(card.number);
  const cardErrors = validateCardDraft(card);
  const customerErrors = validateCustomer(checkout.customer);
  const deliveryErrors = validateDelivery(checkout.delivery);
  const errorFor = (id: string, error?: string) =>
    showAllErrors || touched[id] ? error : undefined;
  const markTouched = (id: string) => () =>
    setTouched((current) => ({ ...current, [id]: true }));

  const updateCustomer = (field: keyof CustomerForm) => (value: string) =>
    dispatch(customerFieldChanged({ field, value }));
  const updateDelivery = (field: keyof DeliveryForm) => (value: string) =>
    dispatch(deliveryFieldChanged({ field, value }));

  const close = () => dispatch(paymentFormClosed());

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const invalid = {
      'card-number': cardErrors.number,
      'card-holder': cardErrors.holder,
      'card-expiry': cardErrors.expiry,
      'card-cvc': cardErrors.cvc,
      ...customerErrors,
      ...deliveryErrors,
    } as Record<string, string | undefined>;
    const firstInvalid = FIELD_ORDER.find((id) => invalid[id]);
    if (firstInvalid) {
      setShowAllErrors(true);
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const token = await tokenizeCard(card);
      dispatch(cardTokenized(token));
      dispatch(
        paymentInfoSubmitted({
          card: { brand: brand!, lastFour: onlyDigits(card.number).slice(-4) },
          installments,
        }),
      );
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : TOKENIZE_ERROR_MESSAGE,
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Datos de pago y entrega" onClose={close}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {product && (
          <p className={styles.product}>
            {product.name} × {checkout.quantity}
          </p>
        )}

        <fieldset className={styles.section}>
          <legend className={styles.legend}>Tarjeta de crédito</legend>
          <p className={styles.sandboxHint}>
            Modo de pruebas: usa <strong>4242 4242 4242 4242</strong> (aprobada)
            o <strong>4111 1111 1111 1111</strong> (rechazada), con cualquier
            fecha futura y CVC.
          </p>

          <TextField
            id="card-number"
            label="Número de la tarjeta"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            value={card.number}
            onChange={(e) =>
              setCard({ ...card, number: formatCardNumber(e.target.value) })
            }
            onBlur={markTouched('card-number')}
            error={errorFor('card-number', cardErrors.number)}
            adornment={<CardBrandLogo brand={brand} />}
          />
          <TextField
            id="card-holder"
            label="Nombre en la tarjeta"
            autoComplete="cc-name"
            value={card.holder}
            onChange={(e) => setCard({ ...card, holder: e.target.value })}
            onBlur={markTouched('card-holder')}
            error={errorFor('card-holder', cardErrors.holder)}
          />
          <div className={styles.row}>
            <TextField
              id="card-expiry"
              label="Vence"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/AA"
              value={card.expiry}
              onChange={(e) =>
                setCard({ ...card, expiry: formatExpiry(e.target.value) })
              }
              onBlur={markTouched('card-expiry')}
              error={errorFor('card-expiry', cardErrors.expiry)}
            />
            <TextField
              id="card-cvc"
              label="CVC"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={3}
              value={card.cvc}
              onChange={(e) =>
                setCard({ ...card, cvc: onlyDigits(e.target.value) })
              }
              onBlur={markTouched('card-cvc')}
              error={errorFor('card-cvc', cardErrors.cvc)}
            />
          </div>
          <div className={styles.selectField}>
            <label htmlFor="installments" className={styles.selectLabel}>
              Cuotas
            </label>
            <select
              id="installments"
              className={styles.select}
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
            >
              {INSTALLMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 1 ? '1 cuota' : `${option} cuotas`}
                </option>
              ))}
            </select>
          </div>
          <p className={styles.secureNote}>
            🔒 Por seguridad, no guardamos los datos de tu tarjeta.
          </p>
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>Datos de entrega</legend>
          <TextField
            id="fullName"
            label="Nombre completo"
            autoComplete="name"
            value={checkout.customer.fullName}
            onChange={(e) => updateCustomer('fullName')(e.target.value)}
            onBlur={markTouched('fullName')}
            error={errorFor('fullName', customerErrors.fullName)}
          />
          <TextField
            id="email"
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            value={checkout.customer.email}
            onChange={(e) => updateCustomer('email')(e.target.value)}
            onBlur={markTouched('email')}
            error={errorFor('email', customerErrors.email)}
          />
          <TextField
            id="phone"
            label="Celular"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="3001234567"
            value={checkout.customer.phone}
            onChange={(e) => updateCustomer('phone')(e.target.value)}
            onBlur={markTouched('phone')}
            error={errorFor('phone', customerErrors.phone)}
          />
          <TextField
            id="addressLine1"
            label="Dirección"
            autoComplete="address-line1"
            placeholder="Calle 10 # 20-30"
            value={checkout.delivery.addressLine1}
            onChange={(e) => updateDelivery('addressLine1')(e.target.value)}
            onBlur={markTouched('addressLine1')}
            error={errorFor('addressLine1', deliveryErrors.addressLine1)}
          />
          <TextField
            id="addressLine2"
            label="Apartamento, torre, oficina (opcional)"
            autoComplete="address-line2"
            value={checkout.delivery.addressLine2}
            onChange={(e) => updateDelivery('addressLine2')(e.target.value)}
            onBlur={markTouched('addressLine2')}
            error={errorFor('addressLine2', deliveryErrors.addressLine2)}
          />
          <div className={styles.row}>
            <TextField
              id="city"
              label="Ciudad"
              autoComplete="address-level2"
              value={checkout.delivery.city}
              onChange={(e) => updateDelivery('city')(e.target.value)}
              onBlur={markTouched('city')}
              error={errorFor('city', deliveryErrors.city)}
            />
            <TextField
              id="region"
              label="Departamento"
              autoComplete="address-level1"
              value={checkout.delivery.region}
              onChange={(e) => updateDelivery('region')(e.target.value)}
              onBlur={markTouched('region')}
              error={errorFor('region', deliveryErrors.region)}
            />
          </div>
          <TextField
            id="postalCode"
            label="Código postal (opcional)"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            value={checkout.delivery.postalCode}
            onChange={(e) => updateDelivery('postalCode')(e.target.value)}
            onBlur={markTouched('postalCode')}
            error={errorFor('postalCode', deliveryErrors.postalCode)}
          />
        </fieldset>

        {submitError && (
          <p className={styles.submitError} role="alert">
            {submitError}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Validando tarjeta…' : 'Continuar al resumen'}
        </button>
      </form>
    </Modal>
  );
}
