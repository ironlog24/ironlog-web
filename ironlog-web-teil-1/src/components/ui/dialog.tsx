import * as D from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

/** Auf Mobile Bottom-Sheet, auf Desktop zentriertes Modal */
export function DialogContent({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md data-[state=open]:animate-[fadein_.2s_ease]" />
      <D.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[28px] border border-white/10 bg-ink-800/95 p-5 pb-8 shadow-2xl backdrop-blur-xl',
          'md:inset-auto md:left-1/2 md:top-1/2 md:w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px]',
          'data-[state=open]:animate-[sheetin_.32s_cubic-bezier(.2,.9,.3,1)]',
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15 md:hidden" />
        <div className="mb-5 flex items-center justify-between">
          <D.Title className="h-display text-3xl">{title}</D.Title>
          <D.Close className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Schließen">
            <X size={18} />
          </D.Close>
        </div>
        <D.Description className="sr-only">{title}</D.Description>
        {children}
      </D.Content>
    </D.Portal>
  )
}
