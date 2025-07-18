declare module 'socket.io-client' {
  export interface Socket {
    connected: boolean;
    id: string;
    connect(): Socket;
    emit(event: string, ...args: any[]): boolean;
    on(event: string, callback: (...args: any[]) => void): Socket;
    once(event: string, callback: (...args: any[]) => void): Socket;
    off(event: string, callback?: (...args: any[]) => void): Socket;
    disconnect(): Socket;
  }
  
  export function io(uri: string, opts?: any): Socket;
} 