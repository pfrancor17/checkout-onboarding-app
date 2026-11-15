import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './TextField.module.css';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  /** Element shown inside the input on the right (e.g. a card logo). */
  adornment?: ReactNode;
}

/** Labelled input that announces its error to screen readers. */
export function TextField({
  id,
  label,
  error,
  hint,
  adornment,
  ...inputProps
}: Props) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          id={id}
          className={`${styles.input} ${error ? styles.invalid : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {adornment && <span className={styles.adornment}>{adornment}</span>}
      </div>
      {error ? (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-hint`} className={styles.hint}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
