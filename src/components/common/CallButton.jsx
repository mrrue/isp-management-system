import React from 'react';
import { Phone } from 'lucide-react';

export default function CallButton({ phone, label = 'Call', size = 'sm', className = '' }) {
  if (!phone) return null;

  const cleanNumber = phone.replace(/[^0-9+]/g, '');

  const sizes = {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-2.5 py-1.5 text-xs font-medium gap-1.5',
    md: 'px-3.5 py-2 text-sm font-medium gap-2',
    icon: 'p-1.5 rounded-full'
  };

  return (
    <a
      href={`tel:${cleanNumber}`}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-center font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200 rounded-lg transition-colors shadow-xs ${sizes[size]} ${className}`}
      title={`Call ${phone}`}
    >
      <Phone className={size === 'icon' ? 'w-4 h-4 text-emerald-600' : 'w-3.5 h-3.5 text-emerald-600'} />
      {size !== 'icon' && <span>{label || phone}</span>}
    </a>
  );
}
