import { AffineSchemas } from '@blocksuite/blocks';
import { AffineEditorContainer } from '@blocksuite/presets';
import '@blocksuite/presets/themes/affine.css';
import { nanoid, Schema } from '@blocksuite/store';
import { DocCollection } from '@blocksuite/store';
import { CollaborationServerProvider } from './provider';
import { mountBlockSuiteZhCN } from './i18n/blocksuite-zhCN';
import { enableLinearDragReorder } from './drag-reorder';
import { enableCodeBlockEnterFix } from './codeblock-enter-fix';
import * as Y from 'yjs';

const schema = new Schema().register(AffineSchemas);
const collection = new DocCollection({
  schema,
});
collection.start();
collection.meta.initialize();
let doc = collection.createDoc({ id: '11' });
// 仅在初始化时加载一次文档，避免重复加载导致事件处理器混乱
doc.load();

let providerInstance: CollaborationServerProvider | null = null;
let editorInstance: AffineEditorContainer | null = null;
let connecting = false;
let currentDocumentId: number | null = null; // 由后端创建的 Document ID

const API_BASE = 'http://localhost:8080';

function getBearerToken(): string | null {
  // 优先从常见存储位置读取；与管理后台保持尽可能一致，但不破坏生产安全
  const keys = [
    'auth.token',
    'accessToken',
    'access_token',
    'jwt',
    'token',
    'cms.token',
  ];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  // 从全局窗口暴露（如管理后台在 window 注入）
  const w = window as unknown as any;
  const winToken = w?.__AUTH__?.token || w?.auth?.token || null;
  return winToken || null;
}

async function authFetch(url: string, init: RequestInit = {}) {
  const token = getBearerToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, {
    ...init,
    headers,
  });
}

// i18n: language toggle
let unmountI18n: (() => void) | null = null;
let currentLang: 'zh-CN' | 'zh-CN-bilingual' | 'en-US' | null = null;
const langSelect = document.getElementById('lang') as HTMLSelectElement | null;
const initialLang = (localStorage.getItem('lang') as 'zh-CN' | 'zh-CN-bilingual' | 'en-US') || 'zh-CN';
if (langSelect) langSelect.value = initialLang;
document.documentElement.setAttribute('data-lang', initialLang);

function applyLanguage(lang: 'zh-CN' | 'zh-CN-bilingual' | 'en-US') {
  if (currentLang === lang) return;
  document.documentElement.setAttribute('data-lang', lang);
  localStorage.setItem('lang', lang);

  // Always teardown previous overlay when language mode changes
  if (unmountI18n) {
    unmountI18n();
    unmountI18n = null;
  }

  if (lang === 'zh-CN' || lang === 'zh-CN-bilingual') {
    const mode = lang === 'zh-CN-bilingual' ? 'bilingual' : 'zh';
    unmountI18n = mountBlockSuiteZhCN(document.body as unknown as HTMLElement, { mode });
  }

  currentLang = lang;
}

applyLanguage(initialLang);
langSelect?.addEventListener('change', () => {
  const lang = (langSelect!.value as 'zh-CN' | 'zh-CN-bilingual' | 'en-US');
  applyLanguage(lang);
});

