export class ClerkWebhookDto {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name?: string;
    last_name?: string;
    created_at: number;
    updated_at: number;
  };
  created_at?: number;
}
