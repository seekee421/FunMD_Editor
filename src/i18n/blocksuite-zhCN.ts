// Lightweight zh-CN overlay for BlockSuite presets UI strings
// Non-invasive: does not touch node_modules; works via MutationObserver.

type Dictionary = Record<string, string>;

const dict: Dictionary = {
  // Outline / block type labels
  'Quote': '引用',
  'Text Block': '文本',
  'Text': '文本',
  'Paragraph': '段落',
  'Heading 1': '标题 1',
  'Heading 2': '标题 2',
  'Heading 3': '标题 3',
  'Heading 4': '标题 4',
  'Heading 5': '标题 5',
  'Heading 6': '标题 6',
  'Code Block': '代码块',
  'Bulleted List': '项目符号列表',
  'Numbered List': '编号列表',
  'Toggle List': '折叠列表',
  'Todo': '待办',
  'Bookmark': '书签',
  'Image': '图片',
  'Database': '数据库',
  'Attachment': '附件',

  // Block toolbar / context menu
  'Copy': '复制',
  'Duplicate': '复制一份',
  'Delete': '删除',
  'Bold': '加粗',
  'Italic': '斜体',
  'Underline': '下划线',
  'Strikethrough': '删除线',
  'Strike': '删除线',
  'Code': '代码',
  'Inline Code': '行内代码',
  'Link': '链接',
  'Unlink': '取消链接',
  'Highlight': '高亮',
  // Caption related
  'Caption': '说明文字',
  'Write a caption': '写说明文字',
  'Add a caption': '添加说明文字',
  'Add caption': '添加说明文字',
  'Copy Code': '复制代码',
  'Copy to clipboard': '复制到剪贴板',
  'Copied': '已复制',
  'Copied!': '已复制！',
  'Quote Block': '引用块',
  'Align left': '左对齐',
  'Align center': '居中对齐',
  'Align right': '右对齐',
  'More': '更多',
  'Clear Formatting': '清除格式',
  'Formatting': '格式化',
  'Insert Image': '插入图片',
  'Insert Link': '插入链接',
  'Remove Link': '移除链接',
  'Remove': '移除',
  'Open Link': '打开链接',
  'Edit Link': '编辑链接',
  'Turn into': '转换为',
  'Style': '样式',
  'Type': '类型',
  'Checklist': '清单',
  'Task List': '任务清单',
  'Todo List': '待办清单',
  'To-do List': '待办清单',
  'More actions': '更多操作',
  'More options': '更多选项',
  'Cancel': '取消',
  'Confirm': '确认',
  'Apply': '应用',
  'Save': '保存',
  'Close': '关闭',
  'Undo': '撤销',
  'Redo': '重做',

  // Common UI
  'Untitled': '未命名',
  'Tags': '标签',
  'Title': '标题',

  // Relative time
  'just now': '刚刚',
  'minutes ago': '分钟前',
  'hours ago': '小时前',
  // Placeholders
  "Type '/' for commands": '输入 / 唤起更多',
  "Type '/' for commands, 'space' for AI": '输入 / 唤起更多，按空格使用 AI',
  // Slash menu descriptions
  'Start typing with plain text.': '开始输入纯文本。',
  'Headings in the largest font.': '最大字号的标题。',
  'Headings in the 2nd font size.': '第二大字号的标题。',
  'Headings in the 3rd font size.': '第三大字号的标题。',
  'Other Headings': '其他标题',
  'Code snippet with formatting.': '带格式的代码片段。',
  'Add a blockquote for emphasis.': '添加用于强调的引用块。',
};

const dynamicMatchers: Array<{
  test: (s: string) => boolean;
  replace: (s: string) => string;
}> = [
  // "Type '/' for commands" (and optional ", 'space' for AI")
  {
    test: s => /Type\s+['’]\/['’]\s+for\s+commands(?:,\s*['’]space['’]\s+for\s+AI)?/i.test(s),
    replace: s => s.replace(/Type\s+['’]\/['’]\s+for\s+commands(?:,\s*['’]space['’]\s+for\s+AI)?/gi, m =>
      /space/i.test(m) ? '输入 / 唤起更多，按空格使用 AI' : '输入 / 唤起更多'
    ),
  },
  // "and 3 more" → "还有 3 项"
  {
    test: s => /\band\s+\d+\s+more\b/i.test(s),
    replace: s => s.replace(/and\s+(\d+)\s+more/gi, '还有 $1 项'),
  },
  // "Write a caption" / "Add a caption" (with optional ellipsis)
  {
    test: s => /\b(?:Write|Add)\s+(?:a\s+)?caption(?:\s*(?:\.{3}|…))?\b/i.test(s),
    replace: s => s.replace(/((?:Write|Add)\s+(?:a\s+)?caption(?:\s*(?:\.{3}|…))?)/gi, m =>
      /^\s*Add/i.test(m) ? '添加说明文字' : '写说明文字'
    ),
  },
  // "Edited 5 minutes ago" → "编辑于 5 分钟前"; "Edited an hour ago" → "编辑于 1 小时前"
  {
    test: s => /\bEdited\b.*\b(minutes|minute|hours|hour)\b/i.test(s),
    replace: s => s
      .replace(/Edited\s+(\d+)\s+minutes?\s+ago/gi, '编辑于 $1 分钟前')
      .replace(/Edited\s+an\s+hour\s+ago/gi, '编辑于 1 小时前')
      .replace(/Edited\s+(\d+)\s+hours?\s+ago/gi, '编辑于 $1 小时前'),
  },
];

