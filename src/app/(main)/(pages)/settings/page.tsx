import { Bell } from "lucide-react";
import { SectionCard } from "@/components/composed/section-card";

const sections = [
  {
    href: "/settings/notifications",
    title: "Notifications",
    description: "Get a message when a scheduled or webhook run fails.",
    icon: <Bell className="h-5 w-5 text-primary" />,
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your dashboard.</p>
      </div>

      <div className="grid gap-3">
        {sections.map((section) => (
          <SectionCard key={section.href} {...section} />
        ))}
      </div>
    </div>
  );
}
