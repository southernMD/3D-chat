/**
 * FPS监控器类
 * 负责显示和管理帧率信息
 */
export class FPSMonitor {
  private fpsDisplay: HTMLElement;
  private frameCount: number = 0;
  private lastFPSTime: number = 0;
  private currentFPS: number = 0;
  private targetFPS: number = 60;
  private frameInterval: number = 1000 / 60;
  private lastTime: number = 0;

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastFPSTime = performance.now();
    this.lastTime = 0;
    
    this.fpsDisplay = this.createFPSDisplay();
    this.addStyles();
  }

  /**
   * 创建FPS显示元素
   */
  private createFPSDisplay(): HTMLElement {
    const fpsDisplay = document.createElement('div');
    fpsDisplay.id = 'fps-display';
    fpsDisplay.style.position = 'fixed';
    fpsDisplay.style.top = '10px';
    fpsDisplay.style.left = '10px';
    fpsDisplay.style.zIndex = '1000';
    fpsDisplay.style.color = '#00ff00';
    fpsDisplay.style.fontSize = '16px';
    fpsDisplay.style.fontFamily = 'monospace';
    fpsDisplay.style.fontWeight = 'bold';
    fpsDisplay.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
    fpsDisplay.style.pointerEvents = 'none';
    fpsDisplay.style.userSelect = 'none';
    fpsDisplay.textContent = 'FPS: 0';
    
    document.body.appendChild(fpsDisplay);
    return fpsDisplay;
  }

  /**
   * 添加全局样式
   */
  private addStyles(): void {
    // 检查是否已经存在样式
    if (document.getElementById('fps-monitor-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'fps-monitor-styles';
    style.textContent = `
      #fps-display {
        position: fixed !important;
        top: 10px !important;
        left: 10px !important;
        z-index: 1000 !important;
        color: #00ff00 !important;
        font-size: 16px !important;
        font-family: monospace !important;
        font-weight: bold !important;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;
        pointer-events: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 更新FPS显示
   * @param timestamp 当前时间戳
   * @returns 是否应该继续渲染（基于帧率限制）
   */
  public update(timestamp?: number): boolean {
    if (!timestamp) timestamp = performance.now();
    
    // 帧率控制
    const elapsed = timestamp - this.lastTime;
    
    // 如果时间间隔小于目标帧间隔，则跳过此帧
    if (elapsed < this.frameInterval) {
      return false;
    }
    
    // 更新上一帧时间
    this.lastTime = timestamp - (elapsed % this.frameInterval);
    
    // 更新FPS计算
    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFPSTime;
    
    // 每秒更新一次FPS显示
    if (deltaTime >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / deltaTime);
      this.fpsDisplay.textContent = `FPS: ${this.currentFPS}`;
      this.frameCount = 0;
      this.lastFPSTime = currentTime;
    }
    
    return true;
  }

  /**
   * 设置目标FPS
   */
  public setTargetFPS(fps: number): void {
    this.targetFPS = fps;
    this.frameInterval = 1000 / this.targetFPS;
    console.log(`目标FPS已设置为: ${this.targetFPS}, 帧间隔: ${this.frameInterval.toFixed(2)}ms`);
  }

  /**
   * 获取当前FPS
   */
  public getCurrentFPS(): number {
    return this.currentFPS;
  }

  /**
   * 获取目标FPS
   */
  public getTargetFPS(): number {
    return this.targetFPS;
  }

  /**
   * 显示FPS监控器
   */
  public show(): void {
    this.fpsDisplay.style.display = 'block';
  }

  /**
   * 隐藏FPS监控器
   */
  public hide(): void {
    this.fpsDisplay.style.display = 'none';
  }

  /**
   * 切换FPS监控器显示状态
   */
  public toggle(): void {
    if (this.fpsDisplay.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * 设置FPS显示位置
   */
  public setPosition(top: string, left: string): void {
    this.fpsDisplay.style.top = top;
    this.fpsDisplay.style.left = left;
  }

  /**
   * 设置FPS显示样式
   */
  public setStyle(styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(this.fpsDisplay.style, styles);
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    // 移除FPS显示元素
    if (this.fpsDisplay && this.fpsDisplay.parentNode) {
      this.fpsDisplay.parentNode.removeChild(this.fpsDisplay);
    }

    // 移除样式
    const styleElement = document.getElementById('fps-monitor-styles');
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
  }

  /**
   * 获取FPS统计信息
   */
  public getStats(): {
    currentFPS: number;
    targetFPS: number;
    frameInterval: number;
    frameCount: number;
  } {
    return {
      currentFPS: this.currentFPS,
      targetFPS: this.targetFPS,
      frameInterval: this.frameInterval,
      frameCount: this.frameCount
    };
  }
}
