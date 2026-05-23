import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole
} from "@floating-ui/react";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";

export interface FloatingActionMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

export function FloatingActionMenu({ label, items }: { label: string; items: FloatingActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    onOpenChange: setOpen,
    open,
    placement: "bottom-end",
    whileElementsMounted: autoUpdate
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([click, dismiss, role]);

  return (
    <>
      <Button
        ref={refs.setReference}
        variant="outline"
        className="h-8 w-8 p-0"
        aria-label={label}
        {...getReferenceProps({
          onClick: (event) => event.stopPropagation()
        })}
      >
        <MoreHorizontal className="size-4" />
      </Button>
      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div ref={refs.setFloating} className="floating-action-menu" style={floatingStyles} {...getFloatingProps()}>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="floating-action-menu-item"
                  disabled={item.disabled}
                  {...getItemProps({
                    onClick: (event) => {
                      event.stopPropagation();
                      if (!item.disabled) {
                        item.onSelect();
                        setOpen(false);
                      }
                    }
                  })}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  );
}
