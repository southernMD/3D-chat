
// declare module 'mediasoup-client' {
//   export class Device {
//     load(routerRtpCapabilities: any): Promise<void>;
//     rtpCapabilities: any;
//     canProduce(kind: string): boolean;
//     createSendTransport(options: TransportOptions): any;
//     createRecvTransport(options: any): any;
//   }
// }

// declare module 'mediasoup-client/lib/types' {
//   export interface DataProducer {
//     id: string;
//     closed: boolean;
//     send(data: ArrayBuffer): void;
//     close(): void;
//     on(event: string, callback: (...args: any[]) => void): void;
//   }

//   export interface DataConsumer {
//     id: string;
//     closed: boolean;
//     close(): void;
//     on(event: string, callback: (...args: any[]) => void): void;
//   }
  
//   export interface SctpStreamParameters {
//     streamId: number;
//     ordered: boolean;
//   }
  
//   export interface DataConsumerOptions<AppData = any> {
//     id: string;
//     dataProducerId: string;
//     sctpStreamParameters: SctpStreamParameters;
//     label?: string;
//     protocol?: string;
//     appData?: AppData;
//   }
// }