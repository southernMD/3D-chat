import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, OneToMany } from 'typeorm';
import { StaticResourceMessage } from './StaticResourceMessage';

@Entity('static_resource_path')
@Unique('hash-path-index', ['hash', 'path'])
export class StaticResourcePath {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  hash!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  path!: string;

  @Column({ 
    type: 'enum', 
    enum: ['.glb', '.gltf', '.pmx', '.vmd', '.png', '.jpg', '.jpeg'], 
    nullable: false 
  })
  ext!: '.glb' | '.gltf' | '.pmx' | '.vmd' | '.png' | '.jpg' | '.jpeg';

  @CreateDateColumn({
    type: 'datetime',
  })
  create_time!: Date;

  @UpdateDateColumn({
    type: 'datetime',
  })
  update_time!: Date;

  // 反向关联 StaticResourceMessage
  @OneToMany(() => StaticResourceMessage, message => message.resourcePath)
  messages!: StaticResourceMessage[];
}
