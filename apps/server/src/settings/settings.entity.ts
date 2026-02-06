import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 系统配置实体
 * 使用 key-value 模式存储各类系统配置
 */
@Entity('system_settings')
export class SystemSettingEntity {
    @ApiProperty({ description: '配置键' })
    @PrimaryColumn({ length: 64 })
    key!: string;

    @ApiProperty({ description: '配置值（JSON格式）' })
    @Column({ type: 'text' })
    value!: string;

    @ApiProperty({ description: '配置描述' })
    @Column({ length: 255, nullable: true })
    description?: string;

    @ApiProperty({ description: '更新时间' })
    @UpdateDateColumn()
    updatedAt!: Date;
}
