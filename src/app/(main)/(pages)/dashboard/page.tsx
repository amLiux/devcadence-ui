"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plug } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { connectionIcons } from "@/lib/constants";
import type { Connection, ConnectionType } from "@/lib/types";

export default function DashboardPage() {
  const { request, loading } = useApi();
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    request<Connection[]>({ endpoint: "/api/connections" }).then((data) => {
      if (data) setConnections(data);
    });
  }, [request]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your connections at a glance.</p>
        </div>
        <a href="/connections">
          <Button variant="outline" size="sm">
            <Plug className="mr-2 h-4 w-4" />
            Manage Connections
          </Button>
        </a>
      </div>

      {connections.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No connections yet. Go to{" "}
            <a href="/connections" className="text-primary underline">
              Connections
            </a>{" "}
            to add your first service.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((conn) => (
          <Card key={conn.id} className="hover:border-primary/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <div className="h-10 w-10 flex items-center justify-center overflow-hidden shrink-0">
                <Image
                  src={connectionIcons[conn.type as ConnectionType] ?? "/github.png"}
                  alt={conn.type}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{conn.name}</CardTitle>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
                  {conn.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {conn.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{conn.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
