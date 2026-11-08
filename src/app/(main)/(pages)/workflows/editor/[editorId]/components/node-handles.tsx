import { Handle, Position } from "reactflow";

export function NodeHandles({ isConditional }: { isConditional: boolean }) {
  if (!isConditional) {
    return (
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
    );
  }

  return (
    <>
      <Handle
        type="source"
        position={Position.Bottom}
        id="success"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-background !left-1/4"
      />
      <span className="absolute -bottom-5 left-[25%] -translate-x-1/2 text-[9px] text-green-600 font-medium pointer-events-none select-none">
        Yes
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        id="failure"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-background !left-3/4"
      />
      <span className="absolute -bottom-5 left-[75%] -translate-x-1/2 text-[9px] text-red-600 font-medium pointer-events-none select-none">
        No
      </span>
    </>
  );
}
