import fs from 'fs';
import path from 'path';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * 日志接口
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
  stack?: string;
}

/**
 * 简单的日志记录器
 */
class Logger {
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(level: LogLevel, message: string, meta?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    if (meta) {
      if (meta instanceof Error) {
        entry.stack = meta.stack;
        entry.meta = {
          name: meta.name,
          message: meta.message
        };
      } else {
        entry.meta = meta;
      }
    }

    return entry;
  }

  /**
   * 写入日志文件
   */
  private writeToFile(entry: LogEntry): void {
    try {
      const fileName = `${new Date().toISOString().split('T')[0]}.log`;
      const filePath = path.join(this.logDir, fileName);
      const logLine = JSON.stringify(entry) + '\n';
      
      fs.appendFileSync(filePath, logLine);
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  /**
   * 控制台输出
   */
  private writeToConsole(entry: LogEntry): void {
    const colorCodes = {
      [LogLevel.ERROR]: '\x1b[31m', // 红色
      [LogLevel.WARN]: '\x1b[33m',  // 黄色
      [LogLevel.INFO]: '\x1b[36m',  // 青色
      [LogLevel.DEBUG]: '\x1b[90m'  // 灰色
    };

    const resetColor = '\x1b[0m';
    const color = colorCodes[entry.level] || '';
    
    const logMessage = `${color}[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${resetColor}`;
    
    if (entry.level === LogLevel.ERROR) {
      console.error(logMessage);
      if (entry.stack) {
        console.error(entry.stack);
      }
      if (entry.meta) {
        console.error('Meta:', JSON.stringify(entry.meta, null, 2));
      }
    } else {
      console.log(logMessage);
      if (entry.meta) {
        console.log('Meta:', JSON.stringify(entry.meta, null, 2));
      }
    }
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    const entry = this.formatLogEntry(level, message, meta);
    
    // 写入控制台
    this.writeToConsole(entry);
    
    // 写入文件（仅在生产环境或错误/警告级别）
    if (process.env.NODE_ENV === 'production' || level === LogLevel.ERROR || level === LogLevel.WARN) {
      this.writeToFile(entry);
    }
  }

  /**
   * 错误日志
   */
  error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * 警告日志
   */
  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * 信息日志
   */
  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * 调试日志
   */
  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, message, meta);
    }
  }

  /**
   * 清理旧日志文件（保留最近30天）
   */
  cleanOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          this.info(`删除旧日志文件: ${file}`);
        }
      });
    } catch (error) {
      this.error('清理旧日志文件失败', error);
    }
  }
}

// 导出单例
export const logger = new Logger();

// 启动时清理旧日志
logger.cleanOldLogs();