import React, { useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Shield,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Send,
  RefreshCw,
  Scale,
  FileCheck,
  Check,
  X,
  Github,
  Link,
  MessageSquare,
} from 'lucide-react';
import { Project, Milestone, EscrowAgreement, WorkSubmission, api } from '../lib/api.js';
import { formatXlm, shortAddress, getAccountExplorerUrl, getExplorerUrl } from '../lib/stellar.js';

interface ProjectDetailsPageProps {
  project: Project;
  agreement: EscrowAgreement | null;
  milestones: Milestone[];
  disputes: any[];
  userWallet: string | null;
  userRole: 'client' | 'freelancer';
  onBack: () => void;
  onRefresh: () => void;
}

export const ProjectDetailsPage: React.FC<ProjectDetailsPageProps> = ({
  project,
  agreement,
  milestones,
  disputes,
  userWallet,
  userRole,
  onBack,
  onRefresh,
}) => {
  // Modal states
  const [submittingMilestoneId, setSubmittingMilestoneId] = useState<string | null>(null);
  const [revisionMilestoneId, setRevisionMilestoneId] = useState<string | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form states for modals
  const [deliverableRef, setDeliverableRef] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');

  const isClient = userWallet === project.client_address;
  const isFreelancer = userWallet === project.freelancer_address;

  // Calculate released amount
  const releasedStroops = agreement ? BigInt(agreement.released_amount_stroops || '0') : 0n;
  const totalBudgetStroops = agreement ? BigInt(agreement.total_amount_stroops || '0') : 1n;
  const progressPercent = totalBudgetStroops > 0n ? Number((releasedStroops * 100n) / totalBudgetStroops) : 0;

  // Fund Escrow action
  const handleFundEscrow = async () => {
    setIsFunding(true);
    setActionError(null);
    try {
      // Simulate/Trigger on-chain Soroban fund_agreement transaction verification
      const fakeTxHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      await api.verifyTransaction({
        txHash: fakeTxHash,
        projectId: project.id,
        txType: 'fund_escrow',
        amountXlm: project.total_budget,
      });

      setActionSuccess(`Escrow successfully funded with ${formatXlm(project.total_budget)} on Stellar Testnet!`);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to fund escrow contract.');
    } finally {
      setIsFunding(false);
    }
  };

  // Submit Milestone Deliverable
  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingMilestoneId) return;

    setIsProcessing(true);
    setActionError(null);

    try {
      await api.submitMilestone(submittingMilestoneId, {
        submissionRef: deliverableRef,
        notes: deliverableNotes,
        githubUrl,
        previewUrl,
      });

      setActionSuccess('Work submitted successfully for client review!');
      setSubmittingMilestoneId(null);
      setDeliverableRef('');
      setDeliverableNotes('');
      setGithubUrl('');
      setPreviewUrl('');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit deliverable.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Request Revision
  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionMilestoneId) return;

    setIsProcessing(true);
    setActionError(null);

    try {
      await api.requestRevision(revisionMilestoneId, revisionNotes);
      setActionSuccess('Revision request submitted with feedback notes.');
      setRevisionMilestoneId(null);
      setRevisionNotes('');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to request revision.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Approve & Release Payment
  const handleApproveMilestone = async (milestoneId: string, amountXlm: string) => {
    if (!confirm(`Are you sure you want to approve this milestone and release ${amountXlm} XLM to the freelancer?`)) {
      return;
    }

    setIsProcessing(true);
    setActionError(null);

    try {
      const fakeTxHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      await api.approveMilestone(milestoneId, fakeTxHash);
      setActionSuccess(`Milestone approved! ${amountXlm} XLM released directly to the freelancer.`);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve milestone.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Dispute
  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setActionError(null);

    try {
      await api.openDispute(project.id, disputeReason, disputeEvidence);
      setActionSuccess('Dispute opened. All escrow releases are frozen pending arbiter resolution.');
      setShowDisputeModal(false);
      setDisputeReason('');
      setDisputeEvidence('');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to open dispute.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Action alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400/80 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400/80 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Project Overview Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {project.title}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-3xl">
              {project.description}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-slate-400 font-medium">Total Escrow Budget</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono mt-0.5">
              {formatXlm(project.total_budget)}
            </div>
          </div>
        </div>

        {/* Client & Freelancer Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <span className="text-slate-400 block text-[11px]">Client</span>
              <span className="font-mono font-semibold text-slate-200">
                {project.client_name || shortAddress(project.client_address)}
              </span>
            </div>
            <a
              href={getAccountExplorerUrl(project.client_address)}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <span className="text-slate-400 block text-[11px]">Assigned Freelancer</span>
              <span className="font-mono font-semibold text-slate-200">
                {project.freelancer_name || shortAddress(project.freelancer_address)}
              </span>
            </div>
            <a
              href={getAccountExplorerUrl(project.freelancer_address)}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Escrow Release Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Escrow Settlement Progress</span>
            <span className="font-mono font-bold text-white">
              {agreement ? (Number(agreement.released_amount_stroops) / 10_000_000).toFixed(2) : '0.00'} / {project.total_budget} XLM ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Needs Funding Alert for Client */}
        {project.status === 'pending_funding' && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                <Coins className="w-4 h-4 text-amber-400" /> Action Required: Fund Escrow Contract
              </div>
              <p className="text-slate-300">
                This project agreement is waiting for the client to deposit {formatXlm(project.total_budget)} into the smart contract before milestone work begins.
              </p>
            </div>

            {isClient && (
              <button
                onClick={handleFundEscrow}
                disabled={isFunding}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0 shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isFunding ? 'Confirming On-Chain...' : 'Deposit to Escrow (Freighter)'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Contract Milestones
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {milestones.length}
            </span>
          </h2>

          {/* Dispute Action */}
          {project.status !== 'completed' && project.status !== 'cancelled' && (
            <button
              onClick={() => setShowDisputeModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
            >
              <Scale className="w-3.5 h-3.5" />
              Open Dispute
            </button>
          )}
        </div>

        <div className="space-y-4">
          {milestones.map((m) => {
            const hasSubmissions = m.submissions && m.submissions.length > 0;
            const latestSubmission = hasSubmissions ? m.submissions![0] : null;

            return (
              <div
                key={m.id}
                className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">
                        {m.onchain_milestone_id}
                      </span>
                      <h3 className="text-base font-bold text-white">{m.title}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                          m.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : m.status === 'submitted'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : m.status === 'revision_requested'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>

                    {m.description && (
                      <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-2xl pl-8.5">
                        {m.description}
                      </p>
                    )}
                  </div>

                  <div className="font-mono font-bold text-lg text-emerald-400 text-right shrink-0">
                    {formatXlm(m.amount_xlm)}
                  </div>
                </div>

                {/* Latest Submission Card if any */}
                {latestSubmission && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                      <span>Work Submission</span>
                      <span>{new Date(latestSubmission.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {latestSubmission.github_url && (
                        <a
                          href={latestSubmission.github_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          <Github className="w-3.5 h-3.5" /> Repository Pull Request
                        </a>
                      )}
                      {latestSubmission.preview_url && (
                        <a
                          href={latestSubmission.preview_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          <Link className="w-3.5 h-3.5" /> Live Preview
                        </a>
                      )}
                    </div>

                    {latestSubmission.notes && (
                      <p className="text-slate-300 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                        "{latestSubmission.notes}"
                      </p>
                    )}

                    {latestSubmission.review_notes && (
                      <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-300">
                        <span className="font-bold block">Client Feedback:</span>
                        {latestSubmission.review_notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Contextual Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  {/* Freelancer actions */}
                  {isFreelancer && m.status !== 'paid' && (
                    <button
                      onClick={() => setSubmittingMilestoneId(m.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-emerald-500/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {m.status === 'revision_requested' ? 'Resubmit Deliverable' : 'Submit Deliverable'}
                    </button>
                  )}

                  {/* Client actions */}
                  {isClient && m.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => setRevisionMilestoneId(m.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Request Revision
                      </button>
                      <button
                        onClick={() => handleApproveMilestone(m.id, m.amount_xlm)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-emerald-500/20"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Approve & Release Payment
                      </button>
                    </>
                  )}

                  {m.status === 'paid' && (
                    <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Paid & Settled
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Submit Deliverable */}
      {submittingMilestoneId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-800 p-6 sm:p-8 relative">
            <button
              onClick={() => setSubmittingMilestoneId(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white">Submit Milestone Deliverable</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Provide verifiable deliverable links or git repositories for client approval.
            </p>

            <form onSubmit={handleSubmitWork} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Deliverable Reference / Summary Link <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deliverableRef}
                  onChange={(e) => setDeliverableRef(e.target.value)}
                  placeholder="https://github.com/myproject/pull/42 or IPFS hash"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">GitHub Repository Link</label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Live Demo / Preview URL</label>
                <input
                  type="url"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                  placeholder="https://demo.vercel.app"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Summary Notes</label>
                <textarea
                  rows={3}
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  placeholder="Explain completed work, verification steps, and tests performed..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSubmittingMilestoneId(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  {isProcessing ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Request Revision */}
      {revisionMilestoneId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-800 p-6 sm:p-8 relative">
            <button
              onClick={() => setRevisionMilestoneId(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white">Request Milestone Revision</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Provide constructive feedback to help the freelancer satisfy deliverable requirements.
            </p>

            <form onSubmit={handleRequestRevision} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Revision Feedback <span className="text-emerald-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Specify missing features, test adjustments, or code reviews required..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRevisionMilestoneId(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  {isProcessing ? 'Sending...' : 'Send Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Open Dispute */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-800 p-6 sm:p-8 relative">
            <button
              onClick={() => setShowDisputeModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-rose-400" />
              Open Escrow Dispute
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Opening a dispute will freeze all remaining escrow funds on-chain until an arbiter authorizes a resolution.
            </p>

            <form onSubmit={handleOpenDispute} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Dispute Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Clearly explain the disagreement or breached terms..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Supporting Evidence / Links</label>
                <textarea
                  rows={3}
                  value={disputeEvidence}
                  onChange={(e) => setDisputeEvidence(e.target.value)}
                  placeholder="Provide communication logs, commit links, or specifications..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold disabled:opacity-50"
                >
                  {isProcessing ? 'Opening...' : 'Freeze & Open Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
