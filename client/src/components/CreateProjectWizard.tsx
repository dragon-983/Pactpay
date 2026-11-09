import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
  Shield,
  Coins,
  AlertCircle,
} from 'lucide-react';
import { isValidStellarAddress, shortAddress, formatXlm } from '../lib/stellar.js';
import { api, Project } from '../lib/api.js';

interface CreateProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

interface MilestoneFormItem {
  title: string;
  amountXlm: string;
  description: string;
  deadline?: string;
}

export const CreateProjectWizard: React.FC<CreateProjectWizardProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [freelancerAddress, setFreelancerAddress] = useState('');
  const [milestones, setMilestones] = useState<MilestoneFormItem[]>([
    { title: 'Milestone 1: Architectural Design & Setup', amountXlm: '300', description: 'Wireframes, API spec, and environment setup' },
    { title: 'Milestone 2: Production Deliverable & Testing', amountXlm: '700', description: 'Complete implementation and test verification' },
  ]);

  if (!isOpen) return null;

  const totalBudgetXlm = milestones.reduce((acc, m) => acc + (parseFloat(m.amountXlm) || 0), 0);

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: `Milestone ${milestones.length + 1}`,
        amountXlm: '250',
        description: '',
      },
    ]);
  };

  const removeMilestone = (idx: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  const updateMilestone = (idx: number, field: keyof MilestoneFormItem, val: string) => {
    const updated = [...milestones];
    updated[idx] = { ...updated[idx], [field]: val };
    setMilestones(updated);
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!title.trim() || !description.trim()) {
        setError('Please provide a project title and description.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!isValidStellarAddress(freelancerAddress.trim())) {
        setError('Please enter a valid Stellar G... public key address for the freelancer.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (milestones.some((m) => !m.title.trim() || !m.amountXlm || parseFloat(m.amountXlm) <= 0)) {
        setError('All milestones must have a title and positive XLM amount.');
        return;
      }
      setStep(4);
    }
  };

  const handleCreateProject = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.createProject({
        title,
        description,
        freelancerAddress: freelancerAddress.trim(),
        milestones: milestones.map((m) => ({
          title: m.title.trim(),
          amountXlm: m.amountXlm.trim(),
          description: m.description.trim(),
          deadline: m.deadline,
        })),
      });

      onProjectCreated(res.project);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize project escrow.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Wizard Steps Indicator */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
              Step {step} of 4
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">
              {step === 1 && 'Project Details'}
              {step === 2 && 'Assign Freelancer'}
              {step === 3 && 'Define Milestones & Budget'}
              {step === 4 && 'Review & Initialize Escrow'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : step > s
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Project Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project Title <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cross-Platform Mobile Wallet or Full Stack Rust Soroban Integration"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Deliverable Scope & Description <span className="text-emerald-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe deliverables, technical requirements, repo links, and success criteria for milestone releases..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Step 2: Freelancer Address */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Freelancer Stellar Public Key (Ed25519) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={freelancerAddress}
                onChange={(e) => setFreelancerAddress(e.target.value.trim())}
                placeholder="G..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                The smart contract releases funds exclusively to this public key upon milestone approvals.
              </p>
            </div>

            {freelancerAddress && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  isValidStellarAddress(freelancerAddress)
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                }`}
              >
                {isValidStellarAddress(freelancerAddress) ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Valid Stellar public key format</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Invalid Stellar public key (must be 56 characters starting with G)</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Milestones Builder */}
        {step === 3 && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Milestones ({milestones.length})
              </span>
              <button
                type="button"
                onClick={addMilestone}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            </div>

            {milestones.map((m, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => updateMilestone(idx, 'title', e.target.value)}
                    placeholder="Milestone title"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 w-32 shrink-0">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={m.amountXlm}
                      onChange={(e) => updateMilestone(idx, 'amountXlm', e.target.value)}
                      placeholder="XLM"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-400">XLM</span>
                  </div>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={m.description}
                  onChange={(e) => updateMilestone(idx, 'description', e.target.value)}
                  placeholder="Deliverable details / GitHub target..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            ))}

            <div className="pt-2 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-400">Total Escrow Budget:</span>
              <span className="text-base text-emerald-400 font-mono">{formatXlm(totalBudgetXlm)}</span>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Escrow Terms */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Project Title:</span>
                <span className="font-bold text-white">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Freelancer:</span>
                <span className="font-mono text-slate-200">{shortAddress(freelancerAddress)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Milestones:</span>
                <span className="text-slate-200 font-bold">{milestones.length} milestones</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                <span className="font-bold text-slate-300">Total Escrow Budget:</span>
                <span className="font-mono font-extrabold text-emerald-400">{formatXlm(totalBudgetXlm)}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Smart Contract Guarantees
              </div>
              <p className="leading-relaxed text-slate-400">
                1. Once initialized, you will fund the escrow contract directly from your Freighter wallet.
                <br />
                2. Funds cannot be unilaterally reclaimed once work starts without mutual agreement or dispute arbitration.
                <br />
                3. The freelancer receives payment automatically upon your explicit milestone approval.
              </p>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-emerald-500/20"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreateProject}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              {submitting ? 'Initializing Escrow...' : 'Initialize & Lock Agreement'}
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

