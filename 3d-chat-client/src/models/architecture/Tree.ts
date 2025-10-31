import * as THREE from "three";
import { BaseModel } from "./BaseModel";
import type { InitialTransform } from "./BaseModel";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { modelLoaderManager } from '@/loaders/ModelLoaderManager';
import { loadingProgress } from '@/utils/LoadingProgress';
export class Tree extends BaseModel {
    public treeObject: THREE.Object3D | null = null;
    private static treeModel: GLTF | null = null;

    constructor(scene: THREE.Scene, initialTransform?: InitialTransform, name: string = 'tree') {
        super(scene, initialTransform as InitialTransform, name);
    }

    /**
     * 实现 BaseModel 的抽象方法
     */
    async create(): Promise<void> {
        await this.load();
    }

    async load(): Promise<void> {
        const modelName = '树模型';
        
        try {
            if(!Tree.treeModel){
                loadingProgress.startLoading(modelName);
                
                try {
                    Tree.treeModel = await modelLoaderManager.loadModel(
                        '/model/tree/treeDraco.glb',
                        (progress) => {
                            loadingProgress.updateProgress(modelName, progress);
                            console.log(`${modelName}加载进度: ${progress.toFixed(1)}%`);
                        }
                    ) as GLTF;
                    
                    loadingProgress.finishLoading(modelName);
                    console.log('✅ 树模型文件加载成功');
                } catch (err) {
                    loadingProgress.finishLoading(modelName);
                    console.error('❌ 树模型文件加载失败，使用简单盒模型替代:', err);
                    this.createSimpleTreeModel();
                    return;
                }
            }
            
            console.log('开始提取树模型...');
            this.treeObject = Tree.treeModel.scene.clone();
            this.treeObject.name = `tree-${this.name}`;
            this.treeObject.scale.setScalar(0.5);
            this.modelGroup.add(this.treeObject);
            console.log('✅ 树模型加载完成');
        } catch (error) {
            console.error('❌ 树模型加载失败，使用简单模型:', error);
            this.createSimpleTreeModel();
        }
    }

    /**
     * 创建简单的树模型（盒模型）
     */
    private createSimpleTreeModel(): void {
        console.log('🌳 创建简单树模型...');

        // 创建树干
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 8, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // 棕色
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        trunk.receiveShadow = true;

        // 创建树冠
        const crownGeometry = new THREE.SphereGeometry(4, 8, 6);
        const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // 绿色
        const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.y = 10;
        crown.castShadow = true;
        crown.receiveShadow = true;

        // 创建树的组合对象
        this.treeObject = new THREE.Group();
        this.treeObject.add(trunk);
        this.treeObject.add(crown);
        this.treeObject.name = `tree-${this.name}`;

        // 添加到模型组
        this.modelGroup.add(this.treeObject);

        // 添加模型组到场景
        this.scene.add(this.modelGroup);

        console.log('✅ 简单树模型创建完成');
    }

    /**
     * 设置物理碰撞（简单盒模型）
     */
    // private setupPhysics(): void {
    //     if (!this.treeObject) return;

    //     // 创建简单的盒模型碰撞体
    //     const boxGeometry = new THREE.BoxGeometry(8, 12, 8); // 宽8，高12，深8
    //     const boxMaterial = new THREE.MeshBasicMaterial({
    //         color: 0x00ff00,
    //         transparent: true,
    //         opacity: 0.3,
    //         wireframe: true
    //     });

    //     const collisionBox = new THREE.Mesh(boxGeometry, boxMaterial);
    //     collisionBox.position.copy(this.treeObject.position);
    //     collisionBox.position.y += 6; // 调整到树的中心高度
    //     collisionBox.name = `tree-collision-${this.name}`;
    //     collisionBox.visible = false; // 默认隐藏碰撞盒

    //     // 添加到场景（用于调试）
    //     this.scene.add(collisionBox);

    //     // 存储碰撞盒引用
    //     this.treeObject.userData.collisionBox = collisionBox;

    //     console.log(`✅ 树 ${this.name} 的物理碰撞盒设置完成`);
    // }

    /**
     * 获取碰撞盒（用于BVH物理系统）
     */
    public getCollisionMesh(): THREE.Mesh | null {
        if (this.treeObject && this.treeObject.userData.collisionBox) {
            return this.treeObject.userData.collisionBox as THREE.Mesh;
        }
        return null;
    }

    /**
     * 切换碰撞盒可见性
     */
    public toggleCollisionBoxVisibility(visible: boolean): void {
        const collisionBox = this.getCollisionMesh();
        if (collisionBox) {
            collisionBox.visible = visible;
        }
    }

    /**
     * 销毁树对象
     */
    public dispose(): void {
        if (this.treeObject) {
            // 移除碰撞盒
            const collisionBox = this.getCollisionMesh();
            if (collisionBox) {
                this.scene.remove(collisionBox);
                if (collisionBox.geometry) collisionBox.geometry.dispose();
                if (collisionBox.material instanceof THREE.Material) {
                    collisionBox.material.dispose();
                }
            }

            // 移除树对象
            this.scene.remove(this.treeObject);

            // 清理几何体和材质
            this.treeObject.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });

            this.treeObject = null;
        }
        super.dispose();
    }

    /**
     * 清理静态模型缓存
     */
    static disposeStaticModels(): void {
        console.log('🗑️ 开始清理树模型静态缓存...');

        if (Tree.treeModel) {
            // 深度清理静态树模型
            Tree.deepDisposeGLTF(Tree.treeModel);
            Tree.treeModel = null;
            console.log('✅ 静态树模型已清理');
        }

        console.log('✅ 树模型静态缓存清理完成');
    }

    /**
     * 深度清理GLTF模型
     */
    private static deepDisposeGLTF(gltf: GLTF): void {
        if (gltf.scene) {
            Tree.deepDisposeObject3D(gltf.scene);
        }

    }

    /**
     * 深度清理Three.js对象
     */
    private static deepDisposeObject3D(obj: THREE.Object3D): void {
        obj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) Tree.deepDisposeMaterial(child.material);
            }

            if (child instanceof THREE.SkinnedMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) Tree.deepDisposeMaterial(child.material);
                if (child.skeleton && child.skeleton.boneTexture) {
                    child.skeleton.boneTexture.dispose();
                }
            }
        });

        obj.clear();
    }

    /**
     * 深度清理材质和纹理
     */
    private static deepDisposeMaterial(material: THREE.Material | THREE.Material[]): void {
        const materials = Array.isArray(material) ? material : [material];

        materials.forEach((mat) => {
            const textureProperties = [
                'map', 'normalMap', 'roughnessMap', 'metalnessMap',
                'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap',
                'alphaMap', 'lightMap', 'envMap', 'specularMap',
                'gradientMap', 'matcap', 'clearcoatMap', 'clearcoatNormalMap',
                'clearcoatRoughnessMap', 'transmissionMap', 'thicknessMap',
                'sheenColorMap', 'sheenRoughnessMap', 'iridescenceMap',
                'iridescenceThicknessMap'
            ];

            textureProperties.forEach(prop => {
                const texture = (mat as any)[prop];
                if (texture && texture.dispose) {
                    texture.dispose();
                }
            });

            mat.dispose();
        });
    }

}
