import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { StaticResourcePath } from './StaticResourcePath';
import { User } from './User';

@Entity('static_resource_message')
@Unique('hash_index', ['hash'])
export class StaticResourceMessage {
  // 添加一个自增主键，因为 TypeORM 需要主键
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hash!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  size!: string | null;

  @Column({ name: 'picPath', type: 'varchar', length: 255, nullable: true })
  picPath!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  des!: string | null;

  @Column({ name: 'createrId', type: 'int', nullable: true })
  createrId!: number | null;

  // 外键关系: static_resource_path(hash)
  @ManyToOne(() => StaticResourcePath, (path: StaticResourcePath) => path.messages, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({ name: 'hash', referencedColumnName: 'hash' })
  resourcePath!: StaticResourcePath;

  // 外键关系: users(id)
  @ManyToOne(() => User, (user: User) => user.staticResourceMessages, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({ name: 'createrId', referencedColumnName: 'id' })
  creater!: User;

  @CreateDateColumn({
    type: 'datetime',
  })
  create_time!: Date;

  @UpdateDateColumn({
    type: 'datetime',
  })
  update_time!: Date;
}
  