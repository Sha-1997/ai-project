'use client';

import React from 'react';
import { Button } from './SharedUI';

interface CandidateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (jobId: string) => void;
  job: {
    id: string;
    title: string;
    description: string;
    employmentType?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    experienceLevel?: string;
    organization?: {
      name?: string;
    };
    category?: {
      name?: string;
    };
    locations?: Array<{
      country?: string;
      city?: string;
      workplaceType?: string;
    }>;
    skills?: Array<string | { skillName?: string }>;
    createdAt?: string;
  } | null;
  isApplying?: boolean;
  isApplied?: boolean;
}

export const CandidateJobModal: React.FC<CandidateJobModalProps> = ({
  isOpen,
  onClose,
  onApply,
  job,
  isApplying = false,
  isApplied = false,
}) => {
  if (!isOpen || !job) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 p-4 sm:p-6 backdrop-blur-xl">
      <div className="mx-auto mt-2 mb-2 w-full max-w-5xl overflow-visible rounded-[2rem] border border-slate-800 bg-slate-950/95 shadow-2xl shadow-black/50 ring-1 ring-slate-800 flex flex-col">
        <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-200">
                  JOB PREVIEW
                </span>
                {isApplied && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">
                    Applied
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                  {job.category?.name || 'General'}
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">{job.title}</h2>
              <p className="mt-2 text-sm text-slate-400 sm:text-base">
                {job.organization?.name || 'Unknown employer'} · Posted{' '}
                {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => onApply(job.id)}
                disabled={isApplying || isApplied}
                className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplied ? 'Applied' : isApplying ? 'Applying…' : 'One-click Apply'}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-600 hover:text-white"
                aria-label="Close job details"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[1.7fr_0.9fr] text-slate-200 flex-1">
          <div className="min-w-0">
            <section className="mb-6 rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-6 shadow-sm shadow-slate-950/20">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Job Description</h3>
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  {job.experienceLevel || 'Any Level'}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300 whitespace-pre-line break-words overflow-hidden">{job.description}</p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 items-stretch">
              <div className="flex h-full flex-col justify-between rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Employment</p>
                  <p className="mt-3 text-lg font-semibold text-white">{job.employmentType || 'N/A'}</p>
                </div>
              </div>
              <div className="flex h-full flex-col justify-between rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Salary</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {job.salaryMin != null || job.salaryMax != null
                      ? `${job.salaryMin ?? '-'} - ${job.salaryMax ?? '-'} ${job.salaryCurrency ?? ''}`
                      : 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="flex h-full flex-col justify-between rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Location</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {job.locations?.map((loc) => loc.city || loc.country).filter(Boolean).join(' • ') || 'Remote'}
                  </p>
                </div>
              </div>
              <div className="flex h-full flex-col justify-between rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Category</p>
                  <p className="mt-3 text-lg font-semibold text-white">{job.category?.name || 'N/A'}</p>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6 min-w-0">
            <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-6 shadow-sm shadow-slate-950/10">
              <h3 className="text-sm font-semibold text-white">Company Snapshot</h3>
              <p className="mt-4 text-sm leading-7 text-slate-400 break-words">
                {job.organization?.name || 'A leading partner in the ecosystem, focused on delivering AI-first experiences.'}
              </p>
            </section>

            <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-6">
              <h3 className="text-sm font-semibold text-white">Required Skills</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {job.skills?.length ? (
                  job.skills.map((skill, index) => {
                    const label = typeof skill === 'string' ? skill : skill.skillName || 'Skill';
                    return (
                      <span
                        key={index}
                        className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs font-medium text-slate-200"
                      >
                        {label}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-slate-400">Skills were not shared.</span>
                )}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-6">
              <h3 className="text-sm font-semibold text-white">Quick Facts</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-400 break-words">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <span>Status</span>
                  <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-300">{isApplied ? 'Already Applied' : 'Open'}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <span>Experience</span>
                  <span>{job.experienceLevel || 'Any'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Posted</span>
                  <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

      </div>
    </div>
  );
};
