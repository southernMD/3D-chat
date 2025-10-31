import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * 模型加载器管理器 - 单例模式
 * 提供优化的GLTF加载器，支持Draco压缩和加载进度
 */
export class ModelLoaderManager {
    private static instance: ModelLoaderManager;
    private gltfLoader: GLTFLoader;
    private dracoLoader: DRACOLoader;

    private constructor() {
        // 初始化 Draco 解码器
        this.dracoLoader = new DRACOLoader();
        // 设置 Draco 解码器路径（使用 CDN）
        this.dracoLoader.setDecoderPath('/draco/');
        // 设置解码器配置
        this.dracoLoader.setDecoderConfig({ type: 'js' });
        // 预加载解码器
        this.dracoLoader.preload();

        // 初始化 GLTF 加载器
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);

        console.log('✅ ModelLoaderManager 初始化完成，Draco 支持已启用');
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): ModelLoaderManager {
        if (!ModelLoaderManager.instance) {
            ModelLoaderManager.instance = new ModelLoaderManager();
        }
        return ModelLoaderManager.instance;
    }

    /**
     * 获取优化的 GLTF 加载器
     */
    public getGLTFLoader(): GLTFLoader {
        return this.gltfLoader;
    }

    /**
     * 加载模型（带进度回调）
     */
    public async loadModel(
        url: string,
        onProgress?: (progress: number) => void
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                url,
                (gltf) => {
                    if (onProgress) onProgress(100);
                    resolve(gltf);
                },
                (xhr) => {
                    if (onProgress && xhr.lengthComputable) {
                        const percentComplete = (xhr.loaded / xhr.total) * 100;
                        onProgress(percentComplete);
                    }
                },
                (error) => {
                    console.error(`❌ 模型加载失败: ${url}`, error);
                    reject(error);
                }
            );
        });
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        if (this.dracoLoader) {
            this.dracoLoader.dispose();
        }
        console.log('✅ ModelLoaderManager 资源已清理');
    }
}

// 导出单例实例
export const modelLoaderManager = ModelLoaderManager.getInstance();
