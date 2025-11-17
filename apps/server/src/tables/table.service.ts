import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTableDto } from './dto/create-table.dto';
import { TableCategory, TableEntity, TableStatus } from './table.entity';

@Injectable()
export class TableService {
  constructor(
    @InjectRepository(TableEntity)
    private readonly repo: Repository<TableEntity>,
  ) {}

  async create(dto: CreateTableDto): Promise<TableEntity> {
    const table = this.repo.create({
      name: dto.name,
      category: dto.category,
      capacity: dto.capacity,
      status: TableStatus.AVAILABLE,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(table);
  }

  async list(filter?: { category?: TableCategory; status?: TableStatus }): Promise<TableEntity[]> {
    const where: Partial<TableEntity> = {};
    if (filter?.category) where.category = filter.category;
    if (filter?.status) where.status = filter.status;
    return this.repo.find({ where });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: TableStatus): Promise<TableEntity> {
    const table = await this.repo.findOne({ where: { id } });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    table.status = status;
    return this.repo.save(table);
  }
}
