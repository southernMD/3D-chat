import dotenv from 'dotenv';
import os from 'os';
import * as mediasoup from 'mediasoup/node/lib/types';

// 加载.env文件
dotenv.config();

// 获取IP地址
export function getLocalIp(): string {
  const ifaces = os.networkInterfaces();
  let localIp = '127.0.0.1';
  
  Object.keys(ifaces).forEach((ifname) => {
    ifaces[ifname]?.forEach((iface) => {
      // 跳过内部IP和非IPv4地址
      if (iface.internal !== false || iface.family !== 'IPv4') {
        return;
      }
      localIp = iface.address;
    });
  });
  
  return localIp;
}

// 服务器配置
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  useHttps: process.env.HTTPS === 'true',
  sslCertPath: process.env.SSL_CERT_PATH,
  sslKeyPath: process.env.SSL_KEY_PATH,
  
  // Mediasoup配置
  mediasoup: {
    // Worker设置
    worker: {
      rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT || '40000', 10),
      rtcMaxPort: parseInt(process.env.MEDIASOUP_MAX_PORT || '49999', 10),
      logLevel: 'debug' as mediasoup.WorkerLogLevel,
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'] as mediasoup.WorkerLogTag[],
    },
    
    // Router设置
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        } as mediasoup.RtpCodecCapability,
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        } as mediasoup.RtpCodecCapability,
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        } as mediasoup.RtpCodecCapability,
      ],
    },
    
    // WebRTC传输设置
    webRtcTransport: {
      listenIps: [
        {
          ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || getLocalIp(),
        }
      ],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },
}; 