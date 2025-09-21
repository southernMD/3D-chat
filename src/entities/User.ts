import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { StaticResourceMessage } from './StaticResourceMessage';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nickname!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  verify!: string;

  @CreateDateColumn({
    type: 'datetime',
  })
  create_time!: Date;

  @UpdateDateColumn({
    type: 'datetime',
  })
  update_time!: Date;

  // 反向关联 StaticResourceMessage
  @OneToMany(() => StaticResourceMessage, message => message.creater)
  staticResourceMessages!: StaticResourceMessage[];
}
