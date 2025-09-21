import path from 'path'
import fs from 'fs'
import JSZip from 'jszip'
import { AppDataSource } from '../config/database'
import { StaticResourcePath } from '../entities/StaticResourcePath'

export interface FileUploadResult {
  success: boolean
  message: string
  extractPath?: string
  folderName?: string
  files?: string[]
  originalName?: string
  filePath?: string
  fileSize?: number
  fileType?: string
  error?: string
}

export interface ZipValidationResult {
  valid: boolean
  message?: string
}

export interface FileListResult {
  success: boolean
  data?: Map<string, StaticResourcePath[]>
  total?: number
  error?: string
}

export interface FileDeleteResult {
  success: boolean
  message?: string
  deletedRecords?: number
  error?: string
}

/**
 * 文件处理服务 - Model 层
 */
export class FileService {
  private readonly uploadsDir: string
  private readonly staticResourceRepository = AppDataSource.getRepository(StaticResourcePath)

  constructor() {
    // 确保上传目录存在 - 保存到项目根目录的models文件夹
    this.uploadsDir = path.join(__dirname, '../models')
    this.ensureUploadDirectory()
  }

  /**
   * 确保上传目录存在
   */
  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true })
    }
  }

  /**
   * 获取上传目录路径
   */
  getUploadsDir(): string {
    return this.uploadsDir
  }

  /**
   * 验证文件类型
   */
  validateFileType(filename: string): boolean {
    const allowedTypes = ['.zip', '.glb', '.gltf', '.pmx', '.vmd', '.png', '.jpg', '.jpeg']
    const fileExtension = path.extname(filename).toLowerCase()
    return allowedTypes.includes(fileExtension)
  }

  /**
   * 验证ZIP文件内容
   */
  validateZipContent(files: string[]): ZipValidationResult {
    const fileExtensions = files.map(f => path.extname(f).toLowerCase())
    
    // 检查是否有PMX文件
    const hasPmxFile = fileExtensions.includes('.pmx')
    
    if (hasPmxFile) {
      // PMX文件必须包含walk.vmd和stand.vmd
      const hasWalkVmd = files.some(f => f.toLowerCase().includes('walk.vmd'))
      const hasStandVmd = files.some(f => f.toLowerCase().includes('stand.vmd'))
      
      if (!hasWalkVmd || !hasStandVmd) {
        const missingFiles = []
        if (!hasWalkVmd) missingFiles.push('walk.vmd')
        if (!hasStandVmd) missingFiles.push('stand.vmd')
        return {
          valid: false,
          message: `PMX模型缺少必需的文件: ${missingFiles.join(', ')}`
        }
      }
    }
    
    // 检查GLB/GLTF文件
    const hasGlbGltf = fileExtensions.some(ext => ext === '.glb' || ext === '.gltf')
    if (hasGlbGltf) {
      // TODO: 添加GLB/GLTF动作验证逻辑
      console.log('检测到GLB/GLTF文件，需要验证动作')
    }
    
    return { valid: true }
  }

  /**
   * 处理ZIP文件上传和解压
   */
  async processZipFile(filePath: string, originalName: string): Promise<FileUploadResult> {
    const queryRunner = AppDataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    
    try {
      const zipBuffer = fs.readFileSync(filePath)
      const zip = new JSZip()
      const zipContent = await zip.loadAsync(zipBuffer)
      
      // 验证ZIP内容
      const files = Object.keys(zipContent.files)
      const validationResult = this.validateZipContent(files)
      
      if (!validationResult.valid) {
        // 删除上传的文件
        fs.unlinkSync(filePath)
        await queryRunner.rollbackTransaction()
        return {
          success: false,
          message: validationResult.message || '文件验证失败',
          error: validationResult.message
        }
      }
      
      // 从文件名中提取hash值（移除.zip后缀）
      const zipHash = path.basename(originalName, '.zip')
      
      // 使用hash值作为解压目录名
      const extractDir = path.join(path.dirname(filePath), zipHash)
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true })
      }
      
      const savedFiles: string[] = []
      
      // 解压文件并保存到数据库
      for (const fileName of files) {
        const file = zipContent.files[fileName]
        if (!file.dir) {
          const content = await file.async('nodebuffer')
          const extractPath = path.join(extractDir, fileName)
          
          // 确保目录存在
          const fileDir = path.dirname(extractPath)
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true })
          }
          fs.writeFileSync(extractPath, content)
          
          // 保存文件信息到数据库
          const fileExtension = path.extname(fileName).toLowerCase() as any
          const staticResourcePath = `/models/${zipHash}/${fileName}`
          
          // 检查是否已存在相同的记录
          const existingRecord = await queryRunner.manager.findOne(StaticResourcePath, {
            where: {
              hash: zipHash,
              path: staticResourcePath,
              ext: fileExtension
            }
          })
          
          if (!existingRecord) {
            const staticResource = new StaticResourcePath()
            staticResource.hash = zipHash
            staticResource.path = staticResourcePath
            staticResource.ext = fileExtension
            
            await queryRunner.manager.save(staticResource)
            savedFiles.push(fileName)
          }
        }
      }
      
      // 提交事务
      await queryRunner.commitTransaction()
      
      // 删除原始ZIP文件
      fs.unlinkSync(filePath)
      
      return {
        success: true,
        message: '文件上传并解压成功',
        extractPath: extractDir,
        folderName: zipHash,
        files: files.filter(f => !zipContent.files[f].dir),
        originalName: originalName
      }
    } catch (error) {
      console.error('ZIP处理错误:', error)
      
      // 回滚事务
      await queryRunner.rollbackTransaction()
      
      // 清理已创建的文件
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
        
        // 清理解压的文件夹
        const zipHash = path.basename(originalName, '.zip')
        const extractDir = path.join(path.dirname(filePath), zipHash)
        if (fs.existsSync(extractDir)) {
          fs.rmSync(extractDir, { recursive: true, force: true })
        }
      } catch (cleanupError) {
        console.error('清理文件失败:', cleanupError)
      }
      
      return {
        success: false,
        message: 'ZIP文件损坏或格式错误',
        error: 'ZIP文件损坏或格式错误'
      }
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * 处理单个文件上传
   */
  async processSingleFile(filePath: string, originalName: string, fileSize: number): Promise<FileUploadResult> {
    const fileExtension = path.extname(originalName).toLowerCase()
    
    return {
      success: true,
      message: '文件上传成功',
      filePath: filePath,
      originalName: originalName,
      fileSize: fileSize,
      fileType: fileExtension.slice(1)
    }
  }

  /**
   * 获取文件列表
   */
  async getFileList(): Promise<FileListResult> {
    try {
      // 查询所有文件记录
      const fileRecords = await this.staticResourceRepository.find({
        order: {
          create_time: 'DESC'
        },
      })

      const groupFiles: Map<string, StaticResourcePath[]> = new Map()
      
      fileRecords.forEach(record => {
        if (groupFiles.get(record.hash)) {
          groupFiles.set(record.hash, [...groupFiles.get(record.hash)!, record])
        } else {
          groupFiles.set(record.hash, [record])
        }
      })
      
      return {
        success: true,
        data: groupFiles,
        total: groupFiles.size
      }
    } catch (error) {
      console.error('获取文件列表错误:', error)
      return {
        success: false,
        error: '获取文件列表失败'
      }
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(hash: string): Promise<FileDeleteResult> {
    const queryRunner = AppDataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    
    try {
      // 从数据库删除相关记录
      const deleteResult = await queryRunner.manager.delete(StaticResourcePath, { hash: hash })
      
      // 提交事务
      await queryRunner.commitTransaction()
      
      // 删除文件系统中的文件夹
      const folderPath = path.join(this.uploadsDir, hash)
      if (fs.existsSync(folderPath)) {
        const stats = fs.statSync(folderPath)
        
        if (stats.isDirectory()) {
          // 删除文件夹及其内容
          fs.rmSync(folderPath, { recursive: true, force: true })
        } else {
          // 删除单个文件
          fs.unlinkSync(folderPath)
        }
      }
      
      return {
        success: true,
        message: '模型文件删除成功',
        deletedRecords: deleteResult.affected || 0
      }
    } catch (error) {
      console.error('删除文件错误:', error)
      
      // 回滚事务
      await queryRunner.rollbackTransaction()
      
      return {
        success: false,
        error: '删除文件失败'
      }
    } finally {
      await queryRunner.release()
    }
  }
}

// 导出单例实例
export const fileService = new FileService()