function isEditable(node: Node): boolean {
  if (!(node instanceof HTMLElement)) {
    const el = node.parentElement as HTMLElement | null;
    return !!el?.closest('[contenteditable="true"]');
  }
  return !!node.closest('[contenteditable="true"]');
}

// Keep originals to restore on unmount (allow switching back to English)
const translatedNodes = new Map<Text, string>();
const observedRoots = new Set<Node>();
let originalAttachShadow: ((this: Element, init: ShadowRootInit) => ShadowRoot) | null = null;

const attrKeys = ['title', 'aria-label', 'aria-description', 'data-tooltip', 'data-title', 'data-tippy-content'] as const;
type AttrKey = typeof attrKeys[number];
let translatedAttrs = new WeakMap<Element, Map<AttrKey, string>>();
let missingTokens = new Set<string>();
let missingReportTimer: number | null = null;
let _bilingualMode = false;

function recordMissing(token: string) {
  const t = token.trim();
  if (!t) return;
  // Skip if contains Chinese already
  if (/\p{Script=Han}/u.test(t)) return;
  // Ignore very short labels (single letters like B/I/U)
  if (t.length <= 2) return;
  missingTokens.add(t);
  if (!missingReportTimer) {
    missingReportTimer = window.setTimeout(() => {
      try {
        if (missingTokens.size) {
          console.debug('[i18n][zh-CN] missing tokens:', Array.from(missingTokens).slice(0, 100));
        }
      } finally {
        missingTokens.clear();
        missingReportTimer = null;
      }
    }, 1500);
  }
}

function translateTextNode(node: Text): void {
  const raw = node.nodeValue ?? '';
  const trimmed = raw.trim();
  if (!trimmed) return;
  const insideEditable = isEditable(node);

  // allowlist: placeholders inside editable can be translated safely
  const editableAllow = /^(?:Type\s+['’]\/['’]\s+for\s+commands(?:,\s*['’]space['’]\s+for\s+AI)?|(?:Write|Add)\s+(?:a\s+)?caption(?:\s*(?:\.{3}|…))?)$/i.test(trimmed);
  if (insideEditable && !editableAllow) return; // never touch user content except known placeholders

  // Exact dictionary match
  if (dict[trimmed]) {
    // replace only the trimmed segment to preserve surrounding spaces
    if (!translatedNodes.has(node)) translatedNodes.set(node, raw);
    const zh = dict[trimmed];
    const out = _bilingualMode ? `${zh} (${trimmed})` : zh;
    node.nodeValue = raw.replace(trimmed, out);
    return;
  }

  // Dynamic matchers
  for (const m of dynamicMatchers) {
    if (m.test(raw)) {
      if (!translatedNodes.has(node)) translatedNodes.set(node, raw);
      const replaced = m.replace(raw);
      node.nodeValue = _bilingualMode ? `${replaced} (${raw.trim()})` : replaced;
      return;
    }
  }

  // collect missing english phrases for coverage improvement
  recordMissing(trimmed);
}

function walkAndTranslate(root: Node): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    translateTextNode(n as Text);
  }

  // translate attributes for elements
  if (root instanceof Element || root instanceof DocumentFragment || root instanceof Document) {
    const nodes: Element[] = [];
    if (root instanceof Element) nodes.push(root);
    const iter = (root as any).querySelectorAll ? (root as Element | Document).querySelectorAll('*') : [];
    for (const el of Array.from(iter as NodeListOf<Element>)) nodes.push(el);
    for (const el of nodes) translateAttributes(el);
  }
}

