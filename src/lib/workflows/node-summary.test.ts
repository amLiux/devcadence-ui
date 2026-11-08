import { describe, it, expect } from "vitest";
import { summarizeNode } from "./node-summary";

describe("summarizeNode — expressions", () => {
  it("prefixes the conditional expression with 'if'", () => {
    expect(summarizeNode({ expression: "previousStep.status === 200" }, "Conditional")).toBe(
      "if previousStep.status === 200",
    );
  });

  it("appends the output name when the node defines one", () => {
    expect(
      summarizeNode({ expression: "previousStep.status === 200", outputName: "ok" }, "Conditional"),
    ).toBe("if previousStep.status === 200 → ok");
    expect(
      summarizeNode({ expression: "previousStep.count * 2", outputName: "doubled" }, "Transform Data"),
    ).toBe("previousStep.count * 2 → doubled");
  });

  it("shows a bare expression for Transform Data", () => {
    expect(summarizeNode({ expression: "a + b" }, "Transform Data")).toBe("a + b");
  });

  it("returns null when the expression is empty or blank", () => {
    expect(summarizeNode({}, "Conditional")).toBeNull();
    expect(summarizeNode({ expression: "   " }, "Conditional")).toBeNull();
    expect(summarizeNode({ expression: "" }, "Transform Data")).toBeNull();
  });
});

describe("summarizeNode — Call Workflow", () => {
  it("prefers the stored workflow name", () => {
    expect(
      summarizeNode({ workflowId: "wf-1", workflowName: "Send Daily Report" }, "Call Workflow"),
    ).toBe("→ Send Daily Report");
  });

  it("falls back to the workflow id", () => {
    expect(summarizeNode({ workflowId: "wf-123" }, "Call Workflow")).toBe("→ wf-123");
  });

  it("prefers a live name from the provider over the persisted one", () => {
    expect(
      summarizeNode({ workflowId: "wf-1", workflowName: "Old Name" }, "Call Workflow", {
        workflowNames: { "wf-1": "New Name" },
      }),
    ).toBe("→ New Name");
  });

  it("falls back to the persisted name when the id is unknown", () => {
    expect(
      summarizeNode({ workflowId: "wf-gone", workflowName: "Deleted Workflow" }, "Call Workflow", {
        workflowNames: { "wf-1": "Other" },
      }),
    ).toBe("→ Deleted Workflow");
  });

  it("returns null when nothing is selected", () => {
    expect(summarizeNode({}, "Call Workflow")).toBeNull();
  });
});

describe("summarizeNode — HTTP Request", () => {
  it("shows the method and the url", () => {
    expect(summarizeNode({ url: "https://api.test/items" }, "HTTP Request")).toBe(
      "GET https://api.test/items",
    );
    expect(summarizeNode({ url: "https://api.test/items", method: "post" }, "HTTP Request")).toBe(
      "POST https://api.test/items",
    );
  });

  it("returns null without a url", () => {
    expect(summarizeNode({ method: "GET" }, "HTTP Request")).toBeNull();
  });

  it("never leaks headers or bodies", () => {
    const summary = summarizeNode(
      {
        url: "https://api.test/secure",
        headers: '{"Authorization":"leak-canary"}',
        body: '{"password":"leak-canary"}',
      },
      "HTTP Request",
    );

    expect(summary).toBe("GET https://api.test/secure");
    expect(summary).not.toContain("leak-canary");
  });
});

describe("summarizeNode — For Each", () => {
  it("shows the target workflow and the item limit", () => {
    expect(
      summarizeNode(
        { workflowId: "wf-1", workflowName: "Helper", maxItems: "10" },
        "For Each",
      ),
    ).toBe("Helper · max 10");
  });

  it("uses the live workflow name when available", () => {
    expect(
      summarizeNode(
        { workflowId: "wf-1", workflowName: "Old", maxItems: "5" },
        "For Each",
        { workflowNames: { "wf-1": "New" } },
      ),
    ).toBe("New · max 5");
  });

  it("returns null without a target", () => {
    expect(summarizeNode({ maxItems: "10" }, "For Each")).toBeNull();
  });
});

describe("summarizeNode — Slack", () => {
  it("shows the channel and a truncated message", () => {
    expect(
      summarizeNode({ channel: "#general", text: "Deploy failed on main" }, "Send Slack Message"),
    ).toBe("#general · Deploy failed on main");
  });

  it("normalizes a channel name without the hash", () => {
    expect(summarizeNode({ channel: "general" }, "Send Slack Message")).toBe("#general");
  });

  it("shortens channel ids", () => {
    expect(summarizeNode({ channel: "C1234567890" }, "Send Slack Message")).toBe("#C12345…");
  });

  it("falls back to the message when there is no channel", () => {
    expect(summarizeNode({ text: "hello" }, "Send Slack Message")).toBe('"hello"');
  });

  it("returns null when nothing is configured", () => {
    expect(summarizeNode({}, "Send Slack Message")).toBeNull();
  });
});

