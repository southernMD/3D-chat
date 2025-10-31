import * as THREE from 'three';
import { BaseModel } from "./BaseModel";
import type { InitialTransform } from "./BaseModel";
import { modelLoaderManager } from '@/loaders/ModelLoaderManager';
import { loadingProgress } from '@/utils/LoadingProgress';


export class SchoolBuilding extends BaseModel {
    public buildingObject: THREE.Object3D | null = null;
    public buildingScale: number = 25;

    constructor(
        scene: THREE.Scene,
        initialTransform?: InitialTransform
    ) {
        super(scene, initialTransform as InitialTransform);
    }


    /**
     * 实现 BaseModel 的抽象方法
     */
    async create(): Promise<void> {
       return await this.load();
    }

    async load(): Promise<void> {
        console.log('📁 开始加载学校建筑模型文件...');
        const modelName = '学校建筑';

        try {
            loadingProgress.startLoading(modelName);
            
            const gltf = await modelLoaderManager.loadModel(
                '/model/building/schoolBuild1Draco.glb',
                (progress) => {
                    loadingProgress.updateProgress(modelName, progress);
                    console.log(`${modelName}加载进度: ${progress.toFixed(1)}%`);
                }
            );
            
            loadingProgress.finishLoading(modelName);
            console.log('✅ 学校建筑模型文件加载成功');
            console.log('🔍 开始提取学校建筑模型...');

            if (gltf.scene) {
                this.buildingObject = gltf.scene.clone();
                this.buildingObject!.name = 'SchoolBuilding';
                this.buildingObject!.scale.setScalar(this.buildingScale);

                // 查找并填充门对象
                // this.buildingObject.children = this.buildingObject.children.filter(child => !doors.includes(child.name));
                this.modelGroup.add(this.buildingObject!);
                this.addToScene();
                console.log('✅ 学校建筑模型加载完成');
            }

        } catch (error) {
            loadingProgress.finishLoading(modelName);
            console.error('❌ 学校建筑模型加载失败:', error);
        }
    }

    public dispose(): void {
        // 清理建筑对象
        if (this.buildingObject) {
            this.buildingObject.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.modelGroup.remove(this.buildingObject);
            this.buildingObject = null;
        }

        super.dispose();
    }
}
