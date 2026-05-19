import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailTemplateService {
  constructor(private prisma: PrismaService) {}

  private getStarterTemplates() {
    // These are the 4 templates the admin UI expects to manage out of the box.
    // IMPORTANT: Keep these idempotent and do not overwrite existing templates.
    return [
      {
        name: 'Account verification',
        event: 'account_verification',
        subject: 'Verify Your Account - Pro Crèche Solutions',
        category: 'authentication',
        variables: ['firstName', 'verificationUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Pro Crèche Solutions!</h2>
            <p>Hello {{firstName}},</p>
            <p>Thank you for registering with Pro Crèche Solutions. Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verificationUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a>
            </div>
            <p>If you didn't create an account, please ignore this email.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `
          Welcome to Pro Crèche Solutions!

          Hello {{firstName}},

          Thank you for registering with Pro Crèche Solutions. Please verify your email address by visiting the following link:

          {{verificationUrl}}

          If you didn't create an account, please ignore this email.

          Best regards,
          The Pro Crèche Solutions Team
        `.trim(),
        isActive: true,
      },
      {
        name: 'Password reset',
        event: 'password_reset',
        subject: 'Reset Your Password - Pro Crèche Solutions',
        category: 'authentication',
        variables: ['firstName', 'resetUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hello {{firstName}},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{resetUrl}}" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `
          Password Reset Request

          Hello {{firstName}},

          We received a request to reset your password. Visit the following link to create a new password:

          {{resetUrl}}

          This link will expire in 1 hour for security reasons.

          If you didn't request this password reset, please ignore this email.

          Best regards,
          The Pro Crèche Solutions Team
        `.trim(),
        isActive: true,
      },
      {
        name: 'Welcome email',
        event: 'welcome_email',
        subject: 'Welcome to Pro Crèche Solutions!',
        category: 'userManagement',
        variables: ['firstName', 'dashboardUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Pro Crèche Solutions!</h2>
            <p>Hello {{firstName}},</p>
            <p>Welcome to Pro Crèche Solutions! We're excited to have you join our community of childcare professionals.</p>
            <p>Here's what you can do next:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Explore job opportunities</li>
              <li>Connect with organizations</li>
              <li>Browse our marketplace</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Get Started</a>
            </div>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `
          Welcome to Pro Crèche Solutions!

          Hello {{firstName}},

          Welcome to Pro Crèche Solutions! We're excited to have you join our community of childcare professionals.

          Here's what you can do next:
          - Complete your profile
          - Explore job opportunities
          - Connect with organizations
          - Browse our marketplace

          Get started: {{dashboardUrl}}

          If you have any questions, feel free to contact our support team.

          Best regards,
          The Pro Crèche Solutions Team
        `.trim(),
        isActive: true,
      },
      {
        name: 'New message',
        event: 'new_message',
        subject: 'New Message from {{senderName}}',
        category: 'messaging',
        variables: ['firstName', 'senderName', 'messagePreview', 'messageUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Message</h2>
            <p>Hello {{firstName}},</p>
            <p>You have received a new message from <strong>{{senderName}}</strong>:</p>
            <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;">{{messagePreview}}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{messageUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Message</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `
          New Message

          Hello {{firstName}},

          You have received a new message from {{senderName}}:

          {{messagePreview}}

          View message: {{messageUrl}}

          Best regards,
          The Pro Crèche Solutions Team
        `.trim(),
        isActive: true,
      },
      {
        name: 'New lead',
        event: 'new_lead',
        subject: 'New Enquiry Received - {{foundationName}}',
        category: 'leadManagement',
        variables: ['foundationName', 'parentName', 'childAge', 'location', 'message', 'leadUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Parent Enquiry Received</h2>
            <p>Hello,</p>
            <p>A new parent enquiry has been matched with <strong>{{foundationName}}</strong>.</p>
            <p><strong>Enquiry Details:</strong></p>
            <ul>
              <li><strong>Parent Name:</strong> {{parentName}}</li>
              <li><strong>Child Age:</strong> {{childAge}} years</li>
              <li><strong>Preferred Location:</strong> {{location}}</li>
            </ul>
            <p><strong>Message from Parent:</strong></p>
            <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; font-style: italic;">
              "{{message}}"
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{leadUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Lead Details</a>
            </div>
            <p>Please respond to this enquiry as soon as possible to maximize your chances of enrollment.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `
          New Parent Enquiry Received

          Hello,

          A new parent enquiry has been matched with {{foundationName}}.

          Enquiry Details:
          - Parent Name: {{parentName}}
          - Child Age: {{childAge}} years
          - Preferred Location: {{location}}

          Message from Parent:
          "{{message}}"

          View lead details: {{leadUrl}}

          Please respond to this enquiry as soon as possible to maximize your chances of enrollment.

          Best regards,
          The Pro Crèche Solutions Team
        `.trim(),
        isActive: true,
      },
      {
        name: 'Parent lead confirmation',
        event: 'parent_lead_confirmation',
        subject: 'We received your childcare enquiry ({{enquiryReference}})',
        category: 'leadManagement',
        variables: [
          'parentName',
          'enquiryReference',
          'submittedAt',
          'childAge',
          'location',
          'message',
          'accountSetupUrl',
          'enquiriesUrl',
        ],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your enquiry has been received</h2>
            <p>Hello {{parentName}},</p>
            <p>Thank you for submitting your childcare enquiry. We have received it successfully.</p>
            <p><strong>Enquiry Summary:</strong></p>
            <ul>
              <li><strong>Reference:</strong> {{enquiryReference}}</li>
              <li><strong>Submitted at:</strong> {{submittedAt}}</li>
              <li><strong>Child age:</strong> {{childAge}}</li>
              <li><strong>Preferred location:</strong> {{location}}</li>
            </ul>
            <p><strong>Details:</strong></p>
            <p style="background-color: #F3F4F6; padding: 12px; border-radius: 6px;">{{message}}</p>
            <p>To track replies and manage your enquiry, set up your parent account:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{accountSetupUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Create Parent Account</a>
            </div>
            <p>If you already have an account, you can track enquiries here:</p>
            <p><a href="{{enquiriesUrl}}">{{enquiriesUrl}}</a></p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `
          Your enquiry has been received

          Hello {{parentName}},

          Thank you for submitting your childcare enquiry. We have received it successfully.

          Enquiry Summary:
          - Reference: {{enquiryReference}}
          - Submitted at: {{submittedAt}}
          - Child age: {{childAge}}
          - Preferred location: {{location}}

          Details:
          {{message}}

          To track replies and manage your enquiry, set up your parent account:
          {{accountSetupUrl}}

          If you already have an account, you can track enquiries here:
          {{enquiriesUrl}}

          Best regards,
          The Pro Crèche Solutions Team
        `.trim(),
        isActive: true,
      },
      // ── Replacement Staffing ───────────────────────────────────────────────
      {
        name: 'Replacement match proposed',
        event: 'replacement_match_proposed',
        subject: 'You have been proposed for a replacement shift',
        category: 'jobRecruitment',
        variables: ['firstName', 'role', 'startDate', 'endDate', 'location', 'requestUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Replacement shift proposed</h2>
            <p>Hello {{firstName}},</p>
            <p>You have been proposed for the following replacement shift:</p>
            <ul>
              <li><strong>Role:</strong> {{role}}</li>
              <li><strong>Dates:</strong> {{startDate}} – {{endDate}}</li>
              <li><strong>Location:</strong> {{location}}</li>
            </ul>
            <p>Please log in to accept or decline this proposal.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Proposal</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `
          Hello {{firstName}},

          You have been proposed for the following replacement shift:

          Role: {{role}}
          Dates: {{startDate}} – {{endDate}}
          Location: {{location}}

          Please log in to accept or decline this proposal:
          {{requestUrl}}

          Best regards,
          The Pro Crèche Solutions Team
        `.trim(),
        isActive: true,
      },
      {
        name: 'Replacement request posted',
        event: 'replacement_request_posted',
        subject: 'New replacement shift available',
        category: 'jobRecruitment',
        variables: ['firstName', 'role', 'startDate', 'endDate', 'location', 'urgency', 'requestUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>A replacement shift is available</h2>
            <p>Hello {{firstName}},</p>
            <p>A new replacement request matching your profile has been posted:</p>
            <ul>
              <li><strong>Role:</strong> {{role}}</li>
              <li><strong>Dates:</strong> {{startDate}} – {{endDate}}</li>
              <li><strong>Location:</strong> {{location}}</li>
              <li><strong>Urgency:</strong> {{urgency}}</li>
            </ul>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Request</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `A replacement shift is available\n\nHello {{firstName}},\n\nRole: {{role}} | Dates: {{startDate}} – {{endDate}} | Location: {{location}} | Urgency: {{urgency}}\n\nView: {{requestUrl}}\n\nBest regards,\nThe Pro Crèche Solutions Team`.trim(),
        isActive: true,
      },
      {
        name: 'Replacement match accepted',
        event: 'replacement_match_accepted',
        subject: 'Replacement match accepted — {{role}}',
        category: 'jobRecruitment',
        variables: ['firstName', 'role', 'startDate', 'endDate', 'requestUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>An educator accepted your replacement request</h2>
            <p>Hello {{firstName}},</p>
            <p>An educator has accepted your replacement request for <strong>{{role}}</strong> ({{startDate}} – {{endDate}}).</p>
            <p>Please confirm the match in your dashboard.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Confirm Match</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `Hello {{firstName}},\n\nAn educator accepted your replacement request for {{role}} ({{startDate}} – {{endDate}}).\nConfirm at: {{requestUrl}}\n\nBest regards,\nThe Pro Crèche Solutions Team`.trim(),
        isActive: true,
      },
      {
        name: 'Replacement match declined',
        event: 'replacement_match_declined',
        subject: 'Replacement match declined — {{role}}',
        category: 'jobRecruitment',
        variables: ['firstName', 'role', 'startDate', 'endDate', 'requestUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Replacement match declined</h2>
            <p>Hello {{firstName}},</p>
            <p>An educator has declined your replacement request for <strong>{{role}}</strong> ({{startDate}} – {{endDate}}).</p>
            <p>You can find another match or re-open the request from your dashboard.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Manage Request</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `Hello {{firstName}},\n\nAn educator declined your replacement request for {{role}} ({{startDate}} – {{endDate}}).\nManage at: {{requestUrl}}\n\nBest regards,\nThe Pro Crèche Solutions Team`.trim(),
        isActive: true,
      },
      {
        name: 'Replacement pool low',
        event: 'replacement_pool_low',
        subject: 'Low replacement pool alert for your region',
        category: 'systemAdmin',
        variables: ['firstName', 'poolSize', 'adminUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Replacement Pool Alert</h2>
            <p>Hello {{firstName}},</p>
            <p>The number of educators available for replacement shifts in your region has dropped below the recommended level (<strong>{{poolSize}}</strong> available).</p>
            <p>Consider encouraging educators to enable their availability for replacement shifts.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{adminUrl}}" style="background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Replacement Pool</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `Hello {{firstName}},\n\nReplacement pool in your region is low ({{poolSize}} available).\nView at: {{adminUrl}}\n\nBest regards,\nThe Pro Crèche Solutions Team`.trim(),
        isActive: true,
      },
      // ── Educator Approval ──────────────────────────────────────────────────
      {
        name: 'Educator application received',
        event: 'educator_pending',
        subject: 'Application received — pending review',
        category: 'userManagement',
        variables: ['firstName', 'supportUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Application Received!</h2>
            <p>Hello {{firstName}},</p>
            <p>Thank you for signing up as an educator on Pro Crèche Solutions. We have received your application and it is now being reviewed by our team.</p>
            <p>You will receive another email once your application has been processed. In the meantime, you can log in and explore the platform — full access will be unlocked once approved.</p>
            <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;"><strong>What happens next?</strong></p>
              <ul style="margin: 8px 0 0 0; padding-left: 16px;">
                <li>Our team reviews your submitted profile</li>
                <li>You receive an approval or feedback email</li>
                <li>Once approved, you get full access to the platform</li>
              </ul>
            </div>
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{supportUrl}}" style="background-color: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Contact Support</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `
          Application Received!

          Hello {{firstName}},

          Thank you for signing up as an educator on Pro Crèche Solutions. We have received your application and it is now being reviewed by our team.

          You will receive another email once your application has been processed.

          Questions? Contact our support team: {{supportUrl}}

          Best regards,
          The Pro Crèche Solutions Team
        `.trim(),
        isActive: true,
      },
      {
        name: 'Educator profile approved',
        event: 'educator_approved',
        subject: 'Your educator profile has been approved!',
        category: 'userManagement',
        variables: ['firstName', 'dashboardUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Profile Has Been Approved!</h2>
            <p>Hello {{firstName}},</p>
            <p>Great news! Your educator profile on Pro Crèche Solutions has been reviewed and <strong>approved</strong> by our team.</p>
            <p>You now have full access to the platform. Here's what you can do:</p>
            <ul>
              <li>Browse and apply for job listings</li>
              <li>Complete your professional profile</li>
              <li>Join the candidate pool for replacement shifts</li>
              <li>Connect with childcare organisations</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to My Dashboard</a>
            </div>
            <p>Welcome to the Pro Crèche Solutions community!</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `
          Your Profile Has Been Approved!

          Hello {{firstName}},

          Great news! Your educator profile on Pro Crèche Solutions has been reviewed and approved by our team.

          You now have full access to the platform. Go to your dashboard: {{dashboardUrl}}

          Welcome to the Pro Crèche Solutions community!

          Best regards,
          The Pro Crèche Solutions Team
        `.trim(),
        isActive: true,
      },
      {
        name: 'Educator profile rejected',
        event: 'educator_rejected',
        subject: 'Update on your educator profile application',
        category: 'userManagement',
        variables: ['firstName', 'rejectionNotes', 'supportUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Update on Your Educator Application</h2>
            <p>Hello {{firstName}},</p>
            <p>Thank you for your interest in joining Pro Crèche Solutions as an educator. After reviewing your profile, we are unable to approve your application at this time.</p>
            <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;"><strong>Reason:</strong> {{rejectionNotes}}</p>
            </div>
            <p>If you believe this decision was made in error, or if you have additional information to share, please contact our support team.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{supportUrl}}" style="background-color: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Contact Support</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `.trim(),
        textContent: `
          Update on Your Educator Application

          Hello {{firstName}},

          Thank you for your interest in joining Pro Crèche Solutions as an educator. After reviewing your profile, we are unable to approve your application at this time.

          Reason: {{rejectionNotes}}

          If you believe this decision was made in error, please contact our support team: {{supportUrl}}

          Best regards,
          The Pro Crèche Solutions Team
        `.trim(),
        isActive: true,
      },
    ];
  }

  private async ensureStarterTemplatesExist(): Promise<void> {
    // createMany + skipDuplicates ensures we only INSERT missing events and never overwrite admin edits.
    const data = this.getStarterTemplates();
    await this.prisma.emailTemplate.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async getTemplate(event: string): Promise<any> {
    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        event,
        isActive: true,
      },
    });

    if (!template) {
      // Return default template if none found
      return this.getDefaultTemplate(event);
    }

    return template;
  }

  async createTemplate(templateData: any): Promise<any> {
    return this.prisma.emailTemplate.create({
      data: templateData,
    });
  }

  async updateTemplate(id: string, templateData: any): Promise<any> {
    return this.prisma.emailTemplate.update({
      where: { id },
      data: templateData,
    });
  }

  async getAllTemplates(): Promise<any[]> {
    // If seeding didn't run (common in prod/deploy), make sure the admin UI still has templates to manage.
    await this.ensureStarterTemplatesExist();
    return this.prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDefaultTemplate(event: string): Promise<any> {
    const defaultTemplates = {
      // Authentication & Security
      account_verification: {
        subject: 'Verify Your Account - Pro Crèche Solutions',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Pro Crèche Solutions!</h2>
            <p>Hello {{firstName}},</p>
            <p>Thank you for registering with Pro Crèche Solutions. Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verificationUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a>
            </div>
            <p>If you didn't create an account, please ignore this email.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Welcome to Pro Crèche Solutions!
          
          Hello {{firstName}},
          
          Thank you for registering with Pro Crèche Solutions. Please verify your email address by visiting the following link:
          
          {{verificationUrl}}
          
          If you didn't create an account, please ignore this email.
          
          Best regards,
          The Pro Crèche Solutions Team
        `,
      },
      password_reset: {
        subject: 'Reset Your Password - Pro Crèche Solutions',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hello {{firstName}},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{resetUrl}}" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Password Reset Request
          
          Hello {{firstName}},
          
          We received a request to reset your password. Visit the following link to create a new password:
          
          {{resetUrl}}
          
          This link will expire in 1 hour for security reasons.
          
          If you didn't request this password reset, please ignore this email.
          
          Best regards,
          The Pro Crèche Solutions Team
        `,
      },
      login_alert: {
        subject: 'New Login Detected - Pro Crèche Solutions',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Login Alert</h2>
            <p>Hello {{firstName}},</p>
            <p>We detected a new login to your account:</p>
            <ul>
              <li><strong>Time:</strong> {{loginTime}}</li>
              <li><strong>Location:</strong> {{location}}</li>
              <li><strong>Device:</strong> {{device}}</li>
              <li><strong>IP Address:</strong> {{ipAddress}}</li>
            </ul>
            <p>If this was you, no action is needed. If you don't recognize this login, please secure your account immediately.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{accountUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Secure Account</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          New Login Alert
          
          Hello {{firstName}},
          
          We detected a new login to your account:
          
          Time: {{loginTime}}
          Location: {{location}}
          Device: {{device}}
          IP Address: {{ipAddress}}
          
          If this was you, no action is needed. If you don't recognize this login, please secure your account immediately.
          
          {{accountUrl}}
          
          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      // User Management
      welcome_email: {
        subject: 'Welcome to Pro Crèche Solutions!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Pro Crèche Solutions!</h2>
            <p>Hello {{firstName}},</p>
            <p>Welcome to Pro Crèche Solutions! We're excited to have you join our community of childcare professionals.</p>
            <p>Here's what you can do next:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Explore job opportunities</li>
              <li>Connect with organizations</li>
              <li>Browse our marketplace</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Get Started</a>
            </div>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Welcome to Pro Crèche Solutions!
          
          Hello {{firstName}},
          
          Welcome to Pro Crèche Solutions! We're excited to have you join our community of childcare professionals.
          
          Here's what you can do next:
          - Complete your profile
          - Explore job opportunities
          - Connect with organizations
          - Browse our marketplace
          
          Get started: {{dashboardUrl}}
          
          If you have any questions, feel free to contact our support team.
          
          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      // Job & Recruitment
      job_application_received: {
        subject: 'Application Received - {{jobTitle}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Application Received</h2>
            <p>Hello {{firstName}},</p>
            <p>Thank you for your interest in the position <strong>{{jobTitle}}</strong> at <strong>{{organizationName}}</strong>.</p>
            <p>We have received your application and will review it carefully. You will be notified of the next steps within {{responseTime}}.</p>
            <p><strong>Application Details:</strong></p>
            <ul>
              <li>Position: {{jobTitle}}</li>
              <li>Organization: {{organizationName}}</li>
              <li>Applied on: {{applicationDate}}</li>
              <li>Status: Under Review</li>
            </ul>
            <p>Thank you for choosing Pro Crèche Solutions for your career journey.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Application Received
          
          Hello {{firstName}},
          
          Thank you for your interest in the position {{jobTitle}} at {{organizationName}}.
          
          We have received your application and will review it carefully. You will be notified of the next steps within {{responseTime}}.
          
          Application Details:
          - Position: {{jobTitle}}
          - Organization: {{organizationName}}
          - Applied on: {{applicationDate}}
          - Status: Under Review
          
          Thank you for choosing Pro Crèche Solutions for your career journey.
          
          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      // Messaging
      new_message: {
        subject: 'New Message from {{senderName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Message</h2>
            <p>Hello {{firstName}},</p>
            <p>You have received a new message from <strong>{{senderName}}</strong>:</p>
            <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;">{{messagePreview}}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{messageUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Message</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          New Message
          
          Hello {{firstName}},
          
          You have received a new message from {{senderName}}:
          
          {{messagePreview}}
          
          View message: {{messageUrl}}
          
          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      // Marketplace & Orders
      order_confirmation: {
        subject: 'Order Confirmation - {{orderNumber}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Order Confirmation</h2>
            <p>Hello {{firstName}},</p>
            <p>Thank you for your order! We have received your order and are processing it.</p>
            <p><strong>Order Details:</strong></p>
            <ul>
              <li>Order Number: {{orderNumber}}</li>
              <li>Total Amount: CHF {{totalAmount}}</li>
              <li>Order Date: {{orderDate}}</li>
              <li>Status: {{status}}</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{orderUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Order</a>
            </div>
            <p>You will receive another email when your order ships.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Order Confirmation
          
          Hello {{firstName}},
          
          Thank you for your order! We have received your order and are processing it.
          
          Order Details:
          - Order Number: {{orderNumber}}
          - Total Amount: CHF {{totalAmount}}
          - Order Date: {{orderDate}}
          - Status: {{status}}
          
          View order: {{orderUrl}}
          
          You will receive another email when your order ships.
          
          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      // Lead Management
      new_lead: {
        subject: 'New Enquiry Received - {{foundationName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Parent Enquiry Received</h2>
            <p>Hello,</p>
            <p>A new parent enquiry has been matched with <strong>{{foundationName}}</strong>.</p>
            <p><strong>Enquiry Details:</strong></p>
            <ul>
              <li><strong>Parent Name:</strong> {{parentName}}</li>
              <li><strong>Child Age:</strong> {{childAge}} years</li>
              <li><strong>Preferred Location:</strong> {{location}}</li>
            </ul>
            <p><strong>Message from Parent:</strong></p>
            <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; font-style: italic;">
              "{{message}}"
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{leadUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Lead Details</a>
            </div>
            <p>Please respond to this enquiry as soon as possible to maximize your chances of enrollment.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          New Parent Enquiry Received
          
          Hello,
          
          A new parent enquiry has been matched with {{foundationName}}.
          
          Enquiry Details:
          - Parent Name: {{parentName}}
          - Child Age: {{childAge}} years
          - Preferred Location: {{location}}
          
          Message from Parent:
          "{{message}}"
          
          View lead details: {{leadUrl}}
          
          Please respond to this enquiry as soon as possible to maximize your chances of enrollment.
          
          Best regards,
          The Pro Crèche Solutions Team
        `,
      },
      parent_lead_confirmation: {
        subject: 'We received your childcare enquiry ({{enquiryReference}})',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your enquiry has been received</h2>
            <p>Hello {{parentName}},</p>
            <p>Thank you for submitting your childcare enquiry. We have received it successfully.</p>
            <p><strong>Enquiry Summary:</strong></p>
            <ul>
              <li><strong>Reference:</strong> {{enquiryReference}}</li>
              <li><strong>Submitted at:</strong> {{submittedAt}}</li>
              <li><strong>Child age:</strong> {{childAge}}</li>
              <li><strong>Preferred location:</strong> {{location}}</li>
            </ul>
            <p><strong>Details:</strong></p>
            <p style="background-color: #F3F4F6; padding: 12px; border-radius: 6px;">{{message}}</p>
            <p>To track replies and manage your enquiry, set up your parent account:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{accountSetupUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Create Parent Account</a>
            </div>
            <p>If you already have an account, you can track enquiries here:</p>
            <p><a href="{{enquiriesUrl}}">{{enquiriesUrl}}</a></p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Your enquiry has been received
          
          Hello {{parentName}},
          
          Thank you for submitting your childcare enquiry. We have received it successfully.
          
          Enquiry Summary:
          - Reference: {{enquiryReference}}
          - Submitted at: {{submittedAt}}
          - Child age: {{childAge}}
          - Preferred location: {{location}}
          
          Details:
          {{message}}
          
          To track replies and manage your enquiry, set up your parent account:
          {{accountSetupUrl}}
          
          If you already have an account, you can track enquiries here:
          {{enquiriesUrl}}
          
          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      // Replacement Staffing
      replacement_request_posted: {
        subject: 'New Replacement Request Posted',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>A replacement shift is available</h2>
            <p>Hello {{firstName}},</p>
            <p>A new replacement request matching your profile has been posted:</p>
            <ul>
              <li><strong>Role:</strong> {{role}}</li>
              <li><strong>Dates:</strong> {{startDate}} – {{endDate}}</li>
              <li><strong>Location:</strong> {{location}}</li>
              <li><strong>Urgency:</strong> {{urgency}}</li>
            </ul>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Request</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          A replacement shift is available

          Hello {{firstName}},

          Role: {{role}} | Dates: {{startDate}} – {{endDate}} | Location: {{location}} | Urgency: {{urgency}}

          View: {{requestUrl}}

          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      replacement_match_accepted: {
        subject: 'Replacement match accepted — {{role}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>An educator accepted your replacement request</h2>
            <p>Hello {{firstName}},</p>
            <p>An educator has accepted your replacement request for <strong>{{role}}</strong> ({{startDate}} – {{endDate}}).</p>
            <p>Please confirm the match in your dashboard.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Confirm Match</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Hello {{firstName}},

          An educator accepted your replacement request for {{role}} ({{startDate}} – {{endDate}}).
          Confirm at: {{requestUrl}}

          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      replacement_match_declined: {
        subject: 'Replacement match declined — {{role}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Replacement match declined</h2>
            <p>Hello {{firstName}},</p>
            <p>An educator has declined your replacement request for <strong>{{role}}</strong> ({{startDate}} – {{endDate}}).</p>
            <p>You can find another match or re-open the request from your dashboard.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Manage Request</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Hello {{firstName}},

          An educator declined your replacement request for {{role}} ({{startDate}} – {{endDate}}).
          Manage at: {{requestUrl}}

          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      replacement_pool_low: {
        subject: 'Low replacement pool alert for your region',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Replacement Pool Alert</h2>
            <p>Hello {{firstName}},</p>
            <p>The number of educators available for replacement shifts in your region has dropped below the recommended level (<strong>{{poolSize}}</strong> available).</p>
            <p>Consider encouraging educators to enable their availability for replacement shifts.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{adminUrl}}" style="background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Replacement Pool</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Hello {{firstName}},

          Replacement pool in your region is low ({{poolSize}} available).
          View at: {{adminUrl}}

          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      // Subscription & Billing
      subscription_activation: {
        subject: 'Subscription Activated - {{planName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Subscription Activated</h2>
            <p>Hello {{firstName}},</p>
            <p>Your <strong>{{planName}}</strong> subscription has been successfully activated!</p>
            <p><strong>Subscription Details:</strong></p>
            <ul>
              <li>Plan: {{planName}}</li>
              <li>Price: CHF {{price}}/{{billingPeriod}}</li>
              <li>Next Billing Date: {{nextBillingDate}}</li>
              <li>Status: Active</li>
            </ul>
            <p>You now have access to all premium features. Thank you for your subscription!</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Dashboard</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Subscription Activated
          
          Hello {{firstName}},
          
          Your {{planName}} subscription has been successfully activated!
          
          Subscription Details:
          - Plan: {{planName}}
          - Price: CHF {{price}}/{{billingPeriod}}
          - Next Billing Date: {{nextBillingDate}}
          - Status: Active
          
          You now have access to all premium features. Thank you for your subscription!
          
          Access dashboard: {{dashboardUrl}}
          
          Best regards,
          The Pro Crèche Solutions Team
        `,
      },

      // System & Admin
      system_maintenance: {
        subject: 'Scheduled Maintenance - Pro Crèche Solutions',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Scheduled Maintenance</h2>
            <p>Hello {{firstName}},</p>
            <p>We will be performing scheduled maintenance on our platform:</p>
            <p><strong>Maintenance Details:</strong></p>
            <ul>
              <li>Date: {{maintenanceDate}}</li>
              <li>Time: {{maintenanceTime}}</li>
              <li>Duration: {{duration}}</li>
              <li>Impact: {{impact}}</li>
            </ul>
            <p>{{description}}</p>
            <p>We apologize for any inconvenience and appreciate your patience.</p>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Scheduled Maintenance
          
          Hello {{firstName}},
          
          We will be performing scheduled maintenance on our platform:
          
          Maintenance Details:
          - Date: {{maintenanceDate}}
          - Time: {{maintenanceTime}}
          - Duration: {{duration}}
          - Impact: {{impact}}
          
          {{description}}
          
          We apologize for any inconvenience and appreciate your patience.

          Best regards,
          The Pro Crèche Solutions Team
        `,
      },
      educator_pending: {
        subject: 'Application received — pending review',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Application Received!</h2>
            <p>Hello {{firstName}},</p>
            <p>Thank you for signing up as an educator on Pro Crèche Solutions. We have received your application and it is now being reviewed by our team.</p>
            <p>You will receive another email once your application has been processed.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{supportUrl}}" style="background-color: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Contact Support</a>
            </div>
            <p>Best regards,<br>The Pro Crèche Solutions Team</p>
          </div>
        `,
        textContent: `
          Application Received!

          Hello {{firstName}},

          Thank you for signing up as an educator on Pro Crèche Solutions. We have received your application and it is now being reviewed by our team.

          You will receive another email once your application has been processed.

          Questions? Contact our support team: {{supportUrl}}

          Best regards,
          The Pro Crèche Solutions Team
        `,
      },
    };

    return defaultTemplates[event] || null;
  }
}