describe("summarizeNode — Send Email", () => {
  it("shows the recipient and the subject", () => {
    expect(
      summarizeNode({ to: "ana@example.com", subject: "Deploy failed" }, "Send Email"),
    ).toBe('ana@example.com · "Deploy failed"');
  });

  it("degrades gracefully with only one field", () => {
    expect(summarizeNode({ to: "ana@example.com" }, "Send Email")).toBe("ana@example.com");
    expect(summarizeNode({ subject: "Hi" }, "Send Email")).toBe('"Hi"');
  });

  it("returns null when both are empty", () => {
    expect(summarizeNode({ body: "ignored" }, "Send Email")).toBeNull();
  });
});

describe("summarizeNode — PostgreSQL", () => {
  it("collapses a multi-line query into one line", () => {
    expect(summarizeNode({ sql: "SELECT *\nFROM users\nWHERE id = 1" }, "PostgreSQL Query")).toBe(
      "SELECT * FROM users WHERE id = 1",
    );
  });

  it("shows the table for insert, update and delete", () => {
    expect(summarizeNode({ table: "users" }, "PostgreSQL Insert")).toBe("users");
    expect(summarizeNode({ table: "users" }, "PostgreSQL Update")).toBe("users");
    expect(summarizeNode({ table: "users" }, "PostgreSQL Delete")).toBe("users");
  });

  it("returns null when nothing is configured", () => {
    expect(summarizeNode({}, "PostgreSQL Query")).toBeNull();
    expect(summarizeNode({}, "PostgreSQL Insert")).toBeNull();
  });
});

describe("summarizeNode — Discord", () => {
  it("shortens channel snowflakes and keeps the content", () => {
    expect(
      summarizeNode({ channelId: "1234567890123456789", content: "hi" }, "Send Discord Message"),
    ).toBe("#123456… · hi");
  });

  it("shows the read limit", () => {
    expect(
      summarizeNode({ channelId: "1234567890123456789", limit: "50" }, "Read Discord Messages"),
    ).toBe("#123456… · last 50");
  });

  it("shortens direct message user ids and keeps the content", () => {
    expect(
      summarizeNode({ userId: "1234567890123456789", content: "hi" }, "Send Direct Message"),
    ).toBe("@123456… · hi");
  });

  it("falls back to the content when there is no user id", () => {
    expect(summarizeNode({ content: "hi" }, "Send Direct Message")).toBe('"hi"');
  });

  it("returns null when nothing is configured", () => {
    expect(summarizeNode({}, "Send Discord Message")).toBeNull();
    expect(summarizeNode({}, "Send Direct Message")).toBeNull();
  });
});

describe("summarizeNode — AI nodes", () => {
  it("shows the prompt", () => {
    expect(summarizeNode({ prompt: "Summarize this issue" }, "Prompt")).toBe(
      "Summarize this issue",
    );
  });

  it("shows the categories for Classify", () => {
    expect(summarizeNode({ categories: "bug, feature, question" }, "Classify")).toBe(
      "bug, feature, question",
    );
  });

  it("shows the fields for Extract", () => {
    expect(summarizeNode({ fields: "name, email, priority" }, "Extract")).toBe(
      "name, email, priority",
    );
  });
});

describe("summarizeNode — edge cases", () => {
  it("returns null for node types without a summarizer", () => {
    expect(summarizeNode({ anything: "here" }, "Input")).toBeNull();
    expect(summarizeNode({ anything: "here" }, "Return")).toBeNull();
    expect(summarizeNode({ anything: "here" }, "Listen Discord Messages")).toBeNull();
  });

  it("returns null for missing metadata", () => {
    expect(summarizeNode(undefined, "Conditional")).toBeNull();
    expect(summarizeNode({}, "HTTP Request")).toBeNull();
  });

  it("collapses newlines and surrounding whitespace", () => {
    expect(summarizeNode({ prompt: "  line one\n  line two  " }, "Prompt")).toBe(
      "line one line two",
    );
  });

  it("caps very long values", () => {
    const summary = summarizeNode({ prompt: "a".repeat(300) }, "Prompt");
    expect(summary).toHaveLength(60);
    expect(summary?.endsWith("…")).toBe(true);
  });

  it("hard-caps every preview, including composed ones", () => {
    const summary = summarizeNode(
      { to: "someone@example.com", subject: "b".repeat(200) },
      "Send Email",
    );
    expect(summary).toHaveLength(60);
    expect(summary?.endsWith("…")).toBe(true);
  });

  it("never exposes secret-looking fields", () => {
    const secretMeta = {
      token: "leak-canary",
      password: "leak-canary",
      headers: '{"Authorization":"leak-canary"}',
      body: '{"password":"leak-canary"}',
      connectionId: "conn-leak-canary",
    };

    const titles = [
      "Conditional",
      "Transform Data",
      "Call Workflow",
      "HTTP Request",
      "Send Slack Message",
      "Send Email",
      "PostgreSQL Query",
      "Send Discord Message",
      "Prompt",
    ];

    for (const title of titles) {
      const summary = summarizeNode(secretMeta, title);
      expect(summary ?? "").not.toContain("leak-canary");
    }
  });
});

