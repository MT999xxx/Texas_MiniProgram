import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { MemberEntity } from '../membership/member.entity';

/**
 * 签到记录实体
 * 记录用户每天的签到行为和获得的积分
 */
@Entity('check_ins')
export class CheckInEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ description: '会员ID' })
    @Column()
    memberId!: string;

    @ManyToOne(() => MemberEntity)
    @JoinColumn({ name: 'memberId' })
    member?: MemberEntity;

    @ApiProperty({ description: '签到日期 (YYYY-MM-DD)' })
    @Column({ type: 'date' })
    checkInDate!: string;

    @ApiProperty({ description: '连续签到天数 (1-7)' })
    @Column({ type: 'int', default: 1 })
    consecutiveDays!: number;

    @ApiProperty({ description: '获得的积分' })
    @Column({ type: 'int' })
    pointsEarned!: number;

    @CreateDateColumn()
    createdAt!: Date;
}
