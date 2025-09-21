import path from 'path'
import fs from 'fs'
import JSZip from 'jszip'
import { AppDataSource } from '../config/database'
import { StaticResourcePath } from '../entities/StaticResourcePath'
import { StaticResourceMessage } from '../entities/StaticResourceMessage'

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

export interface ModelInfo {
  name: string
  description?: string
  size: string
  format: string
  hash: string
  screenshot?: string // base64截图字符串
}

/**
 * 文件处理服务 - Model 层
 */
export class FileService {
  private readonly uploadsDir: string
  private readonly staticResourceRepository = AppDataSource.getRepository(StaticResourcePath)
  private readonly staticResourceMessageRepository = AppDataSource.getRepository(StaticResourceMessage)

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
   * 保存base64截图到文件系统
   */
  private async saveScreenshot(base64Screenshot: string, modelHash: string): Promise<string> {
    try {
      // 解析base64数据
      const matches = base64Screenshot.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/)
      if (!matches) {
        throw new Error('无效的base64图片格式')
      }

      const imageType = matches[1] // png, jpeg等
      const base64Data = matches[2]

      // 创建截图目录
      const screenshotDir = path.join(this.uploadsDir, 'screenshots')
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true })
      }

      // 生成截图文件名
      const screenshotFileName = `${modelHash}_preview.${imageType}`
      const screenshotPath = path.join(screenshotDir, screenshotFileName)

      // 将base64转换为Buffer并保存
      const imageBuffer = Buffer.from(base64Data, 'base64')
      fs.writeFileSync(screenshotPath, imageBuffer)

      // 返回相对路径（用于数据库存储和URL访问）
      return `screenshots/${screenshotFileName}`
    } catch (error) {
      console.error('保存截图失败:', error)
      throw new Error('截图保存失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
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
  async processZipFile(
    filePath: string,
    originalName: string,
    userId?: number | null,
    modelInfo?: ModelInfo | null
  ): Promise<FileUploadResult> {
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

      // 保存模型信息到StaticResourceMessage表
      if (modelInfo && userId) {
        // 检查是否已存在相同hash的模型信息
        const existingMessage = await queryRunner.manager.findOne(StaticResourceMessage, {
          where: { hash: zipHash }
        })

        if (!existingMessage) {
          const staticResourceMessage = new StaticResourceMessage()
          staticResourceMessage.hash = zipHash
          staticResourceMessage.size = modelInfo.size
          staticResourceMessage.des = modelInfo.description || null
          staticResourceMessage.createrId = userId

          // 处理截图保存
          if (modelInfo.screenshot) {
            try {
              const screenshotPath = await this.saveScreenshot(modelInfo.screenshot, zipHash)
              staticResourceMessage.picPath = screenshotPath
              console.log(`📸 截图已保存: ${screenshotPath}`)
            } catch (error) {
              console.error('截图保存失败:', error)
              // 截图保存失败不影响模型信息保存
              staticResourceMessage.picPath = null
            }
          } else {
            staticResourceMessage.picPath = null
          }

          await queryRunner.manager.save(staticResourceMessage)
          console.log(`✅ 模型信息已保存: ${modelInfo.name} (hash: ${zipHash})`)
        } else {
          console.log(`ℹ️ 模型信息已存在: ${zipHash}`)
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
   * 获取模型信息列表
   */
  async getModelList(): Promise<{ success: boolean; data?: any[]; total?: number; error?: string }> {
    try {
      // 查询所有模型信息记录，包含关联的用户信息
      const modelRecords = await this.staticResourceMessageRepository.find({
        relations: ['creater', 'resourcePath'],
        order: {
          create_time: 'DESC'
        }
      })

      const modelList = modelRecords.map(record => ({
        id: record.id,
        hash: record.hash,
        size: record.size,
        description: record.des,
        createdBy: record.creater ? {
          id: record.creater.id,
          nickname: record.creater.nickname,
          email: record.creater.username
        } : null,
        createTime: record.create_time,
        updateTime: record.update_time,
        picPath: record.picPath
      }))

      return {
        success: true,
        data: modelList,
        total: modelList.length
      }
    } catch (error) {
      console.error('获取模型列表错误:', error)
      return {
        success: false,
        error: '获取模型列表失败'
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
