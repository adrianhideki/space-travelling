import Link from 'next/link';
import styles from './header.module.scss';

export default function Header(): React.ReactElement {
  // TODO
  return (
    <div className={styles.header}>
      <Link href="/">
        <a>
          <img src="/logo.svg" alt="logo" />
        </a>
      </Link>
    </div>
  );
}
