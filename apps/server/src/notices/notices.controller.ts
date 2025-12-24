import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NoticesService } from './notices.service';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/notice.dto';
import { NoticeType } from './notice.entity';

@ApiTags('Notices')
@Controller('notices')
export class NoticesController {
    constructor(private readonly noticesService: NoticesService) { }

    @Post()
    @ApiOperation({ summary: '发布公告/活动' })
    create(@Body() createNoticeDto: CreateNoticeDto) {
        return this.noticesService.create(createNoticeDto);
    }

    @Get()
    @ApiOperation({ summary: '获取公告/活动列表' })
    findAll(@Query('type') type?: NoticeType) {
        return this.noticesService.findAll(type);
    }

    @Get('latest')
    @ApiOperation({ summary: '获取最新的公告/活动' })
    findLatest(@Query('type') type: NoticeType) {
        return this.noticesService.findLatestActive(type);
    }

    @Patch(':id')
    @ApiOperation({ summary: '更新公告/活动' })
    update(@Param('id') id: string, @Body() updateNoticeDto: UpdateNoticeDto) {
        return this.noticesService.update(id, updateNoticeDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: '删除公告/活动' })
    remove(@Param('id') id: string) {
        return this.noticesService.remove(id);
    }
}
