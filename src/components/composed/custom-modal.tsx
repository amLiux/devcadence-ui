"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useModal } from "@/providers/modal-provider";

type Props = {
  title?: string;
  subheading?: string;
  children: React.ReactNode;
};

export const CustomModal = ({ children, subheading, title }: Props) => {
  const { isOpen, setClose } = useModal();

  return (
    <Drawer open={isOpen} onClose={setClose} noBodyStyles>
      <DrawerContent className="overflow-hidden">
        <DrawerHeader>
          <DrawerTitle className="text-center">{title}</DrawerTitle>
          <DrawerDescription className="text-center flex flex-col items-center max-h-[82vh] gap-4 overflow-hidden">
            {subheading}
          </DrawerDescription>
        </DrawerHeader>
        {children}
        <DrawerFooter className="flex flex-col gap-4 bg-background border-t-[1px] border-t-muted">
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full" onClick={setClose}>
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
