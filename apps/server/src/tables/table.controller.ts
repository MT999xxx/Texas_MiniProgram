import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TableService } from './table.service';
import { CreateTableDto } from './dto/create-table.dto';
import { TableCategory, TableStatus } from './table.entity';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@ApiTags('Tables')
@Controller('tables')
export class TableController {
  constructor(private readonly tableService: TableService) { }

  @Post()
  @ApiCreatedResponse({ description: '创建桌位成功' })
  @ApiBadRequestResponse({ description: '参数不合法' })
  create(@Body() dto: CreateTableDto) {
    return this.tableService.create(dto);
  }

  @Get()
  @ApiOkResponse({ description: '桌位列表' })
  list(
    @Query('category') category?: TableCategory,
    @Query('status') status?: TableStatus,
  ) {
    return this.tableService.list({ category, status });
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '更新桌位状态成功' })
  @ApiBadRequestResponse({ description: '桌位不存在或状态非法' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTableStatusDto) {
    return this.tableService.updateStatus(id, dto.status);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '更新桌位成功' })
  @ApiBadRequestResponse({ description: '桌位不存在或参数非法' })
  update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tableService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: '删除桌位成功' })
  @ApiBadRequestResponse({ description: '桌位不存在' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.tableService.delete(id);
  }
}
