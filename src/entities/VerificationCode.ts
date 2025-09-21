import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('verification_codes')
export class VerificationCode {
  @PrimaryGeneratedColumn({ 
    type: 'bigint', 
    comment: '验证码ID，主键' 
  })
  id!: number;

  @Column({ 
    type: 'varchar', 
    length: 100, 
    nullable: true, 
    comment: '邮箱地址' 
  })
  email!: string;

  @Column({ 
    type: 'varchar', 
    length: 10, 
    nullable: false,
    comment: '验证码' 
  })
  code!: string;

  @Column({ 
    type: 'datetime', 
    nullable: false,
    comment: '过期时间' 
  })
  expire_time!: Date;

  @Column({ 
    type: 'tinyint', 
    default: 0, 
    nullable: false,
    comment: '是否已使用：0-未使用，1-已使用' 
  })
  is_used!: number;

  @CreateDateColumn({
    type: 'datetime',
  })
  create_time!: Date;

  @UpdateDateColumn({
    type: 'datetime',
  })
  update_time!: Date;
}
