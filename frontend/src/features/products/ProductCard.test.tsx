import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildProduct } from './product.fixture';
import { ProductCard } from './ProductCard';

const renderCard = (overrides = {}) => {
  const onBuy = jest.fn();
  const utils = render(
    <ProductCard product={buildProduct(overrides)} onBuy={onBuy} />,
  );
  return { onBuy, ...utils };
};

describe('ProductCard', () => {
  it('shows name, description, price and stock', () => {
    renderCard();

    expect(
      screen.getByRole('heading', { name: 'Smart Watch' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Water-resistant smart watch.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/359\.000/)).toBeInTheDocument();
    expect(screen.getByText('10 unidades disponibles')).toBeInTheDocument();
  });

  it('buys one unit by default', async () => {
    const { onBuy } = renderCard();

    await userEvent.click(
      screen.getByRole('button', { name: 'Pagar con tarjeta de crédito' }),
    );

    expect(onBuy).toHaveBeenCalledWith(1);
  });

  it('lets the customer choose up to 5 units', async () => {
    const { onBuy } = renderCard({ stock: 10 });
    const add = screen.getByRole('button', { name: 'Agregar una unidad' });

    for (let i = 0; i < 6; i++) await userEvent.click(add);

    expect(screen.getByRole('status')).toHaveTextContent('5');
    expect(add).toBeDisabled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar una unidad' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Pagar con tarjeta de crédito' }),
    );
    expect(onBuy).toHaveBeenCalledWith(4);
  });

  it('never offers more units than in stock', async () => {
    renderCard({ stock: 2 });
    const add = screen.getByRole('button', { name: 'Agregar una unidad' });

    await userEvent.click(add);
    await userEvent.click(add);

    expect(screen.getByRole('status')).toHaveTextContent('2');
    expect(add).toBeDisabled();
    expect(screen.getByText('¡Solo quedan 2 unidades!')).toBeInTheDocument();
  });

  it('adjusts the chosen quantity if the stock drops', async () => {
    const onBuy = jest.fn();
    const { rerender } = render(
      <ProductCard product={buildProduct({ stock: 5 })} onBuy={onBuy} />,
    );
    const add = screen.getByRole('button', { name: 'Agregar una unidad' });
    await userEvent.click(add);
    await userEvent.click(add);

    rerender(
      <ProductCard product={buildProduct({ stock: 1 })} onBuy={onBuy} />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Pagar con tarjeta de crédito' }),
    );

    expect(onBuy).toHaveBeenCalledWith(1);
    expect(screen.getByText('¡Solo queda 1 unidad!')).toBeInTheDocument();
    // A single unit needs no selector.
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('cannot be bought when sold out', () => {
    renderCard({ stock: 0, available: false });

    expect(screen.getByText('Agotado')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sin unidades disponibles' }),
    ).toBeDisabled();
  });

  describe('image', () => {
    it('shows the photo only once it has loaded', () => {
      const { container } = renderCard();
      const img = container.querySelector('img')!;

      expect(img.className).not.toContain('loaded');
      fireEvent.load(img);
      expect(img.className).toContain('loaded');
    });

    it('keeps the fallback if the photo fails', () => {
      const { container } = renderCard();

      fireEvent.error(container.querySelector('img')!);

      expect(container.querySelector('img')).toBeNull();
      expect(
        screen.getByRole('img', { name: 'Smart Watch' }),
      ).toHaveTextContent('S');
    });

    it('works without an image URL', () => {
      const { container } = renderCard({ imageUrl: null });

      expect(container.querySelector('img')).toBeNull();
      expect(
        screen.getByRole('img', { name: 'Smart Watch' }),
      ).toBeInTheDocument();
    });
  });
});
