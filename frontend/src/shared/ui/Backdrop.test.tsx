import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Backdrop } from './Backdrop';

describe('Backdrop', () => {
  it('renders the back layer (context + action) and the front layer', async () => {
    const onBack = jest.fn();
    render(
      <Backdrop
        title="Resumen"
        onBack={onBack}
        backLabel="Volver"
        backContent={<p>Contexto</p>}
        frontTitle="Detalle"
      >
        <p>Contenido</p>
      </Backdrop>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Resumen' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Contexto')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Detalle' })).toHaveTextContent(
      'Contenido',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});
