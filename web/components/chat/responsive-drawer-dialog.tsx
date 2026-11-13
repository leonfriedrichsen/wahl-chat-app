'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsDesktop } from '@/lib/hooks/use-is-desktop';

type ResponsiveDefaultProps = {
  className?: string;
  children?: React.ReactNode;
};

type AsChildProps = {
  asChild?: boolean;
};

type ResponsiveDialogProps = Pick<ResponsiveDefaultProps, 'children'> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
};

export function ResponsiveDialog({
  children,
  open,
  onOpenChange,
  defaultOpen,
}: ResponsiveDialogProps) {
  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
        <Dialog
          open={open}
          onOpenChange={onOpenChange}
          defaultOpen={defaultOpen}
        >
          {children}
        </Dialog>
      </Drawer>
    </>
  );
}

export function ResponsiveDialogTrigger({
  children,
  className,
  asChild,
}: ResponsiveDefaultProps & AsChildProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <DialogTrigger asChild={asChild} className={className}>
      {children}
    </DialogTrigger>
  ) : (
    <DrawerTrigger asChild={asChild} className={className}>
      {children}
    </DrawerTrigger>
  );
}

export function ResponsiveDialogContent({
  children,
  className,
  asChild,
  container,
}: ResponsiveDefaultProps &
  AsChildProps & {
    /** Where the phone drawer is portaled. A drawer opened over another
     * modal belongs inside that modal's content: the modal's scroll lock
     * cancels every touch outside it, so a drawer on `body` cannot scroll. */
    container?: HTMLElement | null;
  }) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <DialogContent asChild={asChild} className={className}>
      {children}
    </DialogContent>
  ) : (
    <DrawerContent
      asChild={asChild}
      className={className}
      container={container}
    >
      {children}
    </DrawerContent>
  );
}

/**
 * Dialog content whose body scrolls on short screens. On desktop the scroll
 * area runs to the dialog's edge, below a band that holds the close button,
 * so the button never sits on top of the scrollbar or the text. The phone
 * drawer has no close button; its inner box scrolls so the handle stays put
 * and a drag still closes it.
 */
export function ResponsiveDialogScrollContent({
  children,
}: Pick<ResponsiveDefaultProps, 'children'>) {
  return (
    <ResponsiveDialogContent className="flex max-h-[95dvh] flex-col md:gap-0 md:p-0 md:pt-12">
      <div className="min-h-0 overflow-y-auto overscroll-contain md:px-6 md:pb-6">
        {children}
      </div>
    </ResponsiveDialogContent>
  );
}

export function ResponsiveDialogClose({
  children,
  className,
  asChild,
}: ResponsiveDefaultProps & AsChildProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <DialogClose asChild={asChild} className={className}>
      {children}
    </DialogClose>
  ) : (
    <DrawerClose asChild={asChild} className={className}>
      {children}
    </DrawerClose>
  );
}

export function ResponsiveDialogHeader({
  children,
  className,
}: ResponsiveDefaultProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <DialogHeader className={className}>{children}</DialogHeader>
  ) : (
    <DrawerHeader className={className}>{children}</DrawerHeader>
  );
}

export function ResponsiveDialogTitle({
  children,
  className,
}: ResponsiveDefaultProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <DialogTitle className={className}>{children}</DialogTitle>
  ) : (
    <DrawerTitle className={className}>{children}</DrawerTitle>
  );
}

export function ResponsiveDialogDescription({
  children,
  className,
}: ResponsiveDefaultProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <DialogDescription className={className}>{children}</DialogDescription>
  ) : (
    <DrawerDescription className={className}>{children}</DrawerDescription>
  );
}

export function ResponsiveDialogFooter({
  children,
  className,
}: ResponsiveDefaultProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <DialogFooter className={className}>{children}</DialogFooter>
  ) : (
    <DrawerFooter className={className}>{children}</DrawerFooter>
  );
}
