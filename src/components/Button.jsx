import { Link } from 'react-router-dom';

const Button = ({
  children,
  to,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
}) => {
  const baseStyles =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition';

  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-700',
    secondary: 'border border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white',
  };

  const styles = `${baseStyles} ${variants[variant]} ${className}`;

  // If "to" exists → use Link (for navigation)
  if (to) {
    return (
      <Link to={to} className={styles}>
        {children}
      </Link>
    );
  }

  // Otherwise → normal button
  return (
    <button type={type} onClick={onClick} className={styles}>
      {children}
    </button>
  );
};

export default Button;