import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoticeEntity, NoticeType } from './notice.entity';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/notice.dto';

@Injectable()
export class NoticesService {
    constructor(
        @InjectRepository(NoticeEntity)
        private readonly noticeRepo: Repository<NoticeEntity>,
    ) { }

    async create(dto: CreateNoticeDto): Promise<NoticeEntity> {
        // 如果是发布，可以将其他的设为非激活（可选，当前简单实现，取最新即可）
        const notice = this.noticeRepo.create(dto);
        return this.noticeRepo.save(notice);
    }

    async findAll(type?: NoticeType): Promise<NoticeEntity[]> {
        const where: any = {};
        if (type) {
            where.type = type;
        }
        return this.noticeRepo.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async findLatestActive(type: NoticeType): Promise<NoticeEntity> {
        const notice = await this.noticeRepo.findOne({
            where: { type, isActive: true },
            order: { createdAt: 'DESC' },
        });

        if (!notice) {
            throw new NotFoundException(`No active ${type} found`);
        }

        return notice;
    }

    async update(id: string, dto: UpdateNoticeDto): Promise<NoticeEntity> {
        const notice = await this.noticeRepo.findOne({ where: { id } });
        if (!notice) {
            throw new NotFoundException('Notice not found');
        }
        Object.assign(notice, dto);
        return this.noticeRepo.save(notice);
    }

    async remove(id: string): Promise<void> {
        const result = await this.noticeRepo.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException('Notice not found');
        }
    }
}
