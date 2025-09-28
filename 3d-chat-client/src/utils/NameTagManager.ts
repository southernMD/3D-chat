import * as THREE from 'three';

/**
 * 昵称标签管理器
 * 使用HTML/CSS + 投影坐标的方式在3D模型头顶显示昵称
 */
export class NameTagManager {
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private nameTags: Map<string, HTMLElement> = new Map();
  private modelPositions: Map<string, THREE.Vector3> = new Map();
  private modelHeights: Map<string, number> = new Map();
  private isFirstPerson: boolean = false; // 是否为第一人称视角
  private currentUserId: string = 'player'; // 当前用户的模型ID

  // 配置选项
  private options = {
    minScale: 0.4,        // 最小缩放比例
    maxScale: 1.2,        // 最大缩放比例
    alwaysVisible: true,  // 始终可见
    fadeWithDistance: false // 不随距离淡化
  };

  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer, container: HTMLElement) {
    this.camera = camera;
    this.renderer = renderer;
    this.container = container;
    this.createNameTagContainer();
  }

  /**
   * 创建昵称标签容器
   */
  private createNameTagContainer(): void {
    // 检查是否已存在容器
    let nameTagContainer = document.getElementById('name-tag-container');
    if (!nameTagContainer) {
      nameTagContainer = document.createElement('div');
      nameTagContainer.id = 'name-tag-container';
      nameTagContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
      `;
      this.container.appendChild(nameTagContainer);
    }
  }

  /**
   * 添加或更新昵称标签
   */
  addNameTag(modelId: string, nickname: string, position: THREE.Vector3, modelHeight: number = 20): void {
    this.modelPositions.set(modelId, position.clone());
    this.modelHeights.set(modelId, modelHeight);

    let nameTag = this.nameTags.get(modelId);
    if (!nameTag) {
      nameTag = this.createNameTagElement(nickname);
      this.nameTags.set(modelId, nameTag);
      
      const container = document.getElementById('name-tag-container');
      if (container) {
        container.appendChild(nameTag);
      }
    } else {
      // 更新昵称内容
      const textElement = nameTag.querySelector('.name-tag-text');
      if (textElement) {
        textElement.textContent = nickname;
      }
    }

    this.updateNameTagPosition(modelId);
  }

  /**
   * 创建昵称标签HTML元素
   */
  private createNameTagElement(nickname: string): HTMLElement {
    const nameTag = document.createElement('div');
    nameTag.className = 'name-tag';
    nameTag.style.cssText = `
      position: absolute;
      transform: translate(-50%, -100%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      transition: opacity 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const textElement = document.createElement('span');
    textElement.className = 'name-tag-text';
    textElement.textContent = nickname;
    nameTag.appendChild(textElement);

    return nameTag;
  }

  /**
   * 更新指定模型的昵称标签位置
   */
  updateNameTagPosition(modelId: string): void {
    const nameTag = this.nameTags.get(modelId);
    const position = this.modelPositions.get(modelId);
    const modelHeight = this.modelHeights.get(modelId) || 20;

    if (!nameTag || !position) return;

    // 如果是第一人称视角且是当前用户，隐藏标签
    if (this.isFirstPerson && modelId === this.currentUserId) {
      nameTag.style.display = 'none';
      return;
    }

    // 计算头顶位置（在模型高度基础上再向上偏移一些）
    const headPosition = position.clone();
    headPosition.y += modelHeight + 5; // 额外向上偏移5个单位

    // 将3D坐标投影到屏幕坐标
    const screenPosition = this.worldToScreen(headPosition);

    // 检查是否在相机视野内
    if (screenPosition.z > 1) {
      nameTag.style.display = 'none';
      return;
    }

    // 更新标签位置
    nameTag.style.display = 'block';
    nameTag.style.left = `${screenPosition.x}px`;
    nameTag.style.top = `${screenPosition.y}px`;

    // 根据距离调整大小和样式（但始终保持可见）
    const distance = this.camera.position.distanceTo(position);
    const veryDistantThreshold = 150;
    const distantThreshold = 80;
    const nearThreshold = 30;

    let opacity = 1; // 始终保持完全可见
    let scale = 1;

    // 移除之前的距离相关类
    nameTag.classList.remove('distant', 'very-distant', 'fade-in');

    // 根据距离调整大小和样式，但不影响可见性
    if (distance > veryDistantThreshold) {
      scale = 0.6; // 很远时缩小
      nameTag.classList.add('very-distant');
    } else if (distance > distantThreshold) {
      scale = 0.8; // 远时稍微缩小
      nameTag.classList.add('distant');
    } else if (distance > nearThreshold) {
      scale = 0.9; // 中等距离稍微缩小
    } else {
      scale = 1.0; // 近距离正常大小
    }

    // 添加淡入动画
    nameTag.classList.add('fade-in');

    nameTag.style.opacity = opacity.toString();
    nameTag.style.transform = `translate(-50%, -100%) scale(${scale})`;
  }

  /**
   * 将世界坐标转换为屏幕坐标
   */
  private worldToScreen(worldPosition: THREE.Vector3): THREE.Vector3 {
    const vector = worldPosition.clone();
    vector.project(this.camera);

    const canvas = this.renderer.domElement;
    const widthHalf = canvas.clientWidth / 2;
    const heightHalf = canvas.clientHeight / 2;

    vector.x = (vector.x * widthHalf) + widthHalf;
    vector.y = -(vector.y * heightHalf) + heightHalf;

    return vector;
  }

  /**
   * 更新所有昵称标签位置
   */
  updateAllNameTags(): void {
    for (const modelId of this.nameTags.keys()) {
      this.updateNameTagPosition(modelId);
    }
  }

  /**
   * 移除昵称标签
   */
  removeNameTag(modelId: string): void {
    const nameTag = this.nameTags.get(modelId);
    if (nameTag) {
      nameTag.remove();
      this.nameTags.delete(modelId);
    }
    this.modelPositions.delete(modelId);
    this.modelHeights.delete(modelId);
  }

  /**
   * 更新模型位置
   */
  updateModelPosition(modelId: string, position: THREE.Vector3): void {
    this.modelPositions.set(modelId, position.clone());
    this.updateNameTagPosition(modelId);
  }

  /**
   * 清理所有昵称标签
   */
  dispose(): void {
    for (const nameTag of this.nameTags.values()) {
      nameTag.remove();
    }
    this.nameTags.clear();
    this.modelPositions.clear();
    this.modelHeights.clear();

    const container = document.getElementById('name-tag-container');
    if (container) {
      container.remove();
    }
  }

  /**
   * 设置昵称标签可见性
   */
  setVisible(modelId: string, visible: boolean): void {
    const nameTag = this.nameTags.get(modelId);
    if (nameTag) {
      nameTag.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * 设置所有昵称标签可见性
   */
  setAllVisible(visible: boolean): void {
    for (const nameTag of this.nameTags.values()) {
      nameTag.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * 更新相机引用（用于视角切换）
   */
  updateCamera(camera: THREE.Camera): void {
    this.camera = camera;
    // 更新所有标签位置
    this.updateAllNameTags();
  }

  /**
   * 设置视角模式
   */
  setFirstPersonMode(isFirstPerson: boolean): void {
    this.isFirstPerson = isFirstPerson;
    console.log(`🏷️ 昵称标签管理器切换到${isFirstPerson ? '第一人称' : '第三人称'}视角`);
    // 立即更新所有标签的显示状态
    this.updateAllNameTags();
  }

  /**
   * 设置当前用户ID
   */
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }
}