describe("summarizeNode — Tier 2", () => {
  it("renders a schedule cron as human text", () => {
    expect(summarizeNode({ cron: "0 9 * * *" }, "Schedule")).toBe("At 09:00 AM");
  });

  it("falls back to the raw cron when it cannot be parsed", () => {
    expect(summarizeNode({ cron: "not-a-cron" }, "Schedule")).toBe("not-a-cron");
  });

  it("returns null for an empty schedule", () => {
    expect(summarizeNode({}, "Schedule")).toBeNull();
  });

  it("shows the retry loop method, url and retries", () => {
    expect(
      summarizeNode({ method: "post", url: "https://api.test/items", maxRetries: "3" }, "Retry Loop"),
    ).toBe("POST https://api.test/items · 3 retries");
  });

  it("returns null for a retry loop without a url", () => {
    expect(summarizeNode({ maxRetries: "3" }, "Retry Loop")).toBeNull();
  });

  it("shows the repository and title for Create Issue", () => {
    expect(summarizeNode({ repo: "acme/api", title: "Fix login" }, "Create Issue")).toBe(
      'acme/api · "Fix login"',
    );
  });

  it("shows the repository and number for Add Comment", () => {
    expect(summarizeNode({ repo: "acme/api", issueNumber: "42" }, "Add Comment")).toBe(
      "acme/api#42",
    );
  });

  it("shows the label for Add Label", () => {
    expect(
      summarizeNode({ repo: "acme/api", issueNumber: "42", label: "bug" }, "Add Label"),
    ).toBe("acme/api#42 · bug");
  });

  it("shows the reviewers for Request Review", () => {
    expect(
      summarizeNode({ repo: "acme/api", prNumber: "7", reviewers: "ana,bob" }, "Request Review"),
    ).toBe("acme/api#7 · ana,bob");
  });

  it("shows the branch for Listen Commits", () => {
    expect(summarizeNode({ repo: "acme/api", branch: "main" }, "Listen Commits")).toBe(
      "acme/api · main",
    );
  });

  it("shows the events for Listen Pull Requests and Listen Issues", () => {
    expect(
      summarizeNode({ repo: "acme/api", events: "opened, closed" }, "Listen Pull Requests"),
    ).toBe("acme/api · opened, closed");
    expect(
      summarizeNode({ repo: "acme/api", events: "opened, labeled" }, "Listen Issues"),
    ).toBe("acme/api · opened, labeled");
  });

  it("shows the filter for Listen Comments and the repo for Listen Releases", () => {
    expect(summarizeNode({ repo: "acme/api", filter: "TODO" }, "Listen Comments")).toBe(
      "acme/api · TODO",
    );
    expect(summarizeNode({ repo: "acme/api" }, "Listen Releases")).toBe("acme/api");
  });

  it("returns null for GitHub nodes without a repository", () => {
    expect(summarizeNode({ branch: "main" }, "Listen Commits")).toBeNull();
    expect(summarizeNode({ title: "Fix" }, "Create Issue")).toBeNull();
    expect(summarizeNode({}, "Add Label")).toBeNull();
  });

  it("shows the severity filter for Scan Dependencies", () => {
    expect(
      summarizeNode({ repo: "acme/api", severityFilter: "high", outputName: "scan" }, "Scan Dependencies"),
    ).toBe("acme/api · high+ → scan");
    expect(summarizeNode({ repo: "acme/api", severityFilter: "all" }, "Scan Dependencies")).toBe(
      "acme/api",
    );
  });

  it("counts the configured Build JSON fields", () => {
    expect(
      summarizeNode(
        { mapKey_1: "total", mapValue_1: "a", mapKey_2: "count", mapValue_2: "b" },
        "Build JSON",
      ),
    ).toBe("2 fields");
    expect(summarizeNode({ mapKey_1: "total" }, "Build JSON")).toBe("1 field");
  });

  it("appends the output name for Build JSON", () => {
    expect(
      summarizeNode({ mapKey_1: "total", mapValue_1: "a", outputName: "payload" }, "Build JSON"),
    ).toBe("1 field → payload");
  });

  it("ignores empty Build JSON keys", () => {
    expect(summarizeNode({ mapKey_1: "", mapKey_2: "total" }, "Build JSON")).toBe("1 field");
    expect(summarizeNode({}, "Build JSON")).toBeNull();
  });

  it("never leaks secrets in Tier 2 previews", () => {
    const secretMeta = {
      repo: "acme/api",
      url: "https://api.test/secure",
      headers: '{"Authorization":"leak-canary"}',
      body: '{"password":"leak-canary"}',
      connectionId: "conn-leak-canary",
      maxRetries: "2",
    };

    for (const title of ["Retry Loop", "Create Issue", "Listen Commits", "Scan Dependencies"]) {
      const summary = summarizeNode(secretMeta, title);
      expect(summary ?? "").not.toContain("leak-canary");
    }
  });
});
