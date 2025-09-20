import { createChunk } from "../utils/fileHash"

/**
 * 处理来自主线程的消息，创建文件块并返回结果。（完全参照demo-main的worker.ts）
 * 
 * @param e - 消息事件，包含文件、块大小、起始和结束块索引。
 */
self.onmessage = async (e: MessageEvent) => {
    const {
        file,
        CHUNK_SIZE,
        startChunkIndex: start,
        endChunkIndex: end,
    } = e.data
    const proms = []
    for (let i = start; i < end; i++) {
        proms.push(await createChunk(file, i, CHUNK_SIZE))
    }
    const chunks = await Promise.all(proms)
    self.postMessage(chunks)
}