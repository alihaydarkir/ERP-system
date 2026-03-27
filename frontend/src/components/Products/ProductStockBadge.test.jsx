import { render, screen } from '@testing-library/react';
import ProductStockBadge from './ProductStockBadge';

describe('ProductStockBadge', () => {
  it('Kritik stokta uyarı badge gösteriyor', () => {
    const { container } = render(<ProductStockBadge stock={3} lowStockThreshold={5} />);

    expect(screen.getByText('3 adet')).toBeInTheDocument();
    expect(screen.getByText('Düşük Stok')).toBeInTheDocument();
    expect(container.querySelector('span')).toHaveClass('text-yellow-700');
  });

  it('Normal stokta yeşil badge gösteriyor', () => {
    const { container } = render(<ProductStockBadge stock={25} lowStockThreshold={5} />);

    expect(screen.getByText('25 adet')).toBeInTheDocument();
    expect(screen.getByText('Stokta')).toBeInTheDocument();
    expect(container.querySelector('span')).toHaveClass('text-green-700');
  });

  it('Sıfır stokta farklı renk ve metin gösteriyor', () => {
    const { container } = render(<ProductStockBadge stock={0} lowStockThreshold={5} />);

    expect(screen.getByText('0 adet')).toBeInTheDocument();
    expect(screen.getByText('Tükendi')).toBeInTheDocument();
    expect(container.querySelector('span')).toHaveClass('text-red-700');
  });
});
