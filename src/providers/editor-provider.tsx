"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { EditorNode, EditorEdge, WorkflowContext } from "@/lib/types";

interface EditorState {
  elements: EditorNode[];
  edges: EditorEdge[];
  selectedNode: EditorNode | null;
  context: WorkflowContext;
}

type EditorAction =
  | { type: "LOAD_DATA"; payload: { elements: EditorNode[]; edges: EditorEdge[] } }
  | { type: "UPDATE_NODE"; payload: { nodeId: string; data: Partial<EditorNode["data"]> } }
  | { type: "ADD_NODE"; payload: EditorNode }
  | { type: "DELETE_NODE"; payload: { nodeId: string } }
  | { type: "SET_EDGES"; payload: EditorEdge[] }
  | { type: "SELECT_ELEMENT"; payload: EditorNode | null }
  | { type: "SET_CONTEXT"; payload: WorkflowContext | ((prev: WorkflowContext) => WorkflowContext) }
  | { type: "UNDO" }
  | { type: "REDO" };

interface HistoryState {
  history: EditorState[];
  currentIndex: number;
}

type SidebarTab = "actions" | "settings";

interface EditorContextType {
  editor: EditorState;
  history: HistoryState;
  dispatch: React.Dispatch<EditorAction>;
  addNode: (node: EditorNode) => void;
  deleteNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: Partial<EditorNode["data"]>) => void;
  setEdges: (edges: EditorEdge[]) => void;
  selectNode: (node: EditorNode | null) => void;
  sidebarTab: SidebarTab;
  setSidebarTab: (tab: SidebarTab) => void;
  setContext: (ctx: WorkflowContext | ((prev: WorkflowContext) => WorkflowContext)) => void;
  dirty: boolean;
  markDirty: () => void;
  setDirty: (v: boolean) => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

function buildContextSkeleton(nodes: EditorNode[]): WorkflowContext {
  const ctx: WorkflowContext = {};
  for (const node of nodes) {
    ctx[node.id] = {
      name: node.data.title,
      output: null,
      success: false,
      error: null,
    };
  }
  return ctx;
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "LOAD_DATA": {
      const skeleton = buildContextSkeleton(action.payload.elements);
      return { ...state, elements: action.payload.elements, edges: action.payload.edges, context: skeleton };
    }
    case "ADD_NODE": {
      const elements = [...state.elements, action.payload];
      const existingCtx = state.context;
      const newCtx: WorkflowContext = {};
      for (const node of elements) {
        newCtx[node.id] = existingCtx[node.id] ?? {
          name: node.data.title,
          output: null,
          success: false,
          error: null,
        };
      }
      return { ...state, elements, context: newCtx };
    }
    case "DELETE_NODE": {
      const elements = state.elements.filter((el) => el.id !== action.payload.nodeId);
      const existingCtx = state.context;
      const newCtx: WorkflowContext = {};
      for (const node of elements) {
        newCtx[node.id] = existingCtx[node.id] ?? {
          name: node.data.title,
          output: null,
          success: false,
          error: null,
        };
      }
      return {
        ...state,
        elements,
        edges: state.edges.filter(
          (e) => e.source !== action.payload.nodeId && e.target !== action.payload.nodeId,
        ),
        selectedNode: state.selectedNode?.id === action.payload.nodeId ? null : state.selectedNode,
        context: newCtx,
      };
    }
    case "UPDATE_NODE":
      return {
        ...state,
        elements: state.elements.map((el) =>
          el.id === action.payload.nodeId
            ? { ...el, data: { ...el.data, ...action.payload.data } }
            : el,
        ),
        selectedNode:
          state.selectedNode?.id === action.payload.nodeId
            ? {
                ...state.selectedNode,
                data: { ...state.selectedNode.data, ...action.payload.data },
              }
            : state.selectedNode,
      };
    case "SET_EDGES":
      return { ...state, edges: action.payload };
    case "SELECT_ELEMENT":
      return { ...state, selectedNode: action.payload };
    case "SET_CONTEXT":
      return { ...state, context: typeof action.payload === "function" ? action.payload(state.context) : action.payload };
    default:
      return state;
  }
}

const initialEditorState: EditorState = {
  elements: [],
  edges: [],
  selectedNode: null,
  context: {},
};

const initialHistoryState: HistoryState = {
  history: [initialEditorState],
  currentIndex: 0,
};

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [editor, dispatch] = useReducer(editorReducer, initialEditorState);
  const [history, setHistory] = useState<HistoryState>(initialHistoryState);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("actions");
  const [dirty, setDirty] = useState(false);
  const isUndoRedo = useRef(false);

  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  useEffect(() => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }
    setHistory((prev) => {
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);
      newHistory.push({ ...editor });
      return { history: newHistory, currentIndex: newHistory.length - 1 };
    });
  }, [editor]);

  const addNode = useCallback(
    (node: EditorNode) => {
      dispatch({ type: "ADD_NODE", payload: node });
    },
    [dispatch],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: "DELETE_NODE", payload: { nodeId } });
    },
    [dispatch],
  );

  const updateNode = useCallback(
    (nodeId: string, data: Partial<EditorNode["data"]>) => {
      dispatch({ type: "UPDATE_NODE", payload: { nodeId, data } });
    },
    [dispatch],
  );

  const setEdges = useCallback(
    (edges: EditorEdge[]) => {
      dispatch({ type: "SET_EDGES", payload: edges });
    },
    [dispatch],
  );

  const selectNode = useCallback(
    (node: EditorNode | null) => {
      dispatch({ type: "SELECT_ELEMENT", payload: node });
    },
    [dispatch],
  );

  const setContext = useCallback(
    (ctx: WorkflowContext | ((prev: WorkflowContext) => WorkflowContext)) => {
      if (typeof ctx === "function") {
        dispatch({ type: "SET_CONTEXT", payload: ctx });
      } else {
        dispatch({ type: "SET_CONTEXT", payload: ctx });
      }
    },
    [dispatch],
  );

  return (
    <EditorContext.Provider
      value={{
        editor,
        history,
        dispatch,
        addNode,
        deleteNode,
        updateNode,
        setEdges,
        selectNode,
        sidebarTab,
        setSidebarTab,
        setContext,
        dirty,
        markDirty,
        setDirty,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
