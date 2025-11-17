import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { MemberEntity } from './member.entity';

@Entity('membership_levels')
export class MembershipLevelEntity {
  @ApiProperty({ description: '等级编码' })
  @PrimaryColumn({ length: 24 })
  code!: string;

  @ApiProperty({ description: '等级名称' })
  @Column({ length: 48 })
  name!: string;

  @ApiProperty({ description: '积分门槛' })
  @Column({ type: 'int' })
  threshold!: number;

  @ApiPropertyOptional({ description: '折扣(0-1)' })
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  discount?: number;

  @ApiPropertyOptional({ description: '权益说明' })
  @Column({ length: 200, nullable: true })
  benefits?: string;

  @ApiPropertyOptional({ type: () => [MemberEntity] })
  @OneToMany(() => MemberEntity, (member) => member.level)
  members!: MemberEntity[];

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;
}
