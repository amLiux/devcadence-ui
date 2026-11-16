export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border/50 bg-[#0d1117] p-3 text-[11px] leading-5 font-mono text-[#c9d1d9]">
      {children}
    </pre>
  );
}
