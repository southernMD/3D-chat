import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('verification_codes')
export class VerificationCode {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '验证码ID，主键' })
  id!: number;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '邮箱地址' })
  email!: string;

  @Column({ type: 'varchar', length: 10, comment: '验证码' })
  code!: string;

  @Column({ type: 'datetime', comment: '过期时间' })
  expire_time!: Date;

  @Column({ type: 'tinyint', default: 0, comment: '是否已使用：0-未使用，1-已使用' })
  is_used!: number;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  create_time!: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  update_time!: Date;
}
