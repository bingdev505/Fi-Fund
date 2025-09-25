'use client';
import { useContext } from 'react';
import { FinancialContext } from '@/context/FinancialContext';

export const useFinancials = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancials must be used within a FinancialProvider');
  }
  return context;
};
