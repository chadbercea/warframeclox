'use client';

import { createContext, useContext, ReactNode } from 'react';
import { OrokinToastContainer, useOrokinToast, ToastData } from '@/components/orokin-toast';

interface ToastContextValue {
  showToast: (toast: Omit<ToastData, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, showToast, dismissToast } = useOrokinToast();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <OrokinToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
