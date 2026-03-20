'use client';

import { useEffect } from 'react';
import { useRouteLoaderStore } from '@/store/route-loader-store';
import { FullscreenLoader } from './FullscreenLoader';

export function GlobalRouteLoader() {
  const show = useRouteLoaderStore((s) => s.isVisible);

  // При первой гидрации убираем статический initial-loader,
  // который покрывает F5 до момента, когда React ожил.
  useEffect(() => {
    const el = document.getElementById('initial-page-loader');
    if (el) {
      el.remove();
    }
  }, []);

  return <FullscreenLoader show={show} />;
}

