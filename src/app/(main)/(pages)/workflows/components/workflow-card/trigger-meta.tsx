import { Clock, GitBranch, Hand, MessageCircle, Repeat, Webhook } from "lucide-react";
import type { WorkflowTriggerType } from "@/lib/types";

export const triggerIcons: Record<WorkflowTriggerType, React.ReactNode> = {
  webhook: <Webhook className="h-5 w-5" />,
  schedule: <Clock className="h-5 w-5" />,
  github: <GitBranch className="h-5 w-5" />,
  discord: <MessageCircle className="h-5 w-5" />,
  "sub-workflow": <Repeat className="h-5 w-5" />,
  manual: <Hand className="h-5 w-5" />,
};

export const triggerColors: Record<WorkflowTriggerType, string> = {
  webhook: "text-blue-500",
  schedule: "text-yellow-500",
  github: "text-foreground",
  discord: "text-indigo-500",
  "sub-workflow": "text-purple-500",
  manual: "text-muted-foreground",
};
