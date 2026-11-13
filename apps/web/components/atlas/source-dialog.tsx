'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export function SourceDialog({ onClose, children }: { onClose:()=>void; children:ReactNode }) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} className="atlas-modal" aria-labelledby="atlas-source-title" onClose={onClose} onCancel={onClose}>{children}</dialog>;
}
