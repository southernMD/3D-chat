import express from 'express'
import { fileController } from '../controllers/FileController'
import { upload } from '../middleware/fileUploadMiddleware'

const router = express.Router()

// 文件上传接口 (ZIP或单个文件)
router.post('/upload-zip', upload.single('file'), fileController.uploadFile.bind(fileController))

// 获取文件列表
router.get('/list', fileController.getFileList.bind(fileController))

// 删除文件
router.delete('/:hash', fileController.deleteFile.bind(fileController))

export default router
