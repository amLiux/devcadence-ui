"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, ExternalLink, RefreshCw } from "lucide-react";
import { useApi } from "@/hooks/use-api";

type Repo = {
  id: string;
  name: string;
  url: string;
  branch: string;
  status: string;
  lastSync: string | null;
};

export default function DashboardPage() {
  const { request, loading } = useApi();
  const [repos, setRepos] = useState<Repo[]>([]);

  useEffect(() => {
    request<Repo[]>({ endpoint: "/api/repos" }).then((data) => {
      if (data) setRepos(data);
    });
  }, [request]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your repos at a glance.</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync All
        </Button>
      </div>

      {repos.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No repos yet. Go to{" "}
            <a href="/connections" className="text-primary underline">
              Connections
            </a>{" "}
            to add your first repo.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {repos.map((repo) => (
          <Card key={repo.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{repo.name}</CardTitle>
                <Badge variant={repo.status === "active" ? "default" : "secondary"}>
                  {repo.status}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-1 text-xs font-mono">
                <GitBranch className="h-3 w-3" />
                {repo.branch}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {repo.lastSync
                    ? `Synced ${new Date(repo.lastSync).toLocaleDateString()}`
                    : "Never synced"}
                </span>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
