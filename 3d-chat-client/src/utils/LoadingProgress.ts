/**
 * 加载进度管理器
 * 用于跟踪和显示模型加载进度
 */
export class LoadingProgress {
    private loadingItems: Map<string, number> = new Map();
    private onProgressCallback?: (overall: number, details: Map<string, number>) => void;

    /**
     * 设置进度回调
     */
    public setProgressCallback(callback: (overall: number, details: Map<string, number>) => void): void {
        this.onProgressCallback = callback;
    }

    /**
     * 开始跟踪一个加载项
     */
    public startLoading(itemName: string): void {
        this.loadingItems.set(itemName, 0);
        this.notifyProgress();
    }

    /**
     * 更新加载项进度
     */
    public updateProgress(itemName: string, progress: number): void {
        this.loadingItems.set(itemName, Math.min(100, Math.max(0, progress)));
        this.notifyProgress();
    }

    /**
     * 完成加载项
     */
    public finishLoading(itemName: string): void {
        this.loadingItems.set(itemName, 100);
        this.notifyProgress();
        
        // 延迟移除，让用户看到100%
        setTimeout(() => {
            this.loadingItems.delete(itemName);
            this.notifyProgress();
        }, 500);
    }

    /**
     * 获取总体进度
     */
    public getOverallProgress(): number {
        if (this.loadingItems.size === 0) return 100;
        
        let total = 0;
        this.loadingItems.forEach(progress => {
            total += progress;
        });
        
        return total / this.loadingItems.size;
    }

    /**
     * 获取所有加载项详情
     */
    public getDetails(): Map<string, number> {
        return new Map(this.loadingItems);
    }

    /**
     * 检查是否正在加载
     */
    public isLoading(): boolean {
        return this.loadingItems.size > 0;
    }

    /**
     * 通知进度更新
     */
    private notifyProgress(): void {
        if (this.onProgressCallback) {
            this.onProgressCallback(this.getOverallProgress(), this.getDetails());
        }
    }

    /**
     * 清空所有加载项
     */
    public clear(): void {
        this.loadingItems.clear();
        this.notifyProgress();
    }
}

// 导出单例实例
export const loadingProgress = new LoadingProgress();
