function isInsideCodeBlock(el: Element | null): boolean {
  if (!el) return false;
  return !!el.closest('.affine-code-block-container');
}

function getActiveEditable(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  if (active && active.getAttribute('contenteditable') === 'true') return active;
  const sel = window.getSelection();
  const node = sel?.anchorNode as Node | null;
  const el = (node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement) || null;
  return (el?.closest('[contenteditable="true"]') as HTMLElement | null) || null;
}

function insertNewline(editable: HTMLElement | null) {
  try {
    document.execCommand('insertText', false, '\n');
    return true;
  } catch {
    // fall through
  }
  try {
    const before = new InputEvent('beforeinput', { inputType: 'insertLineBreak' } as any);
    const input = new InputEvent('input', { inputType: 'insertLineBreak' } as any);
    (editable || document.activeElement)?.dispatchEvent(before);
    (editable || document.activeElement)?.dispatchEvent(input);
    return true;
  } catch {
    // fall through
  }
  try {
    const sel = window.getSelection();
    if (!sel) return false;
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    if (!range) return false;
    const textNode = document.createTextNode('\n');
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  } catch {
    return false;
  }
}

export function enableCodeBlockEnterFix(root: HTMLElement) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

    const target = e.target as Element | null;
    let inCode = isInsideCodeBlock(target);
    if (!inCode) {
      const sel = window.getSelection();
      const node = sel?.anchorNode as Node | null;
      const el = (node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement) || null;
      inCode = isInsideCodeBlock(el);
    }
    if (!inCode) return;

    // 仅在代码块内接管 Enter，插入换行符
    e.preventDefault();
    e.stopPropagation();
    const editable = getActiveEditable();
    insertNewline(editable);
  };

  root.addEventListener('keydown', onKeyDown, true);

  return () => root.removeEventListener('keydown', onKeyDown, true);
}