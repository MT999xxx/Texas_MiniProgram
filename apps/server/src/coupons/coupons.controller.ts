import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags, ApiBadRequestResponse } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, ClaimCouponDto } from './dto/create-coupon.dto';
import { CouponStatus } from './coupon.entity';
import { UserCouponStatus } from './user-coupon.entity';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @ApiCreatedResponse({ description: '创建优惠券成功' })
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  @ApiOkResponse({ description: '优惠券列表' })
  findAll() {
    return this.couponsService.findAll();
  }

  @Get('available')
  @ApiOkResponse({ description: '可领取优惠券列表' })
  getAvailableCoupons(@Query('memberId') memberId?: string) {
    return this.couponsService.getAvailableCoupons(memberId);
  }

  @Get('my-coupons/:memberId')
  @ApiOkResponse({ description: '我的优惠券列表' })
  getUserCoupons(
    @Param('memberId') memberId: string,
    @Query('status') status?: UserCouponStatus,
  ) {
    return this.couponsService.getUserCoupons(memberId, status);
  }

  @Get(':id')
  @ApiOkResponse({ description: '优惠券详情' })
  findById(@Param('id') id: string) {
    return this.couponsService.findById(id);
  }

  @Post(':id/claim')
  @ApiCreatedResponse({ description: '领取优惠券成功' })
  @ApiBadRequestResponse({ description: '领取失败' })
  claimCoupon(@Param('id') id: string, @Body() dto: ClaimCouponDto) {
    return this.couponsService.claimCoupon(id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: '更新优惠券状态成功' })
  updateStatus(@Param('id') id: string, @Body() body: { status: CouponStatus }) {
    return this.couponsService.updateStatus(id, body.status);
  }
}