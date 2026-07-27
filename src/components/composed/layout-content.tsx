"use client";

import React from "react";
import { TutorialBanner } from "@/components/composed/tutorial-banner";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TutorialBanner />
      {children}
    </>
  );
}
