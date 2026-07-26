"use client";

import React from "react";
import { WorkflowButton } from "./components/workflow-button";
import { Workflows } from "./components/index";

export default function WorkflowsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">Build and manage your automation workflows.</p>
        </div>
        <WorkflowButton />
      </div>
      <Workflows />
    </div>
  );
}
