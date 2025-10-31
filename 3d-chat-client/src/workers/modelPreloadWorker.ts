/**
 * 模型预加载 Web Worker
 * 在后台线程中下载模型文件，创建 Blob URL
 */

interface PreloadMessage {
  type: 'start' | 'cancel';
  models?: string[];
}

interface PreloadResponse {
  type: 'progress' | 'complete' | 'error';
  url?: string;
  blobUrl?: string;
  progress?: number;
  error?: string;
}

// 存储已下载的模型
const modelCache = new Map<string, Blob>();

self.onmessage = async (e: MessageEvent<PreloadMessage>) => {
  const { type, models } = e.data;

  if (type === 'start' && models) {
    await preloadModels(models);
  }
};

async function preloadModels(urls: string[]) {
  for (const url of urls) {
    try {
      await downloadModel(url);
    } catch (error) {
      self.postMessage({
        type: 'error',
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as PreloadResponse);
    }
  }
}

async function downloadModel(url: string) {
  try {
    console.log(`[Worker] 开始下载: ${url}`);

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应体');
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      loaded += value.length;

      // 报告进度
      if (total > 0) {
        const progress = (loaded / total) * 100;
        self.postMessage({
          type: 'progress',
          url,
          progress,
        } as PreloadResponse);
      }
    }

    // 合并所有 chunks
    const blob = new Blob(chunks as BlobPart[], { type: 'model/gltf-binary' });
    modelCache.set(url, blob);

    // 创建 Blob URL
    const blobUrl = URL.createObjectURL(blob);

    console.log(`[Worker] 下载完成: ${url} -> ${blobUrl}`);

    // 通知主线程
    self.postMessage({
      type: 'complete',
      url,
      blobUrl,
    } as PreloadResponse);

  } catch (error) {
    console.error(`[Worker] 下载失败: ${url}`, error);
    throw error;
  }
}

export {};
