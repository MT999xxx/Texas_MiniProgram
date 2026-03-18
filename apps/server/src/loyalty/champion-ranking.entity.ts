import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { MemberEntity } from '../membership/member.entity';

export enum ChampionType {
  WEEKLY = 'champion_weekly',
  MONTHLY = 'champion_monthly',
}

@Entity('champion_rankings')
@Unique(['type', 'rank'])
@Unique(['type', 'memberId'])
export class ChampionRankingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ChampionType })
  type!: ChampionType;

  @Column({ type: 'int' })
  rank!: number;

  @ManyToOne(() => MemberEntity, { eager: true })
  @JoinColumn({ name: 'memberId' })
  member!: MemberEntity;

  @Column()
  memberId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
