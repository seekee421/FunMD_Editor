import * as Y from 'yjs';

type DragState = {
  startBlock: HTMLElement | null;
  startId: string | null;
  currentTargetIndex: number | null;
  blocks: HTMLElement[];
  indicator: HTMLDivElement | null;
  cleanup: (() => void) | null;
  startX: number;
  startY: number;
  startTime: number;
  dragging: boolean;
};

function isDragHandle(el: Element | null): boolean {
  if (!el) return false;
  const cls = el.className?.toString() ?? '';
  const title = (el.getAttribute('title') || el.getAttribute('aria-label') || el.getAttribute('data-tippy-content') || '').toLowerCase();
  // Heuristics: class names or attributes indicating a drag handle
  if (/drag|handle/.test(cls)) return true;
  if (/drag|draggable|handle|grip/.test(title)) return true;
  // Chinese i18n text
  const zh = (el.getAttribute('title') || el.getAttribute('aria-label') || el.getAttribute('data-tippy-content') || '').trim();
  if (zh.includes('拖拽') || zh.includes('可拖拽')) return true;
  return false;
}

function getBlockId(el: HTMLElement | null): string | null {
  if (!el) return null;
  return (
    el.getAttribute('data-block-id') ||
    el.getAttribute('data-block') ||
    (el as any).dataset?.blockId ||
    (el as any).dataset?.block ||
    el.getAttribute('bs-id') ||
    null
  );
}

function collectSiblingBlocks(container: HTMLElement): HTMLElement[] {
  // Common container is the linear content region; collect by attribute
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>('[data-block-id], [data-block], [bs-id]')
  );
  // Filter only visible blocks
  return nodes.filter(n => n.offsetParent !== null);
}

function ensureIndicator(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.height = '2px';
  el.style.background = '#3178c6';
  el.style.zIndex = '9999';
  el.style.pointerEvents = 'none';
  el.style.left = '0';
  el.style.right = '0';
  document.body.appendChild(el);
  return el;
}

function positionIndicator(ind: HTMLDivElement, target: HTMLElement, place: 'before' | 'after') {
  const rect = target.getBoundingClientRect();
  const topPx = place === 'before' ? rect.top : rect.bottom;
  ind.style.top = `${topPx + window.scrollY}px`;
}

function findParentContainingBlock(ydoc: Y.Doc, childId: string): { parentId: string; children: Y.Array<string> } | null {
  const blocks = ydoc.getMap('blocks') as Y.Map<Y.Map<any>>;
  let found: { parentId: string; children: Y.Array<string> } | null = null;
  blocks.forEach((value, key) => {
    const children = value.get('sys:children') as Y.Array<string> | undefined;
    if (children && children.toArray().includes(childId)) {
      found = { parentId: key as string, children };
    }
  });
  return found;
}

function moveChildInYDoc(ydoc: Y.Doc, childId: string, toIndex: number): boolean {
  const parent = findParentContainingBlock(ydoc, childId);
  if (!parent) return false;
  const arr = parent.children;
  const cur = arr.toArray().indexOf(childId);
  if (cur < 0 || toIndex < 0 || toIndex >= arr.length) return false;
  if (cur === toIndex) return false;
  ydoc.transact(() => {
    arr.delete(cur, 1);
    // If we removed an earlier index, target index shifts by -1 when cur < toIndex
    const adjusted = cur < toIndex ? toIndex - 1 : toIndex;
    arr.insert(adjusted, [childId]);
  });
  return true;
}

export function enableLinearDragReorder(container: HTMLElement, ydoc: Y.Doc) {
  const state: DragState = {
    startBlock: null,
    startId: null,
    currentTargetIndex: null,
    blocks: [],
    indicator: null,
    cleanup: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    dragging: false,
  };

  function onPointerDown(e: PointerEvent) {
    const path = e.composedPath() as Element[];
    let handle: Element | null = null;
    let blockEl: HTMLElement | null = null;
    for (const el of path) {
      if (!(el instanceof Element)) continue;
      if (!handle && (isDragHandle(el) || el.matches?.('[data-drag-handle], .drag-handle')))
        handle = el;
      if (!blockEl && el instanceof HTMLElement && getBlockId(el))
        blockEl = el;
      if (handle && blockEl) break;
    }
    const blockId = getBlockId(blockEl);
  if (!handle || !blockEl || !blockId) return;

    state.startBlock = blockEl;
    state.startId = blockId;
    state.blocks = collectSiblingBlocks(blockEl.parentElement || container);
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startTime = performance.now();
    state.dragging = false;

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - state.startX;
      const dy = me.clientY - state.startY;
      const dist = Math.hypot(dx, dy);
      if (!state.dragging && dist > 4) {
        state.dragging = true;
        state.indicator = ensureIndicator();
      }
      if (!state.dragging || !state.indicator || !state.blocks.length) return;
      const y = me.clientY;
      // Find nearest block and decide before/after by midline
      let nearest: { el: HTMLElement; index: number; place: 'before' | 'after' } | null = null;
      for (let i = 0; i < state.blocks.length; i++) {
        const el = state.blocks[i];
        const rect = el.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          const place = y < rect.top + rect.height / 2 ? 'before' : 'after';
          nearest = { el, index: i, place };
          break;
        }
        // Out of bounds, keep closest by distance
        const dist = Math.min(Math.abs(y - rect.top), Math.abs(y - rect.bottom));
        if (!nearest || dist < Math.min(Math.abs((nearest.el.getBoundingClientRect().top) - y), Math.abs((nearest.el.getBoundingClientRect().bottom) - y))) {
          const place: 'before' | 'after' = y < rect.top ? 'before' : 'after';
          nearest = { el, index: i, place };
        }
      }

      if (nearest) {
        positionIndicator(state.indicator!, nearest.el, nearest.place);
        state.currentTargetIndex = nearest.place === 'before' ? nearest.index : nearest.index + 1;
      }
    };

    const onUp = (_ev: PointerEvent) => {
      // mark parameter as used to satisfy TS/ESLint when no need to read it
      void _ev;
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      if (state.indicator) {
        state.indicator.remove();
        state.indicator = null;
      }
      const startIdx = state.blocks.indexOf(state.startBlock!);
      const toIdx = state.currentTargetIndex ?? startIdx;

      if (state.dragging) {
        if (state.startId && toIdx !== null && toIdx !== startIdx) {
          // Persist to Y.Doc; UI会随 Yjs 更新同步
          moveChildInYDoc(ydoc, state.startId, toIdx);
        }
      } // 非拖拽时不做拦截，让句柄自身点击行为生效（打开斜杠菜单），且不插入“/”。
      state.startBlock = null;
      state.startId = null;
      state.currentTargetIndex = null;
      state.blocks = [];
    };

    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
    state.cleanup = () => {
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      state.indicator?.remove();
      state.indicator = null;
    };
  }

  container.addEventListener('pointerdown', onPointerDown, true);

  // Provide a small API to disable when needed
  return () => {
    container.removeEventListener('pointerdown', onPointerDown, true);
    state.cleanup?.();
  };
}