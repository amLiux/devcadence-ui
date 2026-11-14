"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useGoogleConnect, GOOGLE_SERVICE_OPTIONS } from "./use-google-connect";

export function GoogleConnectFields({
  connectionId,
  connectionName,
  connectedEmail,
  initialServices,
}: {
  connectionId?: string;
  connectionName: string;
  connectedEmail?: string;
  /** Space separated list stored on the connection, e.g. "gmail drive". */
  initialServices?: string;
}) {
  const { services, toggleService, canConnect, authorizeUrl, disconnect, disconnecting } =
    useGoogleConnect({
      connectionId,
      connectionName,
      returnTo: "/connections",
      initialServices: (initialServices ?? "").split(" ").filter(Boolean),
    });

  const actionLabel = connectedEmail ? "Reconnect Google account" : "Connect Google account";

  return (
    <div className="space-y-4 px-4 pb-4">
      {connectedEmail && (
        <div className="rounded-lg bg-muted/50 p-3 text-xs">
          Connected as <span className="font-medium">{connectedEmail}</span>. Reconnecting replaces the
          stored tokens.
        </div>
      )}

      <div className="space-y-2">
        <Label>Services this connection can use</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GOOGLE_SERVICE_OPTIONS.map((service) => (
            <label
              key={service.id}
              htmlFor={`google-service-${service.id}`}
              className="flex items-start gap-2 rounded-md border border-border px-2.5 py-2 cursor-pointer hover:border-primary/50"
            >
              <input
                id={`google-service-${service.id}`}
                type="checkbox"
                className="mt-0.5"
                checked={services.includes(service.id)}
                onChange={() => toggleService(service.id)}
              />
              <span>
                <span className="block text-sm">{service.label}</span>
                <span className="block text-[11px] text-muted-foreground">{service.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Only the selected services are requested. DevCadence stores the tokens encrypted on the
          server and uses them from workflow nodes — this authorizes API access, it is not a
          DevCadence sign-in.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        {connectedEmail && (
          <Button variant="ghost" onClick={disconnect} disabled={disconnecting}>
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </Button>
        )}
        {canConnect ? (
          <Button render={<a href={authorizeUrl} />}>{actionLabel}</Button>
        ) : (
          <Button disabled>{actionLabel}</Button>
        )}
      </div>
    </div>
  );
}
