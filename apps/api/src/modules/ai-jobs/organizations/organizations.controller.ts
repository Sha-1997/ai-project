import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseInterceptors,
  UploadedFile,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { PatchOrganizationDto } from '../dto/patch-organization.dto';

import { FileInterceptor } from '@nestjs/platform-express';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrg(@Req() req: any, @Body() dto: CreateOrganizationDto) {
    const userId = req.user.sub;
    return this.organizationsService.createOrganization(userId, dto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMyOrg(@Req() req: any) {
    const userId = req.user.sub;
    return this.organizationsService.getOrganizationForUser(userId);
  }

@Patch('me')
@UseInterceptors(
  FileInterceptor('logo')
)
async updateOrg(
  @Req() req: any,

  @UploadedFile() logo: Express.Multer.File,

  @Body() dto: PatchOrganizationDto,
) {

  console.log('LOGO FILE:', logo);

  const userId = req.user.sub;

  return this.organizationsService.updateOrganization(
    userId,
    dto,
    logo,
  );
}

  @Get(':id/members')
  @HttpCode(HttpStatus.OK)
  async getMembers(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.organizationsService.getOrganizationMembers(userId, id);
  }
}
