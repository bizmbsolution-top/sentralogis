'use client';

import React, { useState, useEffect } from 'react';

export default function FormattedNumberInput({
  value,
  onChange,
  onBlur,
  className,
  placeholder,
  required
}: {
  value: number;
  onChange: (val: number) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [display, setDisplay] = useState(value ? value.toLocaleString('id-ID') : '');

  useEffect(() => {
    const rawNum = parseFloat(display.replace(/\./g, '').replace(/,/g, '.')) || 0;
    if (value !== rawNum) {
      setDisplay(value ? value.toLocaleString('id-ID') : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let clean = raw.replace(/\./g, '').replace(/,/g, '.');
    clean = clean.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    if (!clean || clean === '.') {
      setDisplay('');
      onChange(0);
      return;
    }
    const num = parseFloat(clean);
    if (parts.length === 2) {
      const intFormatted = (parseInt(parts[0] || '0', 10) || 0).toLocaleString('id-ID');
      setDisplay(`${intFormatted},${parts[1]}`);
    } else {
      setDisplay((parseInt(clean, 10) || 0).toLocaleString('id-ID'));
    }
    onChange(num);
  };

  return (
    <input
      type="text"
      required={required}
      placeholder={placeholder || '0'}
      value={display}
      onChange={handleChange}
      onBlur={onBlur}
      className={className}
    />
  );
}
