"use client";

import React from "react";
import { WorkflowButton } from "./components/workflow-button";
import { Workflows } from "./components/index";

export default function WorkflowsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-[10] bg-background/50 backdrop-blur-lg border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <WorkflowButton />
      </div>
      <div className="flex-1 overflow-auto p-6">
        <Workflows />
      </div>
    </div>
  );
}
