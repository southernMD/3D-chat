import multer from 'multer'
import path from 'path'
import { fileService } from '../services/FileService'

/**
 * 文件上传中间件配置
 */

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, fileService.getUploadsDir())
  },
  filename: (req: any, file: any, cb: any) => {
    // 保持原始文件名（包含hash值）
    cb(null, file.originalname)
  }
})

// 文件过滤器
const fileFilter = (req: any, file: any, cb: any) => {
  const isValid = fileService.validateFileType(file.originalname)
  
  if (isValid) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型'), false)
  }
}

// 导出multer实例
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
})
