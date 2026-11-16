interface Window {
  desktopStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key'> & {
    readonly length: number;
  };
}

interface Window { desktopPrint?: () => void; }
