import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailTemplateService {
  constructor(private prisma: PrismaService) {}

  private getStarterTemplates() {
    // These are the 4 templates the admin UI expects to manage out of the box.
    // All content is in French as required by platform requirements.
    return [
      {
        name: 'Vérification du compte',
        event: 'account_verification',
        subject: 'Vérifiez votre compte - Pro Crèche Solutions',
        category: 'authentication',
        variables: ['firstName', 'verificationUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Bienvenue sur Pro Crèche Solutions !</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Merci de vous être inscrit(e) sur Pro Crèche Solutions. Veuillez vérifier votre adresse e-mail en cliquant sur le bouton ci-dessous :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verificationUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Vérifier mon e-mail</a>
            </div>
            <p>Si vous n'avez pas créé de compte, veuillez ignorer cet e-mail.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Bienvenue sur Pro Crèche Solutions !

          Bonjour {{firstName}},

          Merci de vous être inscrit(e) sur Pro Crèche Solutions. Veuillez vérifier votre adresse e-mail en visitant le lien suivant :

          {{verificationUrl}}

          Si vous n'avez pas créé de compte, veuillez ignorer cet e-mail.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
      {
        name: 'Réinitialisation du mot de passe',
        event: 'password_reset',
        subject: 'Réinitialisez votre mot de passe - Pro Crèche Solutions',
        category: 'authentication',
        variables: ['firstName', 'resetUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Demande de réinitialisation de mot de passe</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{resetUrl}}" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Réinitialiser mon mot de passe</a>
            </div>
            <p>Ce lien expirera dans 1 heure pour des raisons de sécurité.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Demande de réinitialisation de mot de passe

          Bonjour {{firstName}},

          Nous avons reçu une demande de réinitialisation de votre mot de passe. Visitez le lien suivant pour créer un nouveau mot de passe :

          {{resetUrl}}

          Ce lien expirera dans 1 heure pour des raisons de sécurité.

          Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
      {
        name: 'E-mail de bienvenue',
        event: 'welcome_email',
        subject: 'Bienvenue sur Pro Crèche Solutions !',
        category: 'userManagement',
        variables: ['firstName', 'dashboardUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Bienvenue sur Pro Crèche Solutions !</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Bienvenue sur Pro Crèche Solutions ! Nous sommes ravis de vous accueillir au sein de notre communauté de professionnels de la petite enfance.</p>
            <p>Voici ce que vous pouvez faire maintenant :</p>
            <ul>
              <li>Compléter votre profil</li>
              <li>Explorer les offres d'emploi</li>
              <li>Entrer en contact avec des organisations</li>
              <li>Parcourir notre marketplace</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Commencer</a>
            </div>
            <p>Si vous avez des questions, n'hésitez pas à contacter notre équipe d'assistance.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Bienvenue sur Pro Crèche Solutions !

          Bonjour {{firstName}},

          Bienvenue sur Pro Crèche Solutions ! Nous sommes ravis de vous accueillir au sein de notre communauté de professionnels de la petite enfance.

          Voici ce que vous pouvez faire maintenant :
          - Compléter votre profil
          - Explorer les offres d'emploi
          - Entrer en contact avec des organisations
          - Parcourir notre marketplace

          Commencer : {{dashboardUrl}}

          Si vous avez des questions, n'hésitez pas à contacter notre équipe d'assistance.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
      {
        name: 'Nouveau message',
        event: 'new_message',
        subject: 'Nouveau message de {{senderName}}',
        category: 'messaging',
        variables: ['firstName', 'senderName', 'messagePreview', 'messageUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Nouveau message</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Vous avez reçu un nouveau message de <strong>{{senderName}}</strong> :</p>
            <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;">{{messagePreview}}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{messageUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir le message</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Nouveau message

          Bonjour {{firstName}},

          Vous avez reçu un nouveau message de {{senderName}} :

          {{messagePreview}}

          Voir le message : {{messageUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
      {
        name: 'Nouvelle demande parent',
        event: 'new_lead',
        subject: 'Nouvelle demande reçue - {{foundationName}}',
        category: 'leadManagement',
        variables: ['foundationName', 'parentName', 'childAge', 'location', 'message', 'leadUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Nouvelle demande de parent reçue</h2>
            <p>Bonjour,</p>
            <p>Une nouvelle demande de parent a été associée à <strong>{{foundationName}}</strong>.</p>
            <p><strong>Détails de la demande :</strong></p>
            <ul>
              <li><strong>Nom du parent :</strong> {{parentName}}</li>
              <li><strong>Âge de l'enfant :</strong> {{childAge}} ans</li>
              <li><strong>Localisation souhaitée :</strong> {{location}}</li>
            </ul>
            <p><strong>Message du parent :</strong></p>
            <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; font-style: italic;">
              "{{message}}"
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{leadUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir les détails de la demande</a>
            </div>
            <p>Veuillez répondre à cette demande dès que possible pour maximiser vos chances d'inscription.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Nouvelle demande de parent reçue

          Bonjour,

          Une nouvelle demande de parent a été associée à {{foundationName}}.

          Détails de la demande :
          - Nom du parent : {{parentName}}
          - Âge de l'enfant : {{childAge}} ans
          - Localisation souhaitée : {{location}}

          Message du parent :
          "{{message}}"

          Voir les détails de la demande : {{leadUrl}}

          Veuillez répondre à cette demande dès que possible pour maximiser vos chances d'inscription.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
      {
        name: 'Confirmation de demande parent',
        event: 'parent_lead_confirmation',
        subject: 'Nous avons reçu votre demande de garde d\'enfants ({{enquiryReference}})',
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
            <h2>Votre demande a bien été reçue</h2>
            <p>Bonjour {{parentName}},</p>
            <p>Merci d'avoir soumis votre demande de garde d'enfants. Nous l'avons bien reçue.</p>
            <p><strong>Récapitulatif de la demande :</strong></p>
            <ul>
              <li><strong>Référence :</strong> {{enquiryReference}}</li>
              <li><strong>Soumise le :</strong> {{submittedAt}}</li>
              <li><strong>Âge de l'enfant :</strong> {{childAge}}</li>
              <li><strong>Localisation souhaitée :</strong> {{location}}</li>
            </ul>
            <p><strong>Détails :</strong></p>
            <p style="background-color: #F3F4F6; padding: 12px; border-radius: 6px;">{{message}}</p>
            <p>Pour suivre les réponses et gérer votre demande, créez votre compte parent :</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{accountSetupUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Créer mon compte parent</a>
            </div>
            <p>Si vous avez déjà un compte, vous pouvez suivre vos demandes ici :</p>
            <p><a href="{{enquiriesUrl}}">{{enquiriesUrl}}</a></p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Votre demande a bien été reçue

          Bonjour {{parentName}},

          Merci d'avoir soumis votre demande de garde d'enfants. Nous l'avons bien reçue.

          Récapitulatif de la demande :
          - Référence : {{enquiryReference}}
          - Soumise le : {{submittedAt}}
          - Âge de l'enfant : {{childAge}}
          - Localisation souhaitée : {{location}}

          Détails :
          {{message}}

          Pour suivre les réponses et gérer votre demande, créez votre compte parent :
          {{accountSetupUrl}}

          Si vous avez déjà un compte, vous pouvez suivre vos demandes ici :
          {{enquiriesUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
      // ── Remplacement ──────────────────────────────────────────────────────
      {
        name: 'Remplacement proposé',
        event: 'replacement_match_proposed',
        subject: 'Vous avez été proposé(e) pour un remplacement',
        category: 'jobRecruitment',
        variables: ['firstName', 'role', 'startDate', 'endDate', 'location', 'requestUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Remplacement proposé</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Vous avez été proposé(e) pour le remplacement suivant :</p>
            <ul>
              <li><strong>Rôle :</strong> {{role}}</li>
              <li><strong>Dates :</strong> {{startDate}} – {{endDate}}</li>
              <li><strong>Lieu :</strong> {{location}}</li>
            </ul>
            <p>Veuillez vous connecter pour accepter ou refuser cette proposition.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir la proposition</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Bonjour {{firstName}},

          Vous avez été proposé(e) pour le remplacement suivant :

          Rôle : {{role}}
          Dates : {{startDate}} – {{endDate}}
          Lieu : {{location}}

          Veuillez vous connecter pour accepter ou refuser cette proposition :
          {{requestUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
      {
        name: 'Demande de remplacement publiée',
        event: 'replacement_request_posted',
        subject: 'Nouvelle demande de remplacement disponible',
        category: 'jobRecruitment',
        variables: ['firstName', 'role', 'startDate', 'endDate', 'location', 'urgency', 'requestUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Une demande de remplacement est disponible</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Une nouvelle demande de remplacement correspondant à votre profil a été publiée :</p>
            <ul>
              <li><strong>Rôle :</strong> {{role}}</li>
              <li><strong>Dates :</strong> {{startDate}} – {{endDate}}</li>
              <li><strong>Lieu :</strong> {{location}}</li>
              <li><strong>Urgence :</strong> {{urgency}}</li>
            </ul>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir la demande</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `Une demande de remplacement est disponible\n\nBonjour {{firstName}},\n\nRôle : {{role}} | Dates : {{startDate}} – {{endDate}} | Lieu : {{location}} | Urgence : {{urgency}}\n\nVoir : {{requestUrl}}\n\nCordialement,\nL'équipe Pro Crèche Solutions`.trim(),
        isActive: true,
      },
      {
        name: 'Remplacement accepté',
        event: 'replacement_match_accepted',
        subject: 'Remplacement accepté — {{role}}',
        category: 'jobRecruitment',
        variables: ['firstName', 'role', 'startDate', 'endDate', 'requestUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Un(e) éducateur·trice a accepté votre demande de remplacement</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Un(e) éducateur·trice a accepté votre demande de remplacement pour le rôle <strong>{{role}}</strong> ({{startDate}} – {{endDate}}).</p>
            <p>Veuillez confirmer le match dans votre tableau de bord.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Confirmer le match</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `Bonjour {{firstName}},\n\nUn(e) éducateur·trice a accepté votre demande de remplacement pour {{role}} ({{startDate}} – {{endDate}}).\nConfirmer : {{requestUrl}}\n\nCordialement,\nL'équipe Pro Crèche Solutions`.trim(),
        isActive: true,
      },
      {
        name: 'Remplacement refusé',
        event: 'replacement_match_declined',
        subject: 'Remplacement refusé — {{role}}',
        category: 'jobRecruitment',
        variables: ['firstName', 'role', 'startDate', 'endDate', 'requestUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Remplacement refusé</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Un(e) éducateur·trice a refusé votre demande de remplacement pour le rôle <strong>{{role}}</strong> ({{startDate}} – {{endDate}}).</p>
            <p>Vous pouvez trouver un autre match ou rouvrir la demande depuis votre tableau de bord.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Gérer la demande</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `Bonjour {{firstName}},\n\nUn(e) éducateur·trice a refusé votre demande de remplacement pour {{role}} ({{startDate}} – {{endDate}}).\nGérer : {{requestUrl}}\n\nCordialement,\nL'équipe Pro Crèche Solutions`.trim(),
        isActive: true,
      },
      {
        name: 'Pool de remplaçants insuffisant',
        event: 'replacement_pool_low',
        subject: 'Alerte : pool de remplaçants insuffisant pour votre région',
        category: 'systemAdmin',
        variables: ['firstName', 'poolSize', 'adminUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Alerte : pool de remplaçants</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Le nombre d'éducateur·trices disponibles pour des remplacements dans votre région est passé en dessous du seuil recommandé (<strong>{{poolSize}}</strong> disponible(s)).</p>
            <p>Nous vous encourageons à inciter les éducateur·trices à activer leur disponibilité pour les remplacements.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{adminUrl}}" style="background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir le pool de remplaçants</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `Bonjour {{firstName}},\n\nLe pool de remplaçants dans votre région est insuffisant ({{poolSize}} disponible(s)).\nVoir : {{adminUrl}}\n\nCordialement,\nL'équipe Pro Crèche Solutions`.trim(),
        isActive: true,
      },
      // ── Invitation à postuler (tableau de bord admin) ─────────────────────
      {
        name: 'Invitation à postuler',
        event: 'invite_to_apply',
        subject: 'Invitation à postuler sur Pro Crèche Solutions',
        category: 'userManagement',
        variables: ['firstName', 'role', 'inviteUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Vous avez été invité(e) à rejoindre Pro Crèche Solutions</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Vous avez été invité(e) à rejoindre la plateforme Pro Crèche Solutions en tant que <strong>{{role}}</strong>.</p>
            <p>Cliquez sur le bouton ci-dessous pour créer votre compte et commencer :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{inviteUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accepter l'invitation</a>
            </div>
            <p>Ce lien d'invitation est valable pendant 7 jours.</p>
            <p>Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Vous avez été invité(e) à rejoindre Pro Crèche Solutions

          Bonjour {{firstName}},

          Vous avez été invité(e) à rejoindre la plateforme Pro Crèche Solutions en tant que {{role}}.

          Cliquez sur le lien suivant pour créer votre compte et commencer :
          {{inviteUrl}}

          Ce lien d'invitation est valable pendant 7 jours.

          Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
      // ── Approbation des éducateur·trices ──────────────────────────────────
      {
        name: 'Candidature éducateur·trice reçue',
        event: 'educator_pending',
        subject: 'Candidature reçue — en attente de vérification',
        category: 'userManagement',
        variables: ['firstName', 'supportUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Candidature reçue !</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Merci de vous être inscrit(e) en tant qu'éducateur·trice sur Pro Crèche Solutions. Nous avons bien reçu votre candidature, qui est actuellement en cours d'examen par notre équipe.</p>
            <p>Vous recevrez un autre e-mail dès que votre candidature aura été traitée. En attendant, vous pouvez vous connecter et explorer la plateforme — l'accès complet sera débloqué après approbation.</p>
            <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;"><strong>Prochaines étapes :</strong></p>
              <ul style="margin: 8px 0 0 0; padding-left: 16px;">
                <li>Notre équipe examine votre profil soumis</li>
                <li>Vous recevez un e-mail d'approbation ou de retour</li>
                <li>Une fois approuvé(e), vous obtenez un accès complet à la plateforme</li>
              </ul>
            </div>
            <p>Si vous avez des questions, n'hésitez pas à contacter notre équipe d'assistance.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{supportUrl}}" style="background-color: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Contacter l'assistance</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Candidature reçue !

          Bonjour {{firstName}},

          Merci de vous être inscrit(e) en tant qu'éducateur·trice sur Pro Crèche Solutions. Nous avons bien reçu votre candidature, qui est actuellement en cours d'examen par notre équipe.

          Vous recevrez un autre e-mail dès que votre candidature aura été traitée.

          Des questions ? Contactez notre équipe d'assistance : {{supportUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
      {
        name: 'Profil éducateur·trice approuvé',
        event: 'educator_approved',
        subject: 'Votre profil d\'éducateur·trice a été approuvé !',
        category: 'userManagement',
        variables: ['firstName', 'dashboardUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Votre profil a été approuvé !</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Excellente nouvelle ! Votre profil d'éducateur·trice sur Pro Crèche Solutions a été examiné et <strong>approuvé</strong> par notre équipe.</p>
            <p>Vous avez désormais un accès complet à la plateforme. Voici ce que vous pouvez faire :</p>
            <ul>
              <li>Parcourir et postuler aux offres d'emploi</li>
              <li>Compléter votre profil professionnel</li>
              <li>Rejoindre le pool de candidats pour les remplacements</li>
              <li>Entrer en contact avec des organisations de garde d'enfants</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accéder à mon tableau de bord</a>
            </div>
            <p>Bienvenue dans la communauté Pro Crèche Solutions !</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Votre profil a été approuvé !

          Bonjour {{firstName}},

          Excellente nouvelle ! Votre profil d'éducateur·trice sur Pro Crèche Solutions a été examiné et approuvé par notre équipe.

          Vous avez désormais un accès complet à la plateforme. Accédez à votre tableau de bord : {{dashboardUrl}}

          Bienvenue dans la communauté Pro Crèche Solutions !

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
      {
        name: 'Profil éducateur·trice refusé',
        event: 'educator_rejected',
        subject: 'Mise à jour de votre candidature d\'éducateur·trice',
        category: 'userManagement',
        variables: ['firstName', 'rejectionNotes', 'supportUrl'],
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Mise à jour de votre candidature</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Merci de l'intérêt que vous portez à Pro Crèche Solutions en tant qu'éducateur·trice. Après examen de votre profil, nous ne sommes pas en mesure d'approuver votre candidature pour le moment.</p>
            <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;"><strong>Motif :</strong> {{rejectionNotes}}</p>
            </div>
            <p>Si vous pensez que cette décision est erronée, ou si vous souhaitez fournir des informations complémentaires, veuillez contacter notre équipe d'assistance.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{supportUrl}}" style="background-color: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Contacter l'assistance</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `.trim(),
        textContent: `
          Mise à jour de votre candidature

          Bonjour {{firstName}},

          Merci de l'intérêt que vous portez à Pro Crèche Solutions en tant qu'éducateur·trice. Après examen de votre profil, nous ne sommes pas en mesure d'approuver votre candidature pour le moment.

          Motif : {{rejectionNotes}}

          Si vous pensez que cette décision est erronée, veuillez contacter notre équipe d'assistance : {{supportUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `.trim(),
        isActive: true,
      },
    ];
  }

  private async ensureStarterTemplatesExist(): Promise<void> {
    // Upsert each template so the French content is always applied, even on existing installations.
    const data = this.getStarterTemplates();
    for (const template of data) {
      await this.prisma.emailTemplate.upsert({
        where: { event: template.event },
        update: {
          name: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: template.variables,
          category: template.category,
          isActive: template.isActive,
        },
        create: template,
      });
    }
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
    const defaultTemplates: Record<string, { subject: string; htmlContent: string; textContent: string }> = {
      // Authentification
      account_verification: {
        subject: 'Vérifiez votre compte - Pro Crèche Solutions',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Bienvenue sur Pro Crèche Solutions !</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Merci de vous être inscrit(e) sur Pro Crèche Solutions. Veuillez vérifier votre adresse e-mail en cliquant sur le bouton ci-dessous :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verificationUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Vérifier mon e-mail</a>
            </div>
            <p>Si vous n'avez pas créé de compte, veuillez ignorer cet e-mail.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Bienvenue sur Pro Crèche Solutions !

          Bonjour {{firstName}},

          Merci de vous être inscrit(e) sur Pro Crèche Solutions. Veuillez vérifier votre adresse e-mail en visitant le lien suivant :

          {{verificationUrl}}

          Si vous n'avez pas créé de compte, veuillez ignorer cet e-mail.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },
      password_reset: {
        subject: 'Réinitialisez votre mot de passe - Pro Crèche Solutions',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Demande de réinitialisation de mot de passe</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{resetUrl}}" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Réinitialiser mon mot de passe</a>
            </div>
            <p>Ce lien expirera dans 1 heure pour des raisons de sécurité.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Demande de réinitialisation de mot de passe

          Bonjour {{firstName}},

          Nous avons reçu une demande de réinitialisation de votre mot de passe. Visitez le lien suivant pour créer un nouveau mot de passe :

          {{resetUrl}}

          Ce lien expirera dans 1 heure pour des raisons de sécurité.

          Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },
      login_alert: {
        subject: 'Nouvelle connexion détectée - Pro Crèche Solutions',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Alerte de connexion</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Nous avons détecté une nouvelle connexion à votre compte :</p>
            <ul>
              <li><strong>Heure :</strong> {{loginTime}}</li>
              <li><strong>Lieu :</strong> {{location}}</li>
              <li><strong>Appareil :</strong> {{device}}</li>
              <li><strong>Adresse IP :</strong> {{ipAddress}}</li>
            </ul>
            <p>Si c'était vous, aucune action n'est nécessaire. Si vous ne reconnaissez pas cette connexion, sécurisez votre compte immédiatement.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{accountUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Sécuriser mon compte</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Alerte de connexion

          Bonjour {{firstName}},

          Nous avons détecté une nouvelle connexion à votre compte :

          Heure : {{loginTime}}
          Lieu : {{location}}
          Appareil : {{device}}
          Adresse IP : {{ipAddress}}

          Si c'était vous, aucune action n'est nécessaire. Si vous ne reconnaissez pas cette connexion, sécurisez votre compte immédiatement.

          {{accountUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      // Gestion des utilisateurs
      welcome_email: {
        subject: 'Bienvenue sur Pro Crèche Solutions !',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Bienvenue sur Pro Crèche Solutions !</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Bienvenue sur Pro Crèche Solutions ! Nous sommes ravis de vous accueillir au sein de notre communauté de professionnels de la petite enfance.</p>
            <p>Voici ce que vous pouvez faire maintenant :</p>
            <ul>
              <li>Compléter votre profil</li>
              <li>Explorer les offres d'emploi</li>
              <li>Entrer en contact avec des organisations</li>
              <li>Parcourir notre marketplace</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Commencer</a>
            </div>
            <p>Si vous avez des questions, n'hésitez pas à contacter notre équipe d'assistance.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Bienvenue sur Pro Crèche Solutions !

          Bonjour {{firstName}},

          Bienvenue sur Pro Crèche Solutions ! Nous sommes ravis de vous accueillir au sein de notre communauté de professionnels de la petite enfance.

          Voici ce que vous pouvez faire maintenant :
          - Compléter votre profil
          - Explorer les offres d'emploi
          - Entrer en contact avec des organisations
          - Parcourir notre marketplace

          Commencer : {{dashboardUrl}}

          Si vous avez des questions, n'hésitez pas à contacter notre équipe d'assistance.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      // Invitation à postuler (tableau de bord admin)
      invite_to_apply: {
        subject: 'Invitation à postuler sur Pro Crèche Solutions',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Vous avez été invité(e) à rejoindre Pro Crèche Solutions</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Vous avez été invité(e) à rejoindre la plateforme Pro Crèche Solutions en tant que <strong>{{role}}</strong>.</p>
            <p>Cliquez sur le bouton ci-dessous pour créer votre compte et commencer :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{inviteUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accepter l'invitation</a>
            </div>
            <p>Ce lien d'invitation est valable pendant 7 jours.</p>
            <p>Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Vous avez été invité(e) à rejoindre Pro Crèche Solutions

          Bonjour {{firstName}},

          Vous avez été invité(e) à rejoindre la plateforme Pro Crèche Solutions en tant que {{role}}.

          Cliquez sur le lien suivant pour créer votre compte et commencer :
          {{inviteUrl}}

          Ce lien d'invitation est valable pendant 7 jours.

          Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      // Emploi et recrutement
      job_application_received: {
        subject: 'Candidature reçue - {{jobTitle}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Candidature reçue</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Merci de l'intérêt que vous portez au poste <strong>{{jobTitle}}</strong> chez <strong>{{organizationName}}</strong>.</p>
            <p>Nous avons bien reçu votre candidature et l'examinerons attentivement. Vous serez informé(e) des prochaines étapes dans un délai de {{responseTime}}.</p>
            <p><strong>Détails de la candidature :</strong></p>
            <ul>
              <li>Poste : {{jobTitle}}</li>
              <li>Organisation : {{organizationName}}</li>
              <li>Date de candidature : {{applicationDate}}</li>
              <li>Statut : En cours d'examen</li>
            </ul>
            <p>Merci de faire confiance à Pro Crèche Solutions pour votre carrière.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Candidature reçue

          Bonjour {{firstName}},

          Merci de l'intérêt que vous portez au poste {{jobTitle}} chez {{organizationName}}.

          Nous avons bien reçu votre candidature et l'examinerons attentivement. Vous serez informé(e) des prochaines étapes dans un délai de {{responseTime}}.

          Détails de la candidature :
          - Poste : {{jobTitle}}
          - Organisation : {{organizationName}}
          - Date de candidature : {{applicationDate}}
          - Statut : En cours d'examen

          Merci de faire confiance à Pro Crèche Solutions pour votre carrière.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },
      new_application: {
        subject: 'Nouvelle candidature reçue - {{jobTitle}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Nouvelle candidature reçue</h2>
            <p>Bonjour {{firstName}},</p>
            <p><strong>{{candidateName}}</strong> a postulé au poste <strong>{{jobTitle}}</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir la candidature</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Nouvelle candidature reçue

          Bonjour {{firstName}},

          {{candidateName}} a postulé au poste {{jobTitle}}.

          Voir la candidature : {{dashboardUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },
      application_status_update: {
        subject: 'Mise à jour de votre candidature - {{jobTitle}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Mise à jour de votre candidature</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Le statut de votre candidature pour le poste <strong>{{jobTitle}}</strong> chez <strong>{{foundationName}}</strong> a été mis à jour : <strong>{{newStatus}}</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir ma candidature</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Mise à jour de votre candidature

          Bonjour {{firstName}},

          Le statut de votre candidature pour le poste {{jobTitle}} chez {{foundationName}} a été mis à jour : {{newStatus}}.

          Voir ma candidature : {{dashboardUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },
      job_match: {
        subject: 'Une offre d\'emploi correspond à votre profil - {{jobTitle}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Une offre correspond à votre profil !</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Une nouvelle offre d'emploi correspondant à votre profil vient d'être publiée :</p>
            <ul>
              <li><strong>Poste :</strong> {{jobTitle}}</li>
              <li><strong>Organisation :</strong> {{foundationName}}</li>
              <li><strong>Lieu :</strong> {{location}}</li>
              <li><strong>Type de contrat :</strong> {{contractType}}</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{applyUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir l'offre</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Une offre correspond à votre profil !

          Bonjour {{firstName}},

          Une nouvelle offre d'emploi correspondant à votre profil vient d'être publiée :

          Poste : {{jobTitle}}
          Organisation : {{foundationName}}
          Lieu : {{location}}
          Type de contrat : {{contractType}}

          Voir l'offre : {{applyUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      // Messagerie
      new_message: {
        subject: 'Nouveau message de {{senderName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Nouveau message</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Vous avez reçu un nouveau message de <strong>{{senderName}}</strong> :</p>
            <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;">{{messagePreview}}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{messageUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir le message</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Nouveau message

          Bonjour {{firstName}},

          Vous avez reçu un nouveau message de {{senderName}} :

          {{messagePreview}}

          Voir le message : {{messageUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      // Marketplace et commandes
      order_confirmation: {
        subject: 'Confirmation de commande - {{orderNumber}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Confirmation de commande</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Merci pour votre commande ! Nous l'avons bien reçue et la traitons.</p>
            <p><strong>Détails de la commande :</strong></p>
            <ul>
              <li>Numéro de commande : {{orderNumber}}</li>
              <li>Montant total : CHF {{totalAmount}}</li>
              <li>Date de commande : {{orderDate}}</li>
              <li>Statut : {{status}}</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{orderUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir ma commande</a>
            </div>
            <p>Vous recevrez un autre e-mail lorsque votre commande sera expédiée.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Confirmation de commande

          Bonjour {{firstName}},

          Merci pour votre commande ! Nous l'avons bien reçue et la traitons.

          Détails de la commande :
          - Numéro de commande : {{orderNumber}}
          - Montant total : CHF {{totalAmount}}
          - Date de commande : {{orderDate}}
          - Statut : {{status}}

          Voir ma commande : {{orderUrl}}

          Vous recevrez un autre e-mail lorsque votre commande sera expédiée.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      // Gestion des demandes
      new_lead: {
        subject: 'Nouvelle demande reçue - {{foundationName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Nouvelle demande de parent reçue</h2>
            <p>Bonjour,</p>
            <p>Une nouvelle demande de parent a été associée à <strong>{{foundationName}}</strong>.</p>
            <p><strong>Détails de la demande :</strong></p>
            <ul>
              <li><strong>Nom du parent :</strong> {{parentName}}</li>
              <li><strong>Âge de l'enfant :</strong> {{childAge}} ans</li>
              <li><strong>Localisation souhaitée :</strong> {{location}}</li>
            </ul>
            <p><strong>Message du parent :</strong></p>
            <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; font-style: italic;">
              "{{message}}"
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{leadUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir les détails de la demande</a>
            </div>
            <p>Veuillez répondre à cette demande dès que possible pour maximiser vos chances d'inscription.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Nouvelle demande de parent reçue

          Bonjour,

          Une nouvelle demande de parent a été associée à {{foundationName}}.

          Détails de la demande :
          - Nom du parent : {{parentName}}
          - Âge de l'enfant : {{childAge}} ans
          - Localisation souhaitée : {{location}}

          Message du parent :
          "{{message}}"

          Voir les détails de la demande : {{leadUrl}}

          Veuillez répondre à cette demande dès que possible pour maximiser vos chances d'inscription.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },
      parent_lead_confirmation: {
        subject: 'Nous avons reçu votre demande de garde d\'enfants ({{enquiryReference}})',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Votre demande a bien été reçue</h2>
            <p>Bonjour {{parentName}},</p>
            <p>Merci d'avoir soumis votre demande de garde d'enfants. Nous l'avons bien reçue.</p>
            <p><strong>Récapitulatif de la demande :</strong></p>
            <ul>
              <li><strong>Référence :</strong> {{enquiryReference}}</li>
              <li><strong>Soumise le :</strong> {{submittedAt}}</li>
              <li><strong>Âge de l'enfant :</strong> {{childAge}}</li>
              <li><strong>Localisation souhaitée :</strong> {{location}}</li>
            </ul>
            <p><strong>Détails :</strong></p>
            <p style="background-color: #F3F4F6; padding: 12px; border-radius: 6px;">{{message}}</p>
            <p>Pour suivre les réponses et gérer votre demande, créez votre compte parent :</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{accountSetupUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Créer mon compte parent</a>
            </div>
            <p>Si vous avez déjà un compte, vous pouvez suivre vos demandes ici :</p>
            <p><a href="{{enquiriesUrl}}">{{enquiriesUrl}}</a></p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Votre demande a bien été reçue

          Bonjour {{parentName}},

          Merci d'avoir soumis votre demande de garde d'enfants. Nous l'avons bien reçue.

          Récapitulatif de la demande :
          - Référence : {{enquiryReference}}
          - Soumise le : {{submittedAt}}
          - Âge de l'enfant : {{childAge}}
          - Localisation souhaitée : {{location}}

          Détails :
          {{message}}

          Pour suivre les réponses et gérer votre demande, créez votre compte parent :
          {{accountSetupUrl}}

          Si vous avez déjà un compte, vous pouvez suivre vos demandes ici :
          {{enquiriesUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      // Remplacement
      replacement_request_posted: {
        subject: 'Nouvelle demande de remplacement publiée',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Une demande de remplacement est disponible</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Une nouvelle demande de remplacement correspondant à votre profil a été publiée :</p>
            <ul>
              <li><strong>Rôle :</strong> {{role}}</li>
              <li><strong>Dates :</strong> {{startDate}} – {{endDate}}</li>
              <li><strong>Lieu :</strong> {{location}}</li>
              <li><strong>Urgence :</strong> {{urgency}}</li>
            </ul>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir la demande</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Une demande de remplacement est disponible

          Bonjour {{firstName}},

          Rôle : {{role}} | Dates : {{startDate}} – {{endDate}} | Lieu : {{location}} | Urgence : {{urgency}}

          Voir : {{requestUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      replacement_match_accepted: {
        subject: 'Remplacement accepté — {{role}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Un(e) éducateur·trice a accepté votre demande de remplacement</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Un(e) éducateur·trice a accepté votre demande de remplacement pour le rôle <strong>{{role}}</strong> ({{startDate}} – {{endDate}}).</p>
            <p>Veuillez confirmer le match dans votre tableau de bord.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Confirmer le match</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Bonjour {{firstName}},

          Un(e) éducateur·trice a accepté votre demande de remplacement pour {{role}} ({{startDate}} – {{endDate}}).
          Confirmer : {{requestUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      replacement_match_declined: {
        subject: 'Remplacement refusé — {{role}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Remplacement refusé</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Un(e) éducateur·trice a refusé votre demande de remplacement pour le rôle <strong>{{role}}</strong> ({{startDate}} – {{endDate}}).</p>
            <p>Vous pouvez trouver un autre match ou rouvrir la demande depuis votre tableau de bord.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{requestUrl}}" style="background-color: #14B8A6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Gérer la demande</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Bonjour {{firstName}},

          Un(e) éducateur·trice a refusé votre demande de remplacement pour {{role}} ({{startDate}} – {{endDate}}).
          Gérer : {{requestUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      replacement_pool_low: {
        subject: 'Alerte : pool de remplaçants insuffisant pour votre région',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Alerte : pool de remplaçants</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Le nombre d'éducateur·trices disponibles pour des remplacements dans votre région est passé en dessous du seuil recommandé (<strong>{{poolSize}}</strong> disponible(s)).</p>
            <p>Nous vous encourageons à inciter les éducateur·trices à activer leur disponibilité pour les remplacements.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{{adminUrl}}" style="background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir le pool de remplaçants</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Bonjour {{firstName}},

          Le pool de remplaçants dans votre région est insuffisant ({{poolSize}} disponible(s)).
          Voir : {{adminUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      // Abonnement et facturation
      subscription_activation: {
        subject: 'Abonnement activé - {{planName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Abonnement activé</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Votre abonnement <strong>{{planName}}</strong> a été activé avec succès !</p>
            <p><strong>Détails de l'abonnement :</strong></p>
            <ul>
              <li>Forfait : {{planName}}</li>
              <li>Prix : CHF {{price}}/{{billingPeriod}}</li>
              <li>Prochaine date de facturation : {{nextBillingDate}}</li>
              <li>Statut : Actif</li>
            </ul>
            <p>Vous avez maintenant accès à toutes les fonctionnalités premium. Merci pour votre abonnement !</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accéder au tableau de bord</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Abonnement activé

          Bonjour {{firstName}},

          Votre abonnement {{planName}} a été activé avec succès !

          Détails de l'abonnement :
          - Forfait : {{planName}}
          - Prix : CHF {{price}}/{{billingPeriod}}
          - Prochaine date de facturation : {{nextBillingDate}}
          - Statut : Actif

          Vous avez maintenant accès à toutes les fonctionnalités premium. Merci pour votre abonnement !

          Accéder au tableau de bord : {{dashboardUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },

      // Système et administration
      system_maintenance: {
        subject: 'Maintenance programmée - Pro Crèche Solutions',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Maintenance programmée</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Nous allons effectuer une maintenance programmée sur notre plateforme :</p>
            <p><strong>Détails de la maintenance :</strong></p>
            <ul>
              <li>Date : {{maintenanceDate}}</li>
              <li>Heure : {{maintenanceTime}}</li>
              <li>Durée : {{duration}}</li>
              <li>Impact : {{impact}}</li>
            </ul>
            <p>{{description}}</p>
            <p>Nous nous excusons pour tout inconvénient et vous remercions de votre patience.</p>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Maintenance programmée

          Bonjour {{firstName}},

          Nous allons effectuer une maintenance programmée sur notre plateforme :

          Détails de la maintenance :
          - Date : {{maintenanceDate}}
          - Heure : {{maintenanceTime}}
          - Durée : {{duration}}
          - Impact : {{impact}}

          {{description}}

          Nous nous excusons pour tout inconvénient et vous remercions de votre patience.

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },
      educator_pending: {
        subject: 'Candidature reçue — en attente de vérification',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Candidature reçue !</h2>
            <p>Bonjour {{firstName}},</p>
            <p>Merci de vous être inscrit(e) en tant qu'éducateur·trice sur Pro Crèche Solutions. Nous avons bien reçu votre candidature, qui est actuellement en cours d'examen par notre équipe.</p>
            <p>Vous recevrez un autre e-mail dès que votre candidature aura été traitée.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{supportUrl}}" style="background-color: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Contacter l'assistance</a>
            </div>
            <p>Cordialement,<br>L'équipe Pro Crèche Solutions</p>
          </div>
        `,
        textContent: `
          Candidature reçue !

          Bonjour {{firstName}},

          Merci de vous être inscrit(e) en tant qu'éducateur·trice sur Pro Crèche Solutions. Nous avons bien reçu votre candidature, qui est actuellement en cours d'examen par notre équipe.

          Vous recevrez un autre e-mail dès que votre candidature aura été traitée.

          Des questions ? Contactez notre équipe d'assistance : {{supportUrl}}

          Cordialement,
          L'équipe Pro Crèche Solutions
        `,
      },
    };

    return defaultTemplates[event] || null;
  }
}
