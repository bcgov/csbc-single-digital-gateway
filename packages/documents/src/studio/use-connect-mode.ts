import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import type { CanvasGraph } from './canvas-graph';
import { connect, connectTargets, type ConnectSource } from './connect-edits';
import { DEFAULT_LABEL } from './criteria';
import type { Uischema } from './document-types';
import { nodeIdsOf, type NodeOutput } from './funnel-model';

/** One output a picked Condition offers in the "Connect from" chooser, named as its edge's label names it. */
export interface ChoosableOutput {
  key: string;
  label: string;
  output: NodeOutput;
}

/** Where connect mode stands, for the nodes: which may be picked, and which Condition is asking for an output. */
export interface ConnectView {
  targets: ReadonlyMap<string, NodeOutput[]>;
  choosing: { nodeId: string; outputs: ChoosableOutput[] } | null;
}

/**
 * Connect mode (doc 235 rules 5-10). While a source is set, every click on the canvas is caught in the CAPTURE phase,
 * before xyflow or any button sees it: a pickable node connects (or opens the output chooser), a dimmed node is
 * ignored, anything else cancels. Escape — listened for on the document, since focus may be anywhere — closes an
 * open chooser, else cancels.
 */
export function useConnectMode(
  uischema: Uischema,
  graph: CanvasGraph,
  onChange: (uischema: Uischema) => void,
) {
  const [source, setSource] = useState<ConnectSource | null>(null);
  const [choosing, setChoosing] = useState<ConnectView['choosing']>(null);
  const targets = useMemo(
    () => (source === null ? null : connectTargets(uischema, source)),
    [uischema, source],
  );
  const cancel = useCallback(() => {
    setSource(null);
    setChoosing(null);
  }, []);
  const finish = (output: NodeOutput, target: string) => {
    onChange(connect(uischema, output, target));
    cancel();
  };
  const pick = (nodeId: string) => {
    const outputs = targets?.get(nodeId);
    if (source === null || outputs === undefined) return;
    if (source.kind === 'output') finish(source.output, nodeId);
    else if (outputs.length === 1) finish(outputs[0]!, source.nodeId);
    else setChoosing({ nodeId, outputs: outputs.map((o) => choosable(graph, o)) });
  };
  useEscape(source !== null, () => (choosing === null ? cancel() : setChoosing(null)));

  const onClickCapture = (event: MouseEvent) => {
    if (source === null) return;
    const target = event.target as Element;
    if (target.closest(`[data-slot="${CHOOSER_SLOT}"]`) !== null) return;
    event.stopPropagation();
    event.preventDefault();
    if (choosing !== null) return setChoosing(null);
    const id = target.closest('.react-flow__node')?.getAttribute('data-id');
    if (id != null && nodeIdsOf(uischema).includes(id)) return pick(id);
    cancel();
  };

  return {
    connecting: source !== null,
    /** For the canvas box: the ring around it, an overlay above xyflow's opaque pane (an inset ring on the box itself
     * would be painted beneath it), and node actions put away. */
    canvasClass: source === null ? '' : CONNECTING_CLASS,
    start: setSource,
    view: targets === null ? null : ({ targets, choosing } satisfies ConnectView),
    /** A "Connect from" choice: the picked Condition's output into the headless Condition. */
    chooseOutput: (output: NodeOutput) => {
      if (source?.kind === 'into') finish(output, source.nodeId);
    },
    onClickCapture,
  };
}

/** Connect mode's blue ring around the whole canvas, and its node actions put away (doc 235 rule 6). */
const CONNECTING_CLASS =
  "after:pointer-events-none after:absolute after:inset-0 after:z-10 after:ring-2 after:ring-primary after:ring-inset after:content-[''] [&_[data-slot=document-studio-node-actions]]:hidden";

/** The chooser's slot: clicks inside it reach its items instead of being caught. */
export const CHOOSER_SLOT = 'document-studio-connect-chooser';

/** An output named by its trailing edge's branch label (the row summary), or "Default". */
function choosable(graph: CanvasGraph, output: NodeOutput): ChoosableOutput {
  const edge =
    graph.kind === 'graph'
      ? graph.edges.find(
          (e) =>
            e.data?.add.kind === 'trailing' &&
            e.data.add.output.source === output.source &&
            e.data.add.output.sourceHandle === output.sourceHandle,
        )
      : undefined;
  return {
    key: output.sourceHandle ?? 'default',
    label: edge?.data?.branchLabel ?? DEFAULT_LABEL,
    output,
  };
}

function useEscape(active: boolean, onEscape: () => void) {
  const handler = useRef(onEscape);
  handler.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      handler.current();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [active]);
}

/** Connect mode as the nodes see it; `null` outside the mode. A context, so the graph's node data stays plain. */
export const ConnectViewContext = createContext<{
  view: ConnectView;
  chooseOutput: (output: NodeOutput) => void;
} | null>(null);

/** How a node is marked while connecting, and the outputs it asks to choose from, if it is the Condition asking. */
export function useNodeConnect(nodeId: string) {
  const context = useContext(ConnectViewContext);
  if (context === null) return { mark: undefined, choosing: null, chooseOutput: () => {} };
  const { view, chooseOutput } = context;
  return {
    mark: view.targets.has(nodeId) ? ('pickable' as const) : ('dimmed' as const),
    choosing: view.choosing?.nodeId === nodeId ? view.choosing.outputs : null,
    chooseOutput,
  };
}
