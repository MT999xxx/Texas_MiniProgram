import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

// 允许的图片类型
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// 图片存储配置
const imageStorage = diskStorage({
    destination: join(process.cwd(), 'public', 'uploads'),
    filename: (req, file, callback) => {
        // 生成唯一文件名: 时间戳 + 随机数 + 原扩展名
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = extname(file.originalname);
        callback(null, `${uniqueSuffix}${ext}`);
    },
});

// 文件过滤器
const imageFileFilter = (req: any, file: Express.Multer.File, callback: any) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(new BadRequestException('仅支持 JPG, PNG, GIF, WEBP 格式的图片'), false);
    }
};

@ApiTags('Upload')
@Controller('uploads')
export class UploadController {
    @Post('image')
    @ApiOperation({ summary: '上传图片' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: '图片文件',
                },
            },
        },
    })
    @ApiOkResponse({
        description: '上传成功',
        schema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: '图片访问 URL' },
                filename: { type: 'string', description: '文件名' },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: imageStorage,
            fileFilter: imageFileFilter,
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB 限制
            },
        }),
    )
    uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('请选择要上传的图片');
        }

        // 返回图片访问 URL
        const url = `/static/uploads/${file.filename}`;
        return {
            url,
            filename: file.filename,
        };
    }

    @Post('avatar')
    @ApiOperation({ summary: '上传头像' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: '头像图片',
                },
            },
        },
    })
    @ApiOkResponse({
        description: '上传成功',
        schema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: '头像完整URL' },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: imageStorage,
            fileFilter: imageFileFilter,
            limits: {
                fileSize: 2 * 1024 * 1024, // 2MB 限制
            },
        }),
    )
    uploadAvatar(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('请选择头像图片');
        }

        // 返回头像完整 URL（用于网页显示）
        const baseUrl = process.env.BASE_URL || 'https://dezhoubar.xyz';
        const url = `${baseUrl}/static/uploads/${file.filename}`;
        return {
            url,
            filename: file.filename,
        };
    }
}

