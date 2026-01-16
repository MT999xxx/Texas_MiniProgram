import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 邀请关系实体
 * 记录邀请人与被邀请人之间的关系，以及奖励发放状态
 * 注意：不使用外键约束，只存储 ID，避免 TypeORM 同步冲突
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

    @ApiProperty({ type: String, format: 'date-time' })
    @CreateDateColumn()
    createdAt!: Date;
}
