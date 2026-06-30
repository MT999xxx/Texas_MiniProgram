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
  ) { }

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

  async update(id: string, dto: Partial<TableEntity>): Promise<TableEntity> {
    const table = await this.repo.findOne({ where: { id } });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (dto.name !== undefined) table.name = dto.name;
    if (dto.category !== undefined) table.category = dto.category;
    if (dto.capacity !== undefined) table.capacity = dto.capacity;

    return this.repo.save(table);
  }

  async delete(id: string): Promise<void> {
    const table = await this.repo.findOne({ where: { id } });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    await this.repo.remove(table);
  }

  async joinWaitingList(tableId: string) {
    const table = await this.repo.findOne({ where: { id: tableId } });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return {
      tableId: table.id,
      tableName: table.name,
      status: 'WAITING',
      message: 'Joined waiting list',
    };
  }

  /**
   * 重置所有桌位状态为可用
   * 用于每日凌晨自动重置或管理员手动触发
   */
  async resetAllTables(): Promise<{ count: number }> {
    const result = await this.repo.update(
      { status: TableStatus.RESERVED },
      { status: TableStatus.AVAILABLE }
    );
    const inUseResult = await this.repo.update(
      { status: TableStatus.IN_USE },
      { status: TableStatus.AVAILABLE }
    );
    return { count: (result.affected || 0) + (inUseResult.affected || 0) };
  }
}
