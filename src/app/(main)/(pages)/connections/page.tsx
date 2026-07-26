"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Plug, Trash2, Pencil } from "lucide-react";
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
          <Card key={conn.id} className="relative group overflow-hidden hover:border-primary/50 transition-colors h-full">
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
                <CardTitle>{conn.name}</CardTitle>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
                  {conn.type}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="text-muted-foreground h-7 w-7 px-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 px-0"
                  onClick={() => handleDelete(conn.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {conn.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {conn.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
