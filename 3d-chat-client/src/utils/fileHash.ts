import SparkMD5 from 'spark-md5'

// 文件块接口定义（完全参照demo-main）
export interface FileChunk {
  chunkIndex: number
  start: number
  end: number
  blob: Blob
  hash: string
}

/**
 * 创建文件块并计算其 MD5 哈希值。（完全参照demo-main的createChunk.ts）
 * 
 * @param file - 要分块的文件。
 * @param chunkIndex - 要创建的块的索引。
 * @param CHUNK_SIZE - 每个块的大小（字节）。默认是 5MB。
 * @returns 一个 Promise，解析为包含块的起始和结束位置、索引、哈希值和 blob 的 FileChunk 对象。
 */
export const createChunk = async (file: File, chunkIndex: number, CHUNK_SIZE = 1024 * 1024 * 5) => {
    return new Promise<FileChunk>((resolve) => {
        const start = chunkIndex * CHUNK_SIZE
        const end = start + CHUNK_SIZE
        const spark = new SparkMD5.ArrayBuffer()
        const fileReader = new FileReader()
        const blob = file.slice(start, end)
        fileReader.onload = (e) => {
            spark.append(e.target?.result as ArrayBuffer)
            resolve({
                start,
                end,
                chunkIndex,
                hash: spark.end(),
                blob,
            })
        }
        fileReader.readAsArrayBuffer(blob)
    })
}

const CPU_COUNT = navigator.hardwareConcurrency || 4

/**
 * 将文件切割成多个块，并使用 Web Worker 进行并行处理。（完全参照demo-main的cutFile.ts）
 * 
 * @param file - 要切割的文件。
 * @param CHUNK_SIZE - 每个块的大小（字节）。默认是 5MB。
 * @param signal - AbortSignal 用于取消操作
 * @param workers - Worker 数组引用，用于外部管理
 * @returns 一个 Promise，解析为按顺序排列的 FileChunk 对象数组。
 */
export const cutFile = async (
    file: File, 
    CHUNK_SIZE = 1024 * 1024 * 5,
    signal?: AbortSignal,
    workers?: Worker[]
) => {
    return new Promise<Array<FileChunk>>((resolve, reject) => {
        const chunkCount = Math.ceil(file.size / CHUNK_SIZE)
        const threadChunkCount = Math.ceil(chunkCount / CPU_COUNT)
        console.log(chunkCount, threadChunkCount);
        const result: Array<FileChunk> = []
        const createdWorkers: Worker[] = []
        let finishCount = 0
        let cancelled = false

        // 监听取消信号
        const onAbort = () => {
            cancelled = true
            // 终止所有 workers
            createdWorkers.forEach(worker => {
                worker.terminate()
            })
            reject(new Error('Hash计算被取消'))
        }

        if (signal) {
            signal.addEventListener('abort', onAbort)
        }

        for (let i = 0; i < Math.min(chunkCount, CPU_COUNT); i++) {
            if (cancelled) break

            const worker = new Worker(
                new URL('../workers/hashWorker.ts', import.meta.url),
                { type: 'module' }
            )
            createdWorkers.push(worker)
            
            // 如果传入了 workers 数组，添加到其中供外部管理
            if (workers) {
                workers.push(worker)
            }

            const end = Math.min(chunkCount, (i + 1) * threadChunkCount)
            const start = i * threadChunkCount
            console.log(start, end);

            worker.postMessage({
                file,
                CHUNK_SIZE,
                startChunkIndex: start,
                endChunkIndex: end,
            })
            
            worker.onmessage = (e: MessageEvent) => {
                if (cancelled) return
                
                console.log(e.data, start, end);
                result.push(...e.data)
                worker.terminate()
                finishCount++
                console.log(finishCount, threadChunkCount);
                if (finishCount === Math.min(chunkCount, CPU_COUNT)) {
                    if (signal) {
                        signal.removeEventListener('abort', onAbort)
                    }
                    resolve(result.sort((a, b) => a.chunkIndex - b.chunkIndex))
                }
            }

            worker.onerror = (error) => {
                if (cancelled) return
                
                console.error('Worker错误:', error)
                createdWorkers.forEach(w => w.terminate())
                if (signal) {
                    signal.removeEventListener('abort', onAbort)
                }
                reject(error)
            }
        }
    })
}

/**
 * 计算整个文件的MD5哈希值（参照demo-main，使用分块计算然后合并第一个和最后一个chunk的hash）
 * 
 * @param file - 要计算hash的文件
 * @param signal - AbortSignal 用于取消操作
 * @param workers - Worker 数组引用，用于外部管理
 * @returns 文件的组合哈希值（第一个chunk的hash + 最后一个chunk的hash）
 */
export const calculateFileHash = async (
    file: File,
    signal?: AbortSignal,
    workers?: Worker[]
): Promise<string> => {
    try {
        console.time("cutFile")
        const chunks = await cutFile(file, 1024 * 1024 * 5, signal, workers)
        console.timeEnd("cutFile")
        console.log(chunks); // 打印chunks，与demo-main一致
        
        // 取第一个和最后一个chunk的hash拼接
        const firstHash = chunks[0]?.hash || ''
        const lastHash = chunks[chunks.length - 1]?.hash || ''
        const combinedHash = firstHash + lastHash
        
        console.log('第一个chunk hash:', firstHash)
        console.log('最后一个chunk hash:', lastHash)
        console.log('组合hash:', combinedHash)
        
        return combinedHash
    } catch (error) {
        console.error('计算文件hash失败:', error)
        throw new Error('计算文件hash失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
}