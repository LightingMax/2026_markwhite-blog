'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
function Notice() {
  const params = useSearchParams();
  const { locale } = useI18n();
  return params.has('translation') ? <p role="status" className="translation-notice">{locale === 'en' ? 'This article has no English edition yet. Browse the available articles below.' : '这篇文章暂时没有中文版，以下是当前可读的文章。'}</p> : null;
}
export function TranslationNotice() { return <Suspense><Notice /></Suspense>; }
