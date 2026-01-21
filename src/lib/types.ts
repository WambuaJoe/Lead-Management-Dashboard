export interface Lead {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  submittedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface SubmitLeadResponse {
  success: boolean;
  message?: string;
  leadId?: string;
}
