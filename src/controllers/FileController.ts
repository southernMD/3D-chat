import { Request, Response } from 'express'
import path from 'path'
import { fileService, FileUploadResult } from '../services/FileService'

/**
 * 文件上传请求接口
 */
interface FileUploadRequest extends Request {
  file?: Express.Multer.File
}

/**
 * 文件控制器 - Controller 层
 * 负责处理HTTP请求/响应，协调Model和View
 */
export class FileController {
  
  /**
   * 上传ZIP文件或单个文件
   */
  async uploadFile(req: FileUploadRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ 
          success: false,
          error: '没有上传文件' 
        })
        return
      }

      const { path: filePath, originalname: originalName, size: fileSize } = req.file
      const fileExtension = path.extname(originalName).toLowerCase()
      
      let result: FileUploadResult

      if (fileExtension === '.zip') {
        // 处理ZIP文件
        result = await fileService.processZipFile(filePath, originalName)
      } else {
        // 处理单个文件
        result = await fileService.processSingleFile(filePath, originalName, fileSize)
      }

      if (result.success) {
        res.json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('文件上传错误:', error)
      res.status(500).json({ 
        success: false,
        error: '文件上传失败' 
      })
    }
  }

  /**
   * 获取文件列表
   */
  async getFileList(req: Request, res: Response): Promise<void> {
    try {
      const result = await fileService.getFileList()
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          total: result.total
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        })
      }
    } catch (error) {
      console.error('获取文件列表错误:', error)
      res.status(500).json({ 
        success: false,
        error: '获取文件列表失败' 
      })
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const hash = req.params.hash
      
      if (!hash) {
        res.status(400).json({
          success: false,
          error: '缺少文件hash参数'
        })
        return
      }

      const result = await fileService.deleteFile(hash)
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          deletedRecords: result.deletedRecords
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        })
      }
    } catch (error) {
      console.error('删除文件错误:', error)
      res.status(500).json({ 
        success: false,
        error: '删除文件失败' 
      })
    }
  }

  /**
   * 验证文件类型 (可用于前置中间件)
   */
  validateFileType(req: FileUploadRequest, res: Response, next: Function): void {
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        error: '没有上传文件' 
      })
      return
    }

    const isValid = fileService.validateFileType(req.file.originalname)
    
    if (!isValid) {
      res.status(400).json({ 
        success: false,
        error: '不支持的文件类型' 
      })
      return
    }

    next()
  }
}

// 导出单例实例
export const fileController = new FileController()
