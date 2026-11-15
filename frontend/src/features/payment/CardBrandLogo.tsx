import type { CardBrand } from './cardValidation';

interface Props {
  brand: CardBrand | null;
}

/** Simple brand marks drawn inline (no external images to load). */
export function CardBrandLogo({ brand }: Props) {
  if (brand === 'VISA') {
    return (
      <svg
        width="48"
        height="30"
        viewBox="0 0 48 30"
        role="img"
        aria-label="VISA"
      >
        <rect width="48" height="30" rx="4" fill="#1a1f71" />
        <text
          x="24"
          y="20"
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="Arial, sans-serif"
          fontSize="13"
          fontStyle="italic"
          fontWeight="700"
        >
          VISA
        </text>
      </svg>
    );
  }
  if (brand === 'MASTERCARD') {
    return (
      <svg
        width="48"
        height="30"
        viewBox="0 0 48 30"
        role="img"
        aria-label="MasterCard"
      >
        <rect width="48" height="30" rx="4" fill="#222222" />
        <circle cx="19" cy="15" r="9" fill="#eb001b" />
        <circle cx="29" cy="15" r="9" fill="#f79e1b" fillOpacity="0.9" />
      </svg>
    );
  }
  return null;
}
