import { useEffect, useState } from 'react';

/** Renvoie la valeur une fois qu'elle n'a plus changé pendant `delay` ms (recherche). */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
