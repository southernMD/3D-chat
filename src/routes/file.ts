import express, { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import JSZip from 'jszip'

const router = express.Router()

// 确保上传目录存在 - 保存到项目根目录的models文件夹
const uploadsDir = path.join(__dirname, '../models')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadsDir)
  },
  filename: (req: any, file: any, cb: any) => {
    // 保持原始文件名（包含hash值）
    cb(null, file.originalname)
  }
})

// 文件过滤器
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['.zip', '.glb', '.gltf', '.pmx', '.vmd']
  const fileExtension = path.extname(file.originalname).toLowerCase()
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型'), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
})

// ZIP文件上传接口
router.post('/upload-zip', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const filePath = req.file.path
    const originalName = req.file.originalname
    const fileExtension = path.extname(originalName).toLowerCase()
    
    if (fileExtension === '.zip') {
      // 处理ZIP文件
      try {
        const zipBuffer = fs.readFileSync(filePath)
        const zip = new JSZip()
        const zipContent = await zip.loadAsync(zipBuffer)
        
        // 验证ZIP内容
        const files = Object.keys(zipContent.files)
        const validationResult = validateZipContent(files)
        
        if (!validationResult.valid) {
          // 删除上传的文件
          fs.unlinkSync(filePath)
          return res.status(400).json({ error: validationResult.message })
        }
        
        // 从文件名中提取hash值（移除.zip后缀）
        const zipHash = path.basename(originalName, '.zip')
        
        // 使用hash值作为解压目录名
        const extractDir = path.join(path.dirname(filePath), zipHash)
        if (!fs.existsSync(extractDir)) {
          fs.mkdirSync(extractDir, { recursive: true })
        }
        
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
          }
        }
        
        // 删除原始ZIP文件
        fs.unlinkSync(filePath)
        
        res.json({
          success: true,
          message: '文件上传并解压成功',
          extractPath: extractDir,
          folderName: zipHash,
          files: files.filter(f => !zipContent.files[f].dir),
          originalName: originalName
        })
      } catch (zipError) {
        console.error('ZIP处理错误:', zipError)
        // 删除上传的文件
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
        return res.status(400).json({ error: 'ZIP文件损坏或格式错误' })
      }
    } else {
      // 处理单个文件
      res.json({
        success: true,
        message: '文件上传成功',
        filePath: filePath,
        originalName: originalName,
        fileSize: req.file.size,
        fileType: fileExtension.slice(1)
      })
    }
  } catch (error) {
    console.error('文件上传错误:', error)
    res.status(500).json({ error: '文件上传失败' })
  }
})

// 验证ZIP内容
function validateZipContent(files: string[]): { valid: boolean, message?: string } {
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
  
  // 检查GLB/GLTF文件（这里可以添加动作验证逻辑）
  const hasGlbGltf = fileExtensions.some(ext => ext === '.glb' || ext === '.gltf')
  if (hasGlbGltf) {
    // TODO: 添加GLB/GLTF动作验证逻辑
    console.log('检测到GLB/GLTF文件，需要验证动作')
  }
  
  return { valid: true }
}

// 获取上传的文件列表
router.get('/list', (req: any, res: any) => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ files: [] })
    }
    
    const files = fs.readdirSync(uploadsDir)
    const fileList = files.map(filename => {
      const filePath = path.join(uploadsDir, filename)
      const stats = fs.statSync(filePath)
      return {
        name: filename,
        size: stats.size,
        uploadTime: stats.mtime,
        url: `/models/${filename}`, // 提供静态资源URL
        path: filePath
      }
    })
    
    res.json({ files: fileList })
  } catch (error) {
    console.error('获取文件列表错误:', error)
    res.status(500).json({ error: '获取文件列表失败' })
  }
})

// 获取模型文件夹列表（解压后的文件夹）
router.get('/models', (req: any, res: any) => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ models: [] })
    }
    
    const items = fs.readdirSync(uploadsDir)
    const modelList = items
      .filter(item => {
        const itemPath = path.join(uploadsDir, item)
        return fs.statSync(itemPath).isDirectory()
      })
      .map(folderName => {
        const folderPath = path.join(uploadsDir, folderName)
        const stats = fs.statSync(folderPath)
        
        // 读取文件夹内容
        const files = fs.readdirSync(folderPath)
        const modelFiles = files.map(fileName => {
          const fileStats = fs.statSync(path.join(folderPath, fileName))
          return {
            name: fileName,
            size: fileStats.size,
            url: `/models/${folderName}/${fileName}`
          }
        })
        
        return {
          hash: folderName,
          name: folderName,
          uploadTime: stats.mtime,
          files: modelFiles,
          url: `/models/${folderName}/`
        }
      })
    
    res.json({ models: modelList })
  } catch (error) {
    console.error('获取模型列表错误:', error)
    res.status(500).json({ error: '获取模型列表失败' })
  }
})

// 删除上传的文件
router.delete('/:filename', (req: any, res: any) => {
  try {
    const filename = req.params.filename
    const filePath = path.join(uploadsDir, filename)
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      
      if (stats.isDirectory()) {
        // 删除文件夹及其内容
        fs.rmSync(filePath, { recursive: true, force: true })
        res.json({ success: true, message: '模型文件夹删除成功' })
      } else {
        // 删除单个文件
        fs.unlinkSync(filePath)
        res.json({ success: true, message: '文件删除成功' })
      }
    } else {
      res.status(404).json({ error: '文件或文件夹不存在' })
    }
  } catch (error) {
    console.error('删除文件错误:', error)
    res.status(500).json({ error: '删除文件失败' })
  }
})

export default router