export function mountBlockSuiteZhCN(root?: HTMLElement, options?: { mode?: 'zh' | 'bilingual' }): () => void {
  _bilingualMode = options?.mode === 'bilingual';
  const target = root ?? document.body;

  const observer = new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'childList') {
        r.addedNodes.forEach(n => {
          walkAndTranslate(n);
          // Observe any newly created shadow roots within added nodes
          if (n instanceof Element && n.shadowRoot) {
            observeRoot(n.shadowRoot);
          }
          // Also scan descendants for shadow roots
          if (n instanceof Element) {
            const stack: Element[] = [n];
            while (stack.length) {
              const el = stack.pop()!;
              if (el.shadowRoot) observeRoot(el.shadowRoot);
              for (const child of Array.from(el.children)) {
                stack.push(child as Element);
              }
            }
          }
        });
      } else if (r.type === 'characterData' && r.target) {
        if (r.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(r.target as Text);
        }
      } else if (r.type === 'attributes' && r.target instanceof Element) {
        if (r.attributeName && (attrKeys as readonly string[]).includes(r.attributeName)) {
          translateAttributes(r.target);
        }
      }
    }
  });

  function observeRoot(rootNode: Node) {
    if (observedRoots.has(rootNode)) return;
    observedRoots.add(rootNode);
    try {
      walkAndTranslate(rootNode);
      observer.observe(rootNode, {
        characterData: true,
        childList: true,
        attributes: true,
        subtree: true,
      });
    } catch {
      // swallow
    }
  }

  // Observe document body and any existing shadow roots
  observeRoot(target);
  const allEls = document.querySelectorAll('*');
  allEls.forEach(el => {
    const anyEl = el as any;
    const sr: ShadowRoot | null = anyEl.shadowRoot ?? null;
    if (sr) observeRoot(sr);
  });

  // Patch attachShadow to observe future shadow roots
  if (!originalAttachShadow) {
    originalAttachShadow = Element.prototype.attachShadow;
    try {
      Element.prototype.attachShadow = function (init: ShadowRootInit): ShadowRoot {
        const sr = originalAttachShadow!.call(this, init);
        observeRoot(sr);
        return sr;
      };
    } catch {
      // ignore
    }
  }

  // return unmount function
  return () => {
    observer.disconnect();
    // restore originals
    for (const [textNode, original] of translatedNodes) {
      try {
        if (textNode.nodeValue != null) {
          textNode.nodeValue = original;
        }
      } catch {
        // ignore restoration errors
      }
    }
    translatedNodes.clear();

    // restore attributes
    try {
      // WeakMap is not iterable; we instead scan DOM and restore per element
      const nodes = document.querySelectorAll('*');
      nodes.forEach(el => {
        const m = translatedAttrs.get(el);
        if (!m) return;
        m.forEach((val, key) => {
          try {
            el.setAttribute(key, val);
          } catch {}
        });
      });
    } catch {}
    translatedAttrs = new WeakMap<Element, Map<AttrKey, string>>();
    missingTokens.clear();
    if (missingReportTimer) {
      clearTimeout(missingReportTimer);
      missingReportTimer = null;
    }
    _bilingualMode = false;

    // restore attachShadow
    if (originalAttachShadow) {
      try {
        Element.prototype.attachShadow = originalAttachShadow;
      } catch {
        // ignore
      }
      originalAttachShadow = null;
    }
    observedRoots.clear();
  };
}

function translateAttributes(el: Element): void {
  for (const key of attrKeys) {
    const val = el.getAttribute(key);
    if (!val) continue;
    const trimmed = val.trim();
    if (!trimmed) continue;

    // exact match
    if (dict[trimmed]) {
      const originalMap = translatedAttrs.get(el) ?? new Map<AttrKey, string>();
      if (!originalMap.has(key)) {
        originalMap.set(key, val);
        translatedAttrs.set(el, originalMap);
      }
      const zh = dict[trimmed];
      const out = _bilingualMode ? `${zh} (${trimmed})` : zh;
      const replaced = val.replace(trimmed, out);
      if (replaced !== val) {
        try { el.setAttribute(key, replaced); } catch {}
      }
      continue;
    }

    // dynamic matchers
    let replacedDyn: string | null = null;
    for (const m of dynamicMatchers) {
      if (m.test(val)) { replacedDyn = m.replace(val); break; }
    }
    if (replacedDyn && replacedDyn !== val) {
      const originalMap = translatedAttrs.get(el) ?? new Map<AttrKey, string>();
      if (!originalMap.has(key)) {
        originalMap.set(key, val);
        translatedAttrs.set(el, originalMap);
      }
      try { el.setAttribute(key, _bilingualMode ? `${replacedDyn} (${val.trim()})` : replacedDyn); } catch {}
    } else {
      recordMissing(trimmed);
    }
  }
}