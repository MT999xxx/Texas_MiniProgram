import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MemberEntity } from '../membership/member.entity';

/**
 * 邀请关系实体
 * 记录邀请人与被邀请人之间的关系，以及奖励发放状态
 */
@Entity('invites')
export class InviteEntity {
    @ApiProperty({ format: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ description: '邀请人ID' })
    @Column({ length: 64 })
    inviterId!: string;

    @ApiProperty({ description: '被邀请人ID' })
    @Column({ length: 64 })
    inviteeId!: string;

    @ApiProperty({ description: '邀请码' })
    @Column({ length: 32 })
    inviteCode!: string;

    @ApiProperty({ description: '邀请人是否已领取奖励' })
    @Column({ type: 'boolean', default: false })
    inviterRewarded!: boolean;

    @ApiProperty({ description: '被邀请人是否已领取奖励' })
    @Column({ type: 'boolean', default: false })
    inviteeRewarded!: boolean;

    @ApiProperty({ description: '被邀请人是否已消费' })
    @Column({ type: 'boolean', default: false })
    inviteeConsumed!: boolean;

    @ApiPropertyOptional({ description: '邀请人' })
    @ManyToOne(() => MemberEntity, { nullable: true })
    @JoinColumn({ name: 'inviterId', referencedColumnName: 'userId' })
    inviter?: MemberEntity;

    @ApiPropertyOptional({ description: '被邀请人' })
    @ManyToOne(() => MemberEntity, { nullable: true })
    @JoinColumn({ name: 'inviteeId', referencedColumnName: 'userId' })
    invitee?: MemberEntity;

    @ApiProperty({ type: String, format: 'date-time' })
    @CreateDateColumn()
    createdAt!: Date;
}
