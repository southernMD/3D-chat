import { eventBus } from "./eventBus"

/**
 * 音频元素管理器
 * 负责管理所有音频元素的创建、删除和维护
 */
export class AudioElementManager {
  // peerId -> HTMLAudioElement 的映射
  private audioElements: Map<string, HTMLAudioElement> = new Map()
  // 本地静音peerId集合
  private mutedPeerIds: Set<string> = new Set()
  
  /**
   * 创建音频元素
   * @param producerId 生产者ID
   * @param producerPeerId 生产者所属的peerId
   * @param mediaStream 媒体流
   * @param logCallback 日志回调函数
   * @returns 创建的音频元素
   */
  createAudioElement(
    producerId: string, 
    producerPeerId: string, 
    mediaStream: MediaStream,
    logCallback?: (message: string) => void
  ): HTMLAudioElement {
    const log = logCallback || console.log

    // 如果该peerId已经有音频元素，先移除旧的
    if (this.audioElements.has(producerPeerId)) {
      this.removeAudioElement(producerPeerId)
    }

    // 创建新的音频元素
    const audioElement = document.createElement('audio')
    audioElement.id = `audio-${producerPeerId}`
    audioElement.srcObject = mediaStream
    audioElement.autoplay = true
    audioElement.controls = false
    audioElement.muted = false
    audioElement.volume = 0.8
    audioElement.style.display = 'none'
    // 如果在静音列表，自动静音
    if (this.mutedPeerIds.has(producerPeerId)) {
      audioElement.muted = true
    }
    // 添加到DOM
    document.body.appendChild(audioElement)
    // 存储到映射中
    this.audioElements.set(producerPeerId, audioElement)
    // 新增：将peerId加入activeMicPeerIds
    eventBus.emit('change-mico-status',{peerId:producerPeerId,status:true})

    // 监听音频播放事件
    audioElement.addEventListener('loadedmetadata', () => {
      log(`音频元素已加载，来自 ${producerPeerId}`)
    })

    audioElement.addEventListener('error', (e) => {
      log(`音频播放错误: ${e}`)
    })

    log(`创建音频元素成功: producerId=${producerId}, producerPeerId=${producerPeerId}`)
    return audioElement
  }

  /**
   * 根据peerId移除音频元素
   * @param producerPeerId 生产者所属的peerId
   * @returns 是否成功移除
   */
  removeAudioElement(producerPeerId: string): boolean {
    const audioElement = this.audioElements.get(producerPeerId)
    if (audioElement) {
      // 从DOM中移除
      audioElement.remove()
      // 从映射中删除
      this.audioElements.delete(producerPeerId)
      // 新增：将peerId从activeMicPeerIds移除
      eventBus.emit('change-mico-status',{peerId:producerPeerId,status:false})
      return true
    }
    return false
  }

  // /**
  //  * 根据producerId移除音频元素
  //  * @param producerId 生产者ID
  //  * @returns 是否成功移除
  //  */
  // removeAudioElementByProducerId(producerId: string): boolean {
  //   console.log(producerId,'producerId');
  //   const audioElement = document.getElementById(`audio-${producerId}`) as HTMLAudioElement
  //   if (audioElement) {
  //     // 找到对应的peerId并从映射中删除
  //     for (const [peerId, element] of this.audioElements.entries()) {
  //       if (element === audioElement) {
  //         this.audioElements.delete(peerId)
  //         break
  //       }
  //     }
  //     // 从DOM中移除
  //     audioElement.remove()
  //     return true
  //   }
  //   return false
  // }

  /**
   * 获取指定peerId的音频元素
   * @param producerPeerId 生产者所属的peerId
   * @returns 音频元素或undefined
   */
  getAudioElement(producerPeerId: string): HTMLAudioElement | undefined {
    return this.audioElements.get(producerPeerId)
  }

  /**
   * 设置指定peerId音频元素的音量
   * @param producerPeerId 生产者所属的peerId
   * @param volume 音量值 (0-1)
   * @returns 是否成功设置
   */
  setVolume(producerPeerId: string, volume: number): boolean {
    const audioElement = this.audioElements.get(producerPeerId)
    if (audioElement) {
      audioElement.volume = Math.max(0, Math.min(1, volume))
      return true
    }
    return false
  }

  /**
   * 静音/取消静音指定peerId的音频元素
   * @param producerPeerId 生产者所属的peerId
   * @param muted 是否静音
   * @returns 是否成功设置
   */
  setMuted(producerPeerId: string, muted: boolean): boolean {
    const audioElement = this.audioElements.get(producerPeerId)
    if (audioElement) {
      audioElement.muted = muted
      return true
    }
    return false
  }

  /**
   * 判断peerId是否被静音
   */
  public isMuted(peerId: string): boolean {
    return this.mutedPeerIds.has(peerId)
  }
  /**
   * 设置peerId静音/取消静音，并同步audio标签
   */
  public setPeerMuted(peerId: string, muted: boolean) {
    if (muted) {
      this.mutedPeerIds.add(peerId)
    } else {
      this.mutedPeerIds.delete(peerId)
    }
    this.setMuted(peerId, muted)
  }
  /**
   * 获取所有被静音的peerId
   */
  public getMutedPeerIds(): string[] {
    return Array.from(this.mutedPeerIds)
  }

  /**
   * 清理所有音频元素
   */
  clearAll(): void {
    for (const [peerId, audioElement] of this.audioElements.entries()) {
      audioElement.remove()
    }
    this.audioElements.clear()
  }

  /**
   * 获取当前管理的音频元素数量
   * @returns 音频元素数量
   */
  getCount(): number {
    return this.audioElements.size
  }
}

// 导出单例
export const audioElementManager = new AudioElementManager()
