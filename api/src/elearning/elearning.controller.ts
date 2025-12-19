import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ElearningService } from './elearning.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/create-course.dto';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { CreateCourseLessonDto } from './dto/create-course-lesson.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuizAttemptDto } from './dto/create-quiz-attempt.dto';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('elearning')
@UseGuards(RolesGuard)
export class ElearningController {
  constructor(private readonly elearningService: ElearningService) {}

  // Course Management
  @Post('courses')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  createCourse(@Body() createCourseDto: CreateCourseDto, @Request() req) {
    const createdByAppUserId = req.context.userId;
    return this.elearningService.createCourse(createCourseDto, createdByAppUserId);
  }

  @Get('courses')
  findAllCourses(
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('difficultyLevel') difficultyLevel?: string,
    @Query('search') search?: string,
  ) {
    return this.elearningService.findAllCourses({
      categoryId,
      status,
      difficultyLevel,
      search,
    });
  }

  @Get('courses/:id')
  findCourseById(@Param('id') id: string) {
    return this.elearningService.findCourseById(id);
  }

  @Patch('courses/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  updateCourse(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.elearningService.updateCourse(id, updateCourseDto);
  }

  @Delete('courses/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteCourse(@Param('id') id: string) {
    return this.elearningService.deleteCourse(id);
  }

  // Course Module Management
  @Post('modules')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  createCourseModule(@Body() createCourseModuleDto: CreateCourseModuleDto) {
    return this.elearningService.createCourseModule(createCourseModuleDto);
  }

  @Patch('modules/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  updateCourseModule(@Param('id') id: string, @Body() updateData: any) {
    return this.elearningService.updateCourseModule(id, updateData);
  }

  @Delete('modules/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  deleteCourseModule(@Param('id') id: string) {
    return this.elearningService.deleteCourseModule(id);
  }

  // Course Lesson Management
  @Post('lessons')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  createCourseLesson(@Body() createCourseLessonDto: CreateCourseLessonDto) {
    return this.elearningService.createCourseLesson(createCourseLessonDto);
  }

  @Patch('lessons/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  updateCourseLesson(@Param('id') id: string, @Body() updateData: any) {
    return this.elearningService.updateCourseLesson(id, updateData);
  }

  @Delete('lessons/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  deleteCourseLesson(@Param('id') id: string) {
    return this.elearningService.deleteCourseLesson(id);
  }

  // Course Enrollment
  @Post('courses/:id/enroll')
  async enrollInCourse(@Param('id') courseId: string, @Request() req) {
    const userId = req.context.userId;
    return this.elearningService.enrollInCourse(userId, courseId);
  }

  @Get('my-enrollments')
  getUserEnrollments(@Request() req) {
    const userId = req.context.userId;
    return this.elearningService.getUserEnrollments(userId);
  }

  @Post('lessons/:id/progress')
  updateLessonProgress(
    @Param('id') lessonId: string,
    @Body('timeSpent') timeSpent: number,
    @Body('status') status: string,
    @Request() req,
  ) {
    const userId = req.context.userId;
    // Get enrollment for this lesson
    // This is a simplified implementation - in practice, you'd need to find the enrollment
    return this.elearningService.updateLessonProgress('enrollment-id', lessonId, timeSpent, status);
  }

  // Quiz Management
  @Post('quizzes')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  createQuiz(@Body() createQuizDto: CreateQuizDto) {
    return this.elearningService.createQuiz(createQuizDto);
  }

  @Post('quizzes/:id/attempt')
  submitQuizAttempt(@Param('id') quizId: string, @Body() createQuizAttemptDto: CreateQuizAttemptDto, @Request() req) {
    const userId = req.context.userId;
    return this.elearningService.submitQuizAttempt(createQuizAttemptDto, userId);
  }

  // Certificate Management
  @Post('courses/:id/certificate')
  generateCertificate(@Param('id') courseId: string, @Request() req) {
    const userId = req.context.userId;
    return this.elearningService.generateCertificate(userId, courseId);
  }

  // Discussion Management
  @Post('courses/:id/discussions')
  createDiscussion(
    @Param('id') courseId: string,
    @Body('title') title: string,
    @Body('content') content: string,
    @Request() req,
  ) {
    const userId = req.context.userId;
    return this.elearningService.createDiscussion(courseId, userId, title, content);
  }

  @Post('discussions/:id/replies')
  createDiscussionReply(
    @Param('id') discussionId: string,
    @Body('content') content: string,
    @Body('isSolution') isSolution: boolean,
    @Request() req,
  ) {
    const userId = req.context.userId;
    return this.elearningService.createDiscussionReply(discussionId, userId, content, isSolution);
  }

  // Analytics
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getElearningStats() {
    return this.elearningService.getElearningStats();
  }
}