import express from 'express'
import { fileController } from '../controllers/FileController'
import { upload } from '../middleware/fileUploadMiddleware'
import { validationMiddleware } from '../decorators/validation'

const router = express.Router()

// 文件上传接口 (ZIP或单个文件)
router.post('/upload-zip',
  upload.single('file'),
  validationMiddleware(fileController, 'uploadFile'),
  fileController.uploadFile.bind(fileController)
)

// 获取文件列表
router.get('/list', fileController.getFileList.bind(fileController))

// 获取模型信息列表
router.get('/models', fileController.getModelList.bind(fileController))

// 根据hash获取模型详细信息
router.get('/models/:hash', fileController.getModelByHash.bind(fileController))

// 删除文件
router.delete('/:hash', fileController.deleteFile.bind(fileController))

export default router
