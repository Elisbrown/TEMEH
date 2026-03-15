
"use client"
import { useLanguage } from '@/context/language-context';

export const useTranslation = () => {
  const { t } = useLanguage();
  return { t };
};
