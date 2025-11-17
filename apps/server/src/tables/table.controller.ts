import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TableService } from './table.service';
import { CreateTableDto } from './dto/create-table.dto';
import { TableCategory, TableStatus } from './table.entity';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';

@ApiTags('Tables')
@Controller('tables')
export class TableController {
  constructor(private readonly tableService: TableService) {}

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
}
