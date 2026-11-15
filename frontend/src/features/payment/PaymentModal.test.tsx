import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../shared/api/httpClient';
import { renderWithProviders } from '../../test/renderWithProviders';
import { initialCheckoutState } from '../checkout/checkoutSlice';
import { buildProduct } from '../products/product.fixture';
import { initialProductsState } from '../products/productsSlice';
import { tokenizeCard, TOKENIZE_ERROR_MESSAGE } from './cardTokenizer';
import { PaymentModal } from './PaymentModal';

jest.mock('./cardTokenizer', () => ({
  ...jest.requireActual('./cardTokenizer'),
  tokenizeCard: jest.fn(),
}));
const tokenizeCardMock = jest.mocked(tokenizeCard);

const renderModal = () =>
  renderWithProviders(<PaymentModal />, {
    preloadedState: {
      checkout: {
        ...initialCheckoutState,
        step: 'PAYMENT_FORM',
        productId: 'prod-1',
        quantity: 2,
      },
      products: {
        ...initialProductsState,
        status: 'succeeded',
        items: [buildProduct({ id: 'prod-1', name: 'Reloj inteligente' })],
      },
    },
  });

const type = (label: string | RegExp, value: string) =>
  userEvent.type(screen.getByLabelText(label), value);

const fillValidForm = async () => {
  await type('Número de la tarjeta', '4242424242424242');
  await type('Nombre en la tarjeta', 'Jane Doe');
  await type('Vence', '1229');
  await type('CVC', '123');
  await userEvent.selectOptions(screen.getByLabelText('Cuotas'), '3');
  await type('Nombre completo', 'Jane Doe');
  await type('Correo electrónico', 'jane@example.com');
  await type('Celular', '3001234567');
  await type('Dirección', 'Calle 10 # 20-30');
  await type('Ciudad', 'Medellín');
  await type('Departamento', 'Antioquia');
};

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Continuar al resumen' }));

describe('PaymentModal', () => {
  beforeEach(() => tokenizeCardMock.mockReset());

  it('shows which product is being bought', () => {
    renderModal();
    expect(screen.getByText('Reloj inteligente × 2')).toBeInTheDocument();
  });

  it('formats the card number and shows the brand logo', async () => {
    renderModal();

    await type('Número de la tarjeta', '5555555555554444');

    expect(screen.getByLabelText('Número de la tarjeta')).toHaveValue(
      '5555 5555 5555 4444',
    );
    expect(screen.getByRole('img', { name: 'MasterCard' })).toBeInTheDocument();
  });

  it('formats the expiry and keeps only digits in the CVC', async () => {
    renderModal();

    await type('Vence', '1229');
    await type('CVC', '1a2b3');

    expect(screen.getByLabelText('Vence')).toHaveValue('12/29');
    expect(screen.getByLabelText('CVC')).toHaveValue('123');
  });

  it('shows a field error only after leaving the field', async () => {
    renderModal();
    const cvc = screen.getByLabelText('CVC');

    await userEvent.type(cvc, '12');
    expect(screen.queryByText('El código debe tener 3 dígitos')).toBeNull();

    await userEvent.tab();
    expect(
      screen.getByText('El código debe tener 3 dígitos'),
    ).toBeInTheDocument();
    expect(cvc).toHaveAttribute('aria-invalid', 'true');
  });

  it('on an invalid submit shows every error and focuses the first one', async () => {
    renderModal();
    await type('Número de la tarjeta', '4242424242424242');

    await submit();

    expect(screen.getByLabelText('Nombre en la tarjeta')).toHaveFocus();
    expect(
      screen.getByText('Ingresa tu correo electrónico'),
    ).toBeInTheDocument();
    expect(tokenizeCardMock).not.toHaveBeenCalled();
  });

  it('saves the delivery data in the store while typing, but never the card', async () => {
    const { store } = renderModal();

    await type('Número de la tarjeta', '4242424242424242');
    await type('CVC', '123');
    await type('Correo electrónico', 'jane@example.com');
    await type('Código postal (opcional)', '050021');

    const state = JSON.stringify(store.getState());
    expect(store.getState().checkout.customer.email).toBe('jane@example.com');
    expect(store.getState().checkout.delivery.postalCode).toBe('050021');
    expect(state).not.toContain('4242424242424242');
    expect(state).not.toContain('4242 4242');
  });

  it('tokenizes the card and moves to the summary', async () => {
    tokenizeCardMock.mockResolvedValue('tok_test_1');
    const { store } = renderModal();
    await fillValidForm();

    await submit();

    expect(tokenizeCardMock).toHaveBeenCalledWith({
      number: '4242 4242 4242 4242',
      holder: 'Jane Doe',
      expiry: '12/29',
      cvc: '123',
    });
    expect(store.getState().payment.cardToken).toBe('tok_test_1');
    expect(store.getState().checkout).toMatchObject({
      step: 'SUMMARY',
      card: { brand: 'VISA', lastFour: '4242' },
      installments: 3,
    });
  });

  it('shows the gateway error and lets the customer try again', async () => {
    tokenizeCardMock.mockRejectedValueOnce(
      new ApiError(422, TOKENIZE_ERROR_MESSAGE),
    );
    const { store } = renderModal();
    await fillValidForm();

    await submit();

    expect(await screen.findByText(TOKENIZE_ERROR_MESSAGE)).toBeInTheDocument();
    expect(store.getState().checkout.step).toBe('PAYMENT_FORM');
    expect(
      screen.getByRole('button', { name: 'Continuar al resumen' }),
    ).toBeEnabled();
  });

  it('uses a generic message for unexpected errors', async () => {
    tokenizeCardMock.mockRejectedValueOnce(new Error('boom'));
    renderModal();
    await fillValidForm();

    await submit();

    expect(await screen.findByText(TOKENIZE_ERROR_MESSAGE)).toBeInTheDocument();
  });

  it('disables the button while the card is being validated', async () => {
    let resolve!: (token: string) => void;
    tokenizeCardMock.mockReturnValue(new Promise((r) => (resolve = r)));
    renderModal();
    await fillValidForm();

    await submit();

    expect(
      screen.getByRole('button', { name: 'Validando tarjeta…' }),
    ).toBeDisabled();
    resolve('tok');
  });

  it('closes back to the product page', async () => {
    const { store } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(store.getState().checkout.step).toBe('PRODUCT');
  });
});
