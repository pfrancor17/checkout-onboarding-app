import type { ReactNode } from 'react';
import styles from './Backdrop.module.css';

interface Props {
  /** Title of the back layer (the screen title). */
  title: string;
  /** Navigation action shown in the back layer. */
  onBack: () => void;
  backLabel: string;
  /** Context shown on the back layer, behind the front layer. */
  backContent: ReactNode;
  /** Heading of the front layer. */
  frontTitle: string;
  children: ReactNode;
}

/**
 * Material Design "backdrop": a back layer with context and actions, and
 * a front layer that slides up over it with the main content.
 * https://m2.material.io/components/backdrop
 */
export function Backdrop({
  title,
  onBack,
  backLabel,
  backContent,
  frontTitle,
  children,
}: Props) {
  return (
    <div className={styles.backdrop}>
      <section className={styles.backLayer} aria-label={title}>
        <div className={styles.backHeader}>
          <button
            type="button"
            className={styles.backButton}
            onClick={onBack}
            aria-label={backLabel}
          >
            ←
          </button>
          <h1 className={styles.title}>{title}</h1>
        </div>
        <div className={styles.backContent}>{backContent}</div>
      </section>

      <section className={styles.frontLayer} aria-labelledby="backdrop-front">
        <h2 id="backdrop-front" className={styles.frontTitle}>
          {frontTitle}
        </h2>
        <div className={styles.frontContent}>{children}</div>
      </section>
    </div>
  );
}
