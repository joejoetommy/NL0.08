// src/components/MaxWidthWrapper.tsx
import { ReactNode } from 'react';

interface MaxWidthWrapperProps {
  children: ReactNode;
}

export default function MaxWidthWrapper({ children }: MaxWidthWrapperProps) {
  return (
    <div className="mx-auto w-full max-w-screen-lg md:px-2.5">{children}</div>
  );
}