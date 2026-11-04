import { Card, CardContent } from "@/components/ui/card";
import { SubpageHeader } from "@/components/composed/subpage-header";
import { NotificationSettingsForm } from "./notification-settings-form";

export default function NotificationsSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <SubpageHeader
        backHref="/settings"
        backLabel="Back to settings"
        title="Notifications"
        description="Get a message when a scheduled or webhook run fails. Test runs from the editor are ignored."
      />

      <Card className="max-w-2xl">
        <CardContent>
          <NotificationSettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
