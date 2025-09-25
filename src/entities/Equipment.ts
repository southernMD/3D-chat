import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, PrimaryColumn, OneToOne } from 'typeorm';
import { User } from './User';

@Entity('equipment')
export class Equipment {
  @PrimaryColumn({ type: 'int' })
  id!: number; 

  @Column('bigint', { nullable: true })
  egg!: string; 

  @OneToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'id' })
  user!: User;
}