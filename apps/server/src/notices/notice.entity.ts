import { ApiProperty } from '@nestjs/swagger';
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum NoticeType {
    ANNOUNCEMENT = 'ANNOUNCEMENT', // 公告
    ACTIVITY = 'ACTIVITY',        // 活动
}

@Entity('notices')
export class NoticeEntity {
    @ApiProperty({ format: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ enum: NoticeType, description: '类型' })
    @Column({ type: 'enum', enum: NoticeType })
    type!: NoticeType;

    @ApiProperty({ description: '标题' })
    @Column({ length: 100 })
    title!: string;

    @ApiProperty({ description: '内容' })
    @Column({ type: 'text' })
    content!: string;

    @ApiProperty({ description: '是否激活' })
    @Column({ default: true })
    isActive!: boolean;

    @ApiProperty({ type: String, format: 'date-time' })
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty({ type: String, format: 'date-time' })
    @UpdateDateColumn()
    updatedAt!: Date;
}