async function connect() {
  const nameInput = (document.querySelector('#name') as HTMLInputElement)!;
  if (!nameInput.value) {
    nameInput.value = nanoid();
  }

  // 防抖：避免并发点击 connect 触发重复连接
  if (connecting) return;
  connecting = true;

  // 清理旧的 provider，保持单一连接实例，避免重复事件注册/卸载
  if (providerInstance) {
    try {
      providerInstance.cleanup();
    } catch (e) {
      // ignore cleanup errors
    }
    providerInstance = null;
  }

  const provider = new CollaborationServerProvider(
    doc.id,
    doc.spaceDoc,
    doc.awarenessStore.awareness,
    getBearerToken() || 'token',
    {
      id: nanoid(),
      name:
        (document.querySelector('#name') as HTMLInputElement)!.value ||
        nanoid(),
    }
  );

  try {
    // 等待与协作服务完成同步，避免初次渲染时 doc 未就绪导致空引用
    await provider.whenReady;
    providerInstance = provider;

    // 只创建一个编辑器实例，避免反复创建/销毁触发 Yjs 事件卸载告警
    if (!editorInstance) {
      editorInstance = new AffineEditorContainer();
      editorInstance.doc = doc;
      document.body.append(editorInstance);
      // 覆盖层已在 applyLanguage 中基于语言状态挂载到 body
      // 启用线性文档的 Block 上下拖拽重排（仅影响同层级）
      enableLinearDragReorder(editorInstance as unknown as HTMLElement, doc.spaceDoc);
      // 仅在代码块内修复 Enter 键换行（不影响其他区域）
      enableCodeBlockEnterFix(editorInstance as unknown as HTMLElement);
    } else {
      // 若已有编辑器实例，更新其绑定的 doc（用于“新建”后重连）
      editorInstance.doc = doc;
    }
  } finally {
    connecting = false;
  }
}

const createBtn = document.getElementById('connect') as HTMLButtonElement;
createBtn.onclick = () => connect();

// 新建：后端创建 Document，并以其ID作为协同文档标识重新连接
const newBtn = document.getElementById('btn-new') as HTMLButtonElement | null;
newBtn!.onclick = async () => {
  try {
    const title = `协同文档-${new Date().toLocaleString()}`;
    const resp = await authFetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content: '',
        isPublic: false,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      alert(`新建失败：${resp.status} ${txt}`);
      return;
    }
    const data = await resp.json();
    currentDocumentId = Number(data.id);

    // 为新建文档创建新的 Yjs Doc，并以后端文档ID作为协同标识
    const newDocId = String(currentDocumentId);
    const newDoc = collection.createDoc({ id: newDocId });
    newDoc.load();
    doc = newDoc;

    // 重新连接协作服务到新Doc
    await connect();
    alert(`新建成功，文档ID：${currentDocumentId}`);
  } catch (e: any) {
    alert(`新建异常：${e?.message || e}`);
  }
};

// 保存：将当前Yjs状态编码为二进制，上传到后端Yjs快照接口
const saveBtn = document.getElementById('btn-save') as HTMLButtonElement | null;
saveBtn!.onclick = async () => {
  try {
    if (!currentDocumentId) {
      alert('请先“新建”文档，再执行保存。');
      return;
    }
    // 编码当前Yjs文档状态
    const update = Y.encodeStateAsUpdate(doc.spaceDoc as unknown as Y.Doc);
    // 将 Uint8Array 拷贝到全新的 ArrayBuffer，确保类型为原生 ArrayBuffer
    const ab = new ArrayBuffer(update.byteLength);
    new Uint8Array(ab).set(update);
    const blob = new Blob([ab], { type: 'application/octet-stream' });
    const version = `v${Date.now()}`;
    const resp = await authFetch(
      `${API_BASE}/api/documents/${currentDocumentId}/yjs/snapshots?version=${encodeURIComponent(version)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: blob,
      }
    );
    if (!resp.ok) {
      const txt = await resp.text();
      alert(`保存失败：${resp.status} ${txt}`);
      return;
    }
    const data = await resp.json();
    alert(`保存成功，版本：${data.version}，大小：${data.size}`);
  } catch (e: any) {
    alert(`保存异常：${e?.message || e}`);
  }
};

// 提交：调用后端发布接口（可按流程替换为“提交审批”）
const submitBtn = document.getElementById('btn-submit') as HTMLButtonElement | null;
submitBtn!.onclick = async () => {
  try {
    if (!currentDocumentId) {
      alert('请先“新建”文档，再执行提交。');
      return;
    }
    const resp = await authFetch(
      `${API_BASE}/api/documents/${currentDocumentId}/publish`,
      {
        method: 'PUT',
      }
    );
    if (!resp.ok) {
      const txt = await resp.text();
      alert(`提交失败：${resp.status} ${txt}`);
      return;
    }
    const data = await resp.json();
    alert(`提交成功，当前状态：${data.status}`);
  } catch (e: any) {
    alert(`提交异常：${e?.message || e}`);
  }
};
