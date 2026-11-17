interface Window {
  desktopStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key'> & {
    readonly length: number;
  };
}

interface Window { desktopPrint?: () => void; desktopShare?: (text: string) => void; desktopPrintPreview?: (html: string) => Promise<void>; }
