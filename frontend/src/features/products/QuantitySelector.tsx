import styles from './QuantitySelector.module.css';

interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

/** − / + stepper. Big tap targets; never goes below 1 or above max. */
export function QuantitySelector({ value, max, onChange, label }: Props) {
  const decrease = () => onChange(Math.max(1, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div className={styles.selector} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        onClick={decrease}
        disabled={value <= 1}
        aria-label="Quitar una unidad"
      >
        −
      </button>
      <output className={styles.value} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={styles.button}
        onClick={increase}
        disabled={value >= max}
        aria-label="Agregar una unidad"
      >
        +
      </button>
    </div>
  );
}
