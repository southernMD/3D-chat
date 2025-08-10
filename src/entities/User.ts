import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @CreateDateColumn({ name: 'createtime' })
  createtime!: Date;

  @UpdateDateColumn({ name: 'updatetime' })
  updatetime!: Date;
}
