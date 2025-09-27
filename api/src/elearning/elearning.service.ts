import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { CreateCourseLessonDto } from './dto/create-course-lesson.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuizAttemptDto } from './dto/create-quiz-attempt.dto';

@Injectable()
export class ElearningService {
  constructor(private prisma: PrismaService) {}

  // Course Management
  async createCourse(
    createCourseDto: CreateCourseDto,
    createdByAppUserId: string,
  ) {
    return this.prisma.course.create({
      data: {
        title: createCourseDto.title,
        description: createCourseDto.description,
        shortDescription: createCourseDto.shortDescription,
        categoryId: createCourseDto.categoryId,
        difficultyLevel: createCourseDto.difficultyLevel,
        estimatedDuration: createCourseDto.estimatedDuration,
        thumbnailUrl: createCourseDto.thumbnailUrl,
        status: createCourseDto.status,
        createdBy: createdByAppUserId,
      },
      include: {
        category: true,
        creator: true,
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });
  }

  async findAllCourses(filters?: {
    categoryId?: string;
    status?: string;
    difficultyLevel?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.difficultyLevel) {
      where.difficultyLevel = filters.difficultyLevel;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { shortDescription: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.course.findMany({
      where,
      include: {
        category: true,
        creator: true,
        modules: {
          include: {
            lessons: true,
          },
        },
        enrollments: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCourseById(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        creator: true,
        modules: {
          include: {
            lessons: {
              include: {
                quizzes: {
                  include: {
                    questions: {
                      include: {
                        answers: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        enrollments: {
          include: {
            user: true,
          },
        },
        discussions: {
          include: {
            user: true,
            replies: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }

  async updateCourse(id: string, updateCourseDto: UpdateCourseDto) {
    return this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
      include: {
        category: true,
        creator: true,
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });
  }

  async deleteCourse(id: string) {
    return this.prisma.course.delete({
      where: { id },
    });
  }

  // Course Module Management
  async createCourseModule(createCourseModuleDto: CreateCourseModuleDto) {
    return this.prisma.courseModule.create({
      data: createCourseModuleDto,
      include: {
        course: true,
        lessons: true,
      },
    });
  }

  async updateCourseModule(id: string, updateData: Partial<CreateCourseModuleDto>) {
    return this.prisma.courseModule.update({
      where: { id },
      data: updateData,
      include: {
        course: true,
        lessons: true,
      },
    });
  }

  async deleteCourseModule(id: string) {
    return this.prisma.courseModule.delete({
      where: { id },
    });
  }

  // Course Lesson Management
  async createCourseLesson(createCourseLessonDto: CreateCourseLessonDto) {
    return this.prisma.courseLesson.create({
      data: createCourseLessonDto,
      include: {
        module: {
          include: {
            course: true,
          },
        },
        quizzes: true,
      },
    });
  }

  async updateCourseLesson(id: string, updateData: Partial<CreateCourseLessonDto>) {
    return this.prisma.courseLesson.update({
      where: { id },
      data: updateData,
      include: {
        module: {
          include: {
            course: true,
          },
        },
        quizzes: true,
      },
    });
  }

  async deleteCourseLesson(id: string) {
    return this.prisma.courseLesson.delete({
      where: { id },
    });
  }

  // Course Enrollment Management
  async enrollInCourse(userId: string, courseId: string) {
    // Check if already enrolled
    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return existingEnrollment;
    }

    return this.prisma.courseEnrollment.create({
      data: {
        userId,
        courseId,
      },
      include: {
        user: true,
        course: true,
      },
    });
  }

  async getUserEnrollments(userId: string) {
    return this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            category: true,
            creator: true,
          },
        },
        progress: {
          include: {
            lesson: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async updateLessonProgress(
    enrollmentId: string,
    lessonId: string,
    timeSpent: number,
    status: string,
  ) {
    return this.prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId,
          lessonId,
        },
      },
      update: {
        timeSpent,
        status: status as any,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
      create: {
        enrollmentId,
        lessonId,
        timeSpent,
        status: status as any,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }

  // Quiz Management
  async createQuiz(createQuizDto: CreateQuizDto) {
    return this.prisma.courseQuiz.create({
      data: createQuizDto,
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });
  }

  async submitQuizAttempt(createQuizAttemptDto: CreateQuizAttemptDto, userId: string) {
    const { quizId, answers, timeTaken } = createQuizAttemptDto;

    // Get the quiz with questions and correct answers
    const quiz = await this.prisma.courseQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Calculate score
    let correctAnswers = 0;
    let totalQuestions = quiz.questions.length;

    for (const question of quiz.questions) {
      const userAnswer = answers.find(a => a.questionId === question.id);
      if (userAnswer) {
        const correctAnswer = question.answers.find(a => a.isCorrect);
        if (correctAnswer && userAnswer.answerId === correctAnswer.id) {
          correctAnswers++;
        }
      }
    }

    const score = (correctAnswers / totalQuestions) * 100;
    const passed = score >= quiz.passingScore;

    // Get enrollment
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: {
        userId,
        course: {
          modules: {
            some: {
              lessons: {
                some: {
                  quizzes: {
                    some: {
                      id: quizId,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error('User not enrolled in course');
    }

    return this.prisma.quizAttempt.create({
      data: {
        enrollmentId: enrollment.id,
        quizId,
        score,
        passed,
        timeTaken,
        attemptNumber: 1, // TODO: Calculate actual attempt number
      },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                answers: true,
              },
            },
          },
        },
      },
    });
  }

  // Certificate Management
  async generateCertificate(userId: string, courseId: string) {
    // Check if user completed the course
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        course: true,
        progress: true,
      },
    });

    if (!enrollment) {
      throw new Error('User not enrolled in course');
    }

    // Check if all required lessons are completed
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              where: { isRequired: true },
            },
          },
        },
      },
    });

    const requiredLessons = course?.modules.flatMap(m => m.lessons) || [];
    const completedLessons = enrollment.progress.filter(p => p.status === 'COMPLETED');

    if (completedLessons.length < requiredLessons.length) {
      throw new Error('Course not completed');
    }

    // Generate certificate
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const verificationCode = Math.random().toString(36).substr(2, 12);

    return this.prisma.certificate.create({
      data: {
        userId,
        courseId,
        certificateNumber,
        verificationCode,
      },
      include: {
        user: true,
        course: true,
      },
    });
  }

  // Discussion Management
  async createDiscussion(courseId: string, userId: string, title: string, content: string) {
    return this.prisma.courseDiscussion.create({
      data: {
        courseId,
        userId,
        title,
        content,
      },
      include: {
        user: true,
        replies: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async createDiscussionReply(
    discussionId: string,
    userId: string,
    content: string,
    isSolution = false,
  ) {
    return this.prisma.discussionReply.create({
      data: {
        discussionId,
        userId,
        content,
        isSolution,
      },
      include: {
        user: true,
        discussion: {
          include: {
            course: true,
          },
        },
      },
    });
  }

  // Analytics
  async getElearningStats() {
    const [
      totalCourses,
      totalEnrollments,
      totalCertificates,
      activeCourses,
      completedCourses,
    ] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.courseEnrollment.count(),
      this.prisma.certificate.count(),
      this.prisma.course.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.courseEnrollment.count({
        where: { completedAt: { not: null } },
      }),
    ]);

    return {
      totalCourses,
      totalEnrollments,
      totalCertificates,
      activeCourses,
      completedCourses,
    };
  }
}