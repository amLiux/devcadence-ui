import { Card, CardContent } from "@/components/ui/card";
import { SubpageHeader } from "@/components/composed/subpage-header";
import { RunSettingsForm } from "./run-settings-form";

export default function RunsSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <SubpageHeader
        backHref="/settings"
        backLabel="Back to settings"
        title="Runs & retries"
        description="Default policy for failed runs. Test runs from the editor are ignored."
      />

      <Card className="max-w-2xl">
        <CardContent>
          <RunSettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
