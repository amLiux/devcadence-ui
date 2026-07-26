"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Plug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { useModal } from "@/providers/modal-provider";
import { CustomModal } from "@/components/composed/custom-modal";
import { ConnectionForm } from "@/components/forms/connections/connection-form";
import { connectionIcons } from "@/lib/constants";
import type { Connection, ConnectionData, ConnectionType } from "@/lib/types";

export default function ConnectionsPage() {
  const { request, loading } = useApi();
  const [connections, setConnections] = useState<Connection[]>([]);
  const { setOpen, setClose } = useModal();

  useEffect(() => {
    request<Connection[]>({ endpoint: "/api/connections" }).then((data) => {
      if (data) setConnections(data);
    });
  }, [request]);

  const handleCreate = async (data: ConnectionData) => {
    const newConn = await request<Connection>({
      endpoint: "/api/connections",
      method: "POST",
      data,
    });
    if (newConn) setConnections((prev) => [newConn, ...prev]);
    setClose();
  };

  const handleDelete = async (id: string) => {
    await request({ endpoint: `/api/connections/${id}`, method: "DELETE" });
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  const openNewConnection = () => {
    setOpen(
      <CustomModal title="Add Connection" subheading="Choose a service to connect">
        <ConnectionForm onSubmit={handleCreate} />
      </CustomModal>,
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Connections</h1>
          <p className="text-muted-foreground">Connect your services and tools.</p>
        </div>
        <Button onClick={openNewConnection}>
          <Plug className="mr-2 h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {connections.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No connections yet. Add your first service.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((conn) => (
          <Card key={conn.id} className="relative group overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                <Image
                  src={connectionIcons[conn.type as ConnectionType] ?? "/github.png"}
                  alt={conn.type}
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{conn.name}</CardTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {conn.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(conn.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {conn.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {conn.description}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2 text-xs"
                onClick={() => handleDelete(conn.id)}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
