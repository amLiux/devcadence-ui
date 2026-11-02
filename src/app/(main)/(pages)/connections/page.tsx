"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Plug, Trash2, Pencil, Activity, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { useModal } from "@/providers/modal-provider";
import { CustomModal } from "@/components/composed/custom-modal";
import { ConnectionForm } from "@/components/forms/connections/connection-form";
import { connectionIcons, TESTABLE_CONNECTION_TYPES } from "@/lib/constants";
import type { Connection, ConnectionData, ConnectionTestResult, ConnectionType } from "@/lib/types";

export default function ConnectionsPage() {
  const { request, loading } = useApi();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
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

  const handleUpdate = async (id: string, data: ConnectionData) => {
    const updated = await request<Connection>({
      endpoint: `/api/connections/${id}`,
      method: "PUT",
      data,
    });
    if (updated) {
      setConnections((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }
    setClose();
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await request<ConnectionTestResult>({
        endpoint: `/api/connections/${id}/test`,
        method: "POST",
      });
      if (result) setTestResults((prev) => ({ ...prev, [id]: result }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, latencyMs: 0, message: "Request failed" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const openNewConnection = () => {
    setOpen(
      <CustomModal title="Add Connection" subheading="Choose a service to connect">
        <ConnectionForm onSubmit={handleCreate} />
      </CustomModal>,
    );
  };

  const openEditConnection = (conn: Connection) => {
    setOpen(
      <CustomModal title="Edit Connection" subheading={`Update ${conn.name}`}>
        <ConnectionForm initialData={conn} onSubmit={handleCreate} onUpdate={handleUpdate} />
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
                {TESTABLE_CONNECTION_TYPES.includes(conn.type) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-emerald-600 h-7 w-7 px-0"
                    onClick={() => handleTest(conn.id)}
                    disabled={testingId === conn.id}
                    aria-label={`Test ${conn.name}`}
                  >
                    {testingId === conn.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Activity className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-7 w-7 px-0"
                  onClick={() => openEditConnection(conn)}
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
              {testResults[conn.id] && (
                <p
                  className={`mt-1 flex items-center gap-1 text-[11px] ${
                    testResults[conn.id].ok ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {testResults[conn.id].ok ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate" title={testResults[conn.id].message}>
                    {testResults[conn.id].message}
                  </span>
                  {testResults[conn.id].latencyMs > 0 && (
                    <span className="shrink-0 text-muted-foreground">
                      · {testResults[conn.id].latencyMs} ms
                    </span>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
