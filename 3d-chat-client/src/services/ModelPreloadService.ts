/**
 * 模型预加载服务
 * 使用 Web Worker 在后台下载模型，创建本地 Blob URL
 */

interface ModelPreloadStatus {
  url: string;
  blobUrl: string | null;
  progress: number;
  status: 'pending' | 'loading' | 'ready' | 'error';
  error?: string;
}

interface PendingRequest {
  url: string;
  resolve: (blobUrl: string) => void;
  reject: (error: Error) => void;
}

class ModelPreloadService {
  private static instance: ModelPreloadService;
  private worker: Worker | null = null;
  private modelStatus = new Map<string, ModelPreloadStatus>();
  private pendingRequests = new Map<string, PendingRequest[]>();
  private isPreloading = false;

  // 需要预加载的模型列表
  private readonly PRELOAD_MODELS = [
    '/model/egg/eggDraco.glb',
    '/model/egg/egg_brokenDraco.glb',
    '/model/tree/treeDraco.glb',
    '/model/wall/graveyard_fenceDraco.glb',
    '/model/building/schoolBuild1Draco.glb',
    '/model/outdoorGym/OnePullUpBarDraco.glb',
    '/model/outdoorGym/OutdoorGymDraco.glb',
  ];

  private constructor() {
    this.initWorker();
  }

  public static getInstance(): ModelPreloadService {
    if (!ModelPreloadService.instance) {
      ModelPreloadService.instance = new ModelPreloadService();
    }
    return ModelPreloadService.instance;
  }

  /**
   * 初始化 Web Worker
   */
  private initWorker() {
    try {
      // 创建 Worker
      this.worker = new Worker(
        new URL('../workers/modelPreloadWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (error) => {
        console.error('❌ Worker 错误:', error);
      };

      console.log('✅ 模型预加载 Worker 初始化完成');
    } catch (error) {
      console.error('❌ Worker 初始化失败:', error);
    }
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(data: any) {
    const { type, url, blobUrl, progress, error } = data;

    switch (type) {
      case 'progress':
        this.updateProgress(url, progress);
        break;

      case 'complete':
        this.markAsReady(url, blobUrl);
        break;

      case 'error':
        this.markAsError(url, error);
        break;
    }
  }

  /**
   * 更新进度
   */
  private updateProgress(url: string, progress: number) {
    const status = this.modelStatus.get(url);
    if (status) {
      status.progress = progress;
      status.status = 'loading';
      console.log(`📊 ${url}: ${progress.toFixed(1)}%`);
    }
  }

  /**
   * 标记为就绪
   */
  private markAsReady(url: string, blobUrl: string) {
    const status = this.modelStatus.get(url);
    if (status) {
      status.blobUrl = blobUrl;
      status.progress = 100;
      status.status = 'ready';
      console.log(`✅ ${url} 预加载完成 -> ${blobUrl}`);

      // 解决所有等待的请求
      this.resolvePendingRequests(url, blobUrl);
    }
  }

  /**
   * 标记为错误
   */
  private markAsError(url: string, error: string) {
    const status = this.modelStatus.get(url);
    if (status) {
      status.status = 'error';
      status.error = error;
      console.error(`❌ ${url} 预加载失败:`, error);

      // 拒绝所有等待的请求
      this.rejectPendingRequests(url, new Error(error));
    }
  }

  /**
   * 解决等待的请求
   */
  private resolvePendingRequests(url: string, blobUrl: string) {
    const requests = this.pendingRequests.get(url);
    if (requests) {
      requests.forEach(req => req.resolve(blobUrl));
      this.pendingRequests.delete(url);
    }
  }

  /**
   * 拒绝等待的请求
   */
  private rejectPendingRequests(url: string, error: Error) {
    const requests = this.pendingRequests.get(url);
    if (requests) {
      requests.forEach(req => req.reject(error));
      this.pendingRequests.delete(url);
    }
  }

  /**
   * 开始预加载所有模型
   * 在用户进入网页时调用
   */
  public startPreloading() {
    if (this.isPreloading) {
      console.log('⏳ 预加载已在进行中');
      return;
    }

    if (!this.worker) {
      console.error('❌ Worker 未初始化');
      return;
    }

    console.log('🚀 开始后台预加载模型...');
    this.isPreloading = true;

    // 初始化所有模型状态
    this.PRELOAD_MODELS.forEach(url => {
      this.modelStatus.set(url, {
        url,
        blobUrl: null,
        progress: 0,
        status: 'pending',
      });
    });

    // 发送预加载请求到 Worker
    this.worker.postMessage({
      type: 'start',
      models: this.PRELOAD_MODELS,
    });
  }

  /**
   * 获取模型的本地 URL
   * 如果模型已预加载，立即返回 Blob URL
   * 如果正在加载，等待加载完成
   * 如果未开始加载，返回原始 URL
   */
  public async getModelUrl(url: string): Promise<string> {
    const status = this.modelStatus.get(url);

    // 情况1: 已经预加载完成，直接返回 Blob URL
    if (status?.status === 'ready' && status.blobUrl) {
      console.log(`⚡ 使用预加载的本地链接: ${url}`);
      return status.blobUrl;
    }

    // 情况2: 正在加载中，挂起等待
    if (status?.status === 'loading' || status?.status === 'pending') {
      console.log(`⏳ 等待预加载完成: ${url}`);
      return this.waitForPreload(url);
    }

    // 情况3: 加载失败或未开始，返回原始 URL
    console.log(`⚠️  使用原始 URL: ${url}`);
    return url;
  }

  /**
   * 等待预加载完成
   */
  private waitForPreload(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // 添加到等待队列
      if (!this.pendingRequests.has(url)) {
        this.pendingRequests.set(url, []);
      }

      this.pendingRequests.get(url)!.push({
        url,
        resolve,
        reject,
      });

      // 设置超时（60秒）
      setTimeout(() => {
        const requests = this.pendingRequests.get(url);
        if (requests) {
          const index = requests.findIndex(r => r.resolve === resolve);
          if (index !== -1) {
            requests.splice(index, 1);
            console.warn(`⏱️  ${url} 预加载超时，使用原始 URL`);
            resolve(url); // 超时后使用原始 URL
          }
        }
      }, 60000);
    });
  }

  /**
   * 检查模型是否已预加载
   */
  public isModelReady(url: string): boolean {
    const status = this.modelStatus.get(url);
    return status?.status === 'ready' && !!status.blobUrl;
  }

  /**
   * 获取预加载进度
   */
  public getProgress(): { loaded: number; total: number; percentage: number } {
    const total = this.modelStatus.size;
    const loaded = Array.from(this.modelStatus.values()).filter(
      s => s.status === 'ready'
    ).length;
    const percentage = total > 0 ? (loaded / total) * 100 : 0;

    return { loaded, total, percentage };
  }

  /**
   * 获取所有模型状态
   */
  public getAllStatus(): ModelPreloadStatus[] {
    return Array.from(this.modelStatus.values());
  }

  /**
   * 清理资源
   */
  public dispose() {
    // 释放所有 Blob URL
    this.modelStatus.forEach(status => {
      if (status.blobUrl) {
        URL.revokeObjectURL(status.blobUrl);
      }
    });

    this.modelStatus.clear();
    this.pendingRequests.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    console.log('🗑️  预加载服务已清理');
  }
}

// 导出单例
export const modelPreloadService = ModelPreloadService.getInstance();
