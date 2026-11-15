import Image from "next/image";
import {
  ArrowRightLeft,
  Database,
  GitBranch,
  GitFork,
  LogIn,
  LogOut,
  Mail,
  Settings,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

export const iconMap: Record<string, React.ReactNode> = {
  Trigger: <Zap className="h-3 w-3 text-yellow-500" />,
  Action: <Settings className="h-3 w-3 text-blue-500" />,
  GitHub: <GitBranch className="h-3 w-3 text-foreground" />,
  Conditional: <GitFork className="h-3 w-3 text-orange-500" />,
  PostgreSQL: <Database className="h-3 w-3 text-blue-600" />,
  AI: <Sparkles className="h-3 w-3 text-purple-500" />,
  "Call Workflow": <ArrowRightLeft className="h-3 w-3 text-emerald-500" />,
  Input: <LogIn className="h-3 w-3 text-cyan-500" />,
  Return: <LogOut className="h-3 w-3 text-amber-500" />,
  SMTP: <Mail className="h-3 w-3 text-red-500" />,
  Slack: <Image src="/slack.png" alt="Slack" width={12} height={12} className="object-contain" />,
  Security: <Shield className="h-3 w-3 text-emerald-500" />,
  "Scan Dependencies": <Shield className="h-3 w-3 text-emerald-500" />,
  Discord: <Image src="/discord.png" alt="Discord" width={12} height={12} className="object-contain" />,
  "Send Discord Message": (
    <Image src="/discord.png" alt="Discord" width={12} height={12} className="object-contain" />
  ),
  "Read Discord Messages": (
    <Image src="/discord.png" alt="Discord" width={12} height={12} className="object-contain" />
  ),
  "Send Direct Message": (
    <Image src="/discord.png" alt="Discord" width={12} height={12} className="object-contain" />
  ),
  "Watch Emails": (
    <Image src="/google.png" alt="Google" width={12} height={12} className="object-contain" />
  ),
  "Send Gmail": (
    <Image src="/google.png" alt="Google" width={12} height={12} className="object-contain" />
  ),
  "Search Emails": (
    <Image src="/google.png" alt="Google" width={12} height={12} className="object-contain" />
  ),
  "Reply to Email": (
    <Image src="/google.png" alt="Google" width={12} height={12} className="object-contain" />
  ),
};
