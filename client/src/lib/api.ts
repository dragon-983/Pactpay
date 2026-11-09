export interface Profile {
  wallet_address: string;
  role: 'client' | 'freelancer' | 'both';
  name: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  onchain_milestone_id: number;
  title: string;
  description: string | null;
  amount_stroops: string;
  amount_xlm: string;
  status: 'pending' | 'submitted' | 'revision_requested' | 'approved' | 'paid' | 'disputed';
  deadline: string | null;
  paid_at: string | null;
  submissions?: WorkSubmission[];
}

export interface WorkSubmission {
  id: string;
  milestone_id: string;
  freelancer_address: string;
  submission_ref: string;
  notes: string | null;
  github_url: string | null;
  preview_url: string | null;
  deliverable_files: any[];
  status: 'submitted' | 'revision_requested' | 'approved';
  review_notes: string | null;
  created_at: string;
}

export interface EscrowAgreement {
  id: string;
  project_id: string;
  contract_address: string;
  onchain_agreement_id: string;
  client_address: string;
  freelancer_address: string;
  arbiter_address: string;
  token_address: string;
  total_amount_stroops: string;
  funded_amount_stroops: string;
  released_amount_stroops: string;
  refunded_amount_stroops: string;
  status: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  client_address: string;
  freelancer_address: string;
  token_symbol: string;
  token_address: string;
  total_budget: string;
  status: 'draft' | 'pending_funding' | 'funded' | 'in_progress' | 'completed' | 'disputed' | 'cancelled' | 'refunded';
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_avatar?: string;
  freelancer_name?: string;
  freelancer_avatar?: string;
  milestone_count?: number;
  completed_milestone_count?: number;
}

export interface AppNotification {
  id: string;
  recipient_address: string;
  project_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface TransactionRecord {
  id: string;
  project_id: string | null;
  tx_hash: string;
  tx_type: string;
  from_address: string;
  to_address: string | null;
  amount_stroops: string | null;
  amount_xlm: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  ledger_sequence: number | null;
  confirmed_at: string | null;
  created_at: string;
  project_title?: string;
}

const TOKEN_KEY = 'pactpay_auth_token';
const WALLET_KEY = 'pactpay_wallet_address';

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(WALLET_KEY);
  },
  getWallet: () => localStorage.getItem(WALLET_KEY),
  setWallet: (wallet: string) => localStorage.setItem(WALLET_KEY, wallet),
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = storage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  getChallenge: (walletAddress: string) =>
    request<{ ok: boolean; nonce: string; message: string }>('/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),

  verifyAuth: (walletAddress: string, nonce: string, signature: string) =>
    request<{ ok: boolean; token: string; walletAddress: string; profile: Profile | null }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, nonce, signature }),
    }),

  getMe: () =>
    request<{ ok: boolean; walletAddress: string; profile: Profile | null }>('/auth/me'),

  updateProfile: (profileData: Partial<Profile>) =>
    request<{ ok: boolean; profile: Profile }>('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  // Projects
  getProjects: (role?: 'client' | 'freelancer') =>
    request<{ ok: boolean; projects: Project[] }>(`/projects${role ? `?role=${role}` : ''}`),

  getProject: (id: string) =>
    request<{
      ok: boolean;
      project: Project;
      agreement: EscrowAgreement | null;
      milestones: Milestone[];
      disputes: any[];
    }>(`/projects/${id}`),

  createProject: (data: {
    title: string;
    description: string;
    freelancerAddress: string;
    milestones: { title: string; amountXlm: string; description?: string; deadline?: string }[];
  }) =>
    request<{ ok: boolean; project: Project; agreement: EscrowAgreement; milestones: Milestone[] }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Milestones
  submitMilestone: (id: string, data: { submissionRef: string; notes?: string; githubUrl?: string; previewUrl?: string }) =>
    request<{ ok: boolean; submission: WorkSubmission; milestone: Milestone }>(`/milestones/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  requestRevision: (id: string, revisionNotes: string) =>
    request<{ ok: boolean; milestone: Milestone }>(`/milestones/${id}/revision`, {
      method: 'POST',
      body: JSON.stringify({ revisionNotes }),
    }),

  approveMilestone: (id: string, txHash?: string) =>
    request<{ ok: boolean; milestone: Milestone; allCompleted: boolean }>(`/milestones/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    }),

  // Disputes
  openDispute: (projectId: string, reason: string, evidenceNotes?: string) =>
    request<{ ok: boolean; dispute: any }>(`/projects/${projectId}/disputes`, {
      method: 'POST',
      body: JSON.stringify({ reason, evidenceNotes }),
    }),

  resolveDispute: (disputeId: string, clientShareXlm: string, freelancerShareXlm: string, resolutionSummary: string) =>
    request<{ ok: boolean; dispute: any }>(`/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ clientShareXlm, freelancerShareXlm, resolutionSummary }),
    }),

  // Transactions
  verifyTransaction: (data: { txHash: string; projectId?: string; txType: string; amountXlm?: string; contractId?: string }) =>
    request<{ ok: boolean; verified: boolean; ledger: number; transaction: TransactionRecord }>('/transactions/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTransactions: (projectId?: string) =>
    request<{ ok: boolean; transactions: TransactionRecord[] }>(`/transactions${projectId ? `?projectId=${projectId}` : ''}`),

  // Notifications
  getNotifications: () =>
    request<{ ok: boolean; unreadCount: number; notifications: AppNotification[] }>('/notifications'),

  markNotificationRead: (id: string) =>
    request<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    request<{ ok: boolean }>('/notifications/read-all', { method: 'POST' }),
};

