import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  it('is an accessible dialog that receives the focus', () => {
    render(
      <Modal title="Pago" onClose={jest.fn()}>
        <p>Contenido</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Pago' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('closes with the close button and with Escape', async () => {
    const onClose = jest.fn();
    render(
      <Modal title="Pago" onClose={onClose}>
        <p>x</p>
      </Modal>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('locks the page scroll while open and restores it after', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = render(
      <Modal title="Pago" onClose={jest.fn()}>
        <p>x</p>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('does not steal the focus from an input when it re-renders', async () => {
    const { rerender } = render(
      <Modal title="Pago" onClose={() => undefined}>
        <input aria-label="Campo" />
      </Modal>,
    );
    const input = screen.getByLabelText('Campo');
    await userEvent.type(input, 'ab');

    // A new onClose on every render (the usual inline arrow function).
    rerender(
      <Modal title="Pago" onClose={() => undefined}>
        <input aria-label="Campo" />
      </Modal>,
    );

    expect(input).toHaveFocus();
    expect(input).toHaveValue('ab');
  });

  it('calls the latest onClose', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = render(
      <Modal title="Pago" onClose={first}>
        <p>x</p>
      </Modal>,
    );
    rerender(
      <Modal title="Pago" onClose={second}>
        <p>x</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
