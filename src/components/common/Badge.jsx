import React from 'react';

export default function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-sky-50 text-sky-700 border-sky-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5'
  };

  // Map status names to colors automatically if standard status strings passed
  let resolvedVariant = variant;
  const lower = String(children || '').toLowerCase();
  if (['active', 'connected', 'resolved', 'completed', 'present'].includes(lower)) {
    resolvedVariant = 'success';
  } else if (['suspended', 'in progress', 'waiting', 'waiting for parts', 'late', 'medium'].includes(lower)) {
    resolvedVariant = 'warning';
  } else if (['disconnected', 'cancelled', 'urgent', 'high', 'absent', 'voided'].includes(lower)) {
    resolvedVariant = 'danger';
  } else if (['new', 'assigned', 'accepted', 'low'].includes(lower)) {
    resolvedVariant = 'primary';
  } else if (['pending', 'half day', 'relocation'].includes(lower)) {
    resolvedVariant = 'purple';
  }

  return (
    <span className={`inline-flex items-center rounded-full border ${variants[resolvedVariant] || variants.default} ${sizes[size] || sizes.md} ${className}`}>
      {children}
    </span>
  );
}
