import './style.css';
import { WebRTCManager } from './webrtc';
import type { ConnectionStatus } from './types';

// DOM元素
const joinBtn = document.getElementById('joinBtn') as HTMLButtonElement;
const leaveBtn = document.getElementById('leaveBtn') as HTMLButtonElement;
const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
const micBtn = document.getElementById('micBtn') as HTMLButtonElement;
const micStatus = document.getElementById('micStatus') as HTMLSpanElement;
const connectionStatus = document.getElementById('connectionStatus') as HTMLDivElement;
const roomInfo = document.getElementById('roomInfo') as HTMLDivElement;
const peersList = document.getElementById('peersList') as HTMLUListElement;
const messages = document.getElementById('messages') as HTMLDivElement;
const logs = document.getElementById('logs') as HTMLPreElement;
const dataMessage = document.getElementById('dataMessage') as HTMLInputElement;

let webrtcManager: WebRTCManager;

// 日志函数
function log(message: string): void {
  console.log(message);
  const timestamp = new Date().toLocaleTimeString();
  logs.innerHTML += `[${timestamp}] ${message}\n`;
  logs.scrollTop = logs.scrollHeight;
}

// 更新连接状态UI
function updateConnectionStatus(status: ConnectionStatus, details: string = ''): void {
  connectionStatus.className = '';
  switch (status) {
    case 'disconnected':
      connectionStatus.textContent = '未连接';
      connectionStatus.classList.add('status-disconnected');
      break;
    case 'connecting':
      connectionStatus.textContent = '连接中...';
      connectionStatus.classList.add('status-connecting');
      break;
    case 'connected':
      connectionStatus.textContent = '已连接';
      connectionStatus.classList.add('status-connected');
      if (details) {
        connectionStatus.textContent += ` - ${details}`;
      }
      break;
  }
}

// 更新房间信息
function updateRoomInfo(roomData: { roomId: string; peerId: string } | null): void {
  if (!roomData) {
    roomInfo.textContent = '';
    return;
  }
  roomInfo.innerHTML = `
    <p>房间ID: <strong>${roomData.roomId}</strong></p>
    <p>您的ID: <strong>${roomData.peerId}</strong></p>
  `;
}

// 更新成员列表
function updatePeersList(peers: { id: string; name: string }[]): void {
  peersList.innerHTML = '';
  peers.forEach(peer => {
    const li = document.createElement('li');
    li.textContent = `${peer.name} (${peer.id})`;
    peersList.appendChild(li);
  });
}

// 添加消息到消息记录
function addMessage(content: string, isSent: boolean = true): void {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  messageDiv.classList.add(isSent ? 'sent' : 'received');
  messageDiv.textContent = content;
  messages.appendChild(messageDiv);
  messages.scrollTop = messages.scrollHeight;
}

// 处理加入房间
function handleJoinRoom(): void {
  const roomIdInput = document.getElementById('roomId') as HTMLInputElement;
  const userNameInput = document.getElementById('userName') as HTMLInputElement;
  
  const roomId = roomIdInput.value.trim() || null;
  const userName = userNameInput.value.trim() || '用户';
  
  // 禁用加入按钮，防止重复点击
  joinBtn.disabled = true;
  
  // 加入房间
  webrtcManager.joinRoom(roomId, userName);
}

// 处理离开房间
function handleLeaveRoom(): void {
  webrtcManager.leaveRoom();
}

// 发送消息
function handleSendMessage(): void {
  const message = dataMessage.value.trim();
  if (!message) return;

  webrtcManager.sendMessage(message);
  dataMessage.value = '';
}

// 切换麦克风
async function handleToggleMicrophone(): Promise<void> {
  try {
    micBtn.disabled = true;
    const isEnabled = await webrtcManager.toggleMicrophone();
    updateMicrophoneStatus(isEnabled);
  } catch (error) {
    log(`麦克风操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    micBtn.disabled = false;
  }
}

// 更新麦克风状态UI
function updateMicrophoneStatus(isEnabled: boolean): void {
  if (isEnabled) {
    micBtn.textContent = '🎤 关闭麦克风';
    micBtn.classList.remove('primary-btn');
    micBtn.classList.add('danger-btn');
    micStatus.textContent = '麦克风已开启';
    micStatus.classList.add('mic-enabled');
    micStatus.classList.remove('mic-disabled');
  } else {
    micBtn.textContent = '🎤 开启麦克风';
    micBtn.classList.remove('danger-btn');
    micBtn.classList.add('primary-btn');
    micStatus.textContent = '麦克风已关闭';
    micStatus.classList.add('mic-disabled');
    micStatus.classList.remove('mic-enabled');
  }
}

// 初始化
function init(): void {
  // 初始状态
  updateConnectionStatus('disconnected');
  
  // 创建WebRTC管理器
  webrtcManager = new WebRTCManager(
    log, 
    updateConnectionStatus, 
    updateRoomInfo, 
    updatePeersList, 
    addMessage
  );
  
  // 绑定按钮事件
  joinBtn.addEventListener('click', handleJoinRoom);
  leaveBtn.addEventListener('click', handleLeaveRoom);
  sendBtn.addEventListener('click', handleSendMessage);
  micBtn.addEventListener('click', handleToggleMicrophone);

  // 回车发送消息
  dataMessage.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  });

  // 初始化麦克风状态
  updateMicrophoneStatus(false);
  
  // 连接到Socket.IO服务器
  webrtcManager.connectSocket();
  
  // 设置窗口关闭时清理资源
  window.addEventListener('beforeunload', () => {
    webrtcManager.leaveRoom();
  });
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);
