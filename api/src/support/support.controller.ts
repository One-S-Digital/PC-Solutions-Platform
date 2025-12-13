import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto, CreateTicketResponseDto, UpdateTicketStatusDto } from './dto/support.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

/**
 * Standard API response envelope
 */
interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

function wrapResponse<T>(data: T, message = 'OK'): ApiResponseEnvelope<T> {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

@ApiTags('support')
@Controller('support')
@UseGuards(ClerkAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ============================================
  // USER ENDPOINTS
  // ============================================

  @Post('tickets')
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  async createTicket(@Request() req, @Body() createTicketDto: CreateTicketDto) {
    const userId = req.context.profileUserId; // Use profileUserId (User table ID) not appUserId (AppUser table ID)
    const ticket = await this.supportService.createTicket(userId, createTicketDto);
    return wrapResponse(ticket, 'Ticket created successfully');
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get all tickets for the current user' })
  @ApiResponse({ status: 200, description: 'Tickets retrieved successfully' })
  async getMyTickets(@Request() req) {
    const userId = req.context.profileUserId; // Use profileUserId (User table ID) not appUserId (AppUser table ID)
    const tickets = await this.supportService.getUserTickets(userId);
    return wrapResponse(tickets);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get a specific ticket' })
  @ApiResponse({ status: 200, description: 'Ticket retrieved successfully' })
  async getTicket(@Request() req, @Param('id') ticketId: string) {
    const userId = req.context.profileUserId; // Use profileUserId (User table ID) not appUserId (AppUser table ID)
    const isAdmin =
      req.context.role === UserRole.ADMIN || req.context.role === UserRole.SUPER_ADMIN;
    const ticket = await this.supportService.getTicketById(ticketId, userId, isAdmin);
    return wrapResponse(ticket);
  }

  @Post('tickets/:id/respond')
  @ApiOperation({ summary: 'Add a response to a ticket' })
  @ApiResponse({ status: 200, description: 'Response added successfully' })
  async respondToTicket(
    @Request() req,
    @Param('id') ticketId: string,
    @Body() responseDto: CreateTicketResponseDto,
  ) {
    const userId = req.context.profileUserId; // Use profileUserId (User table ID) not appUserId (AppUser table ID)
    const isAdmin =
      req.context.role === UserRole.ADMIN || req.context.role === UserRole.SUPER_ADMIN;
    const ticket = await this.supportService.addResponse(
      ticketId,
      userId,
      responseDto.message,
      isAdmin,
      {
        attachmentUrl: responseDto.attachmentUrl,
        attachmentName: responseDto.attachmentName,
        attachmentSize: responseDto.attachmentSize,
        attachmentMimeType: responseDto.attachmentMimeType,
      },
    );
    return wrapResponse(ticket, 'Response added successfully');
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get('admin/tickets')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all tickets (admin)' })
  @ApiResponse({ status: 200, description: 'Tickets retrieved successfully' })
  async getAllTickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const tickets = await this.supportService.getAllTickets({
      status,
      priority,
      category,
      search,
    });
    return wrapResponse(tickets);
  }

  @Patch('admin/tickets/:id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update ticket status (admin)' })
  @ApiResponse({ status: 200, description: 'Ticket status updated successfully' })
  async updateTicketStatus(
    @Request() req,
    @Param('id') ticketId: string,
    @Body() statusDto: UpdateTicketStatusDto,
  ) {
    const adminUserId = req.context.profileUserId; // Use profileUserId (User table ID) not appUserId (AppUser table ID)
    const ticket = await this.supportService.updateTicketStatus(
      ticketId,
      statusDto.status,
      adminUserId,
    );
    return wrapResponse(ticket, 'Ticket status updated successfully');
  }

  @Patch('admin/tickets/:id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign ticket to admin (admin)' })
  @ApiResponse({ status: 200, description: 'Ticket assigned successfully' })
  async assignTicket(
    @Request() req,
    @Param('id') ticketId: string,
    @Body('assigneeId') assigneeId?: string,
  ) {
    // If no assigneeId provided, assign to current admin
    const userId = assigneeId || req.context.profileUserId; // Use profileUserId (User table ID) not appUserId (AppUser table ID)
    const ticket = await this.supportService.assignTicket(ticketId, userId);
    return wrapResponse(ticket, 'Ticket assigned successfully');
  }

  @Get('admin/stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get ticket statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getTicketStats() {
    const stats = await this.supportService.getTicketStats();
    return wrapResponse(stats);
  }
}
