import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteEntity } from './invite.entity';
import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';
import { MemberEntity } from '../membership/member.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([InviteEntity, MemberEntity]),
    ],
    controllers: [InviteController],
    providers: [InviteService],
    exports: [InviteService],
})
export class InviteModule { }
