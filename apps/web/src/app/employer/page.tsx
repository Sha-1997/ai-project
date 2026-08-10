'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  EmptyState,
  LoadingState,
  Modal,
  Toast,
} from '../../components/SharedUI';
import { apiFetch } from '@/app/utils/apiFetch';

// Define TypeScript Typings
interface Job {
  id: string;
  title: string;
  description: string;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  experienceLevel: string;
  status: string; // DRAFT, PUBLISHED, PAUSED, CLOSED
  createdAt: string;
}

interface Application {
  id: string;
  status: string;
  appliedAt: string;
  notes?: string;
  job: {
    id: string;
    title: string;
  };
  candidate: {
    id: string;
    headline: string;
    summary: string;
    skills: string[];
    user: {
      email: string;
      fullName?: string;
    };
  };
  aiScreening?: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    risk: string;
    fitRecommendation: string;
  };
}

export default function EmployerPortal() {
  const router = useRouter();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'org' | 'jobs' | 'applicants'>(
    'dashboard',
  );

  // Auth Context & User info
  const [authToken, setAuthToken] = useState<string>('');
  const [organizationExists, setOrganizationExists] = useState(false);
  const [checkingOrganization, setCheckingOrganization] = useState(true);
  const [recruiterInfo, setRecruiterInfo] = useState({
    name: 'Recruiter Manager',
    email: '',
    role: 'EMPLOYER',

    organization: {
      id: '',
      name: 'Loading Organization...',
      industry: '',
      companySize: '',
      website: '',
      headquarters: '',
      countries: [] as string[],
      logoUrl: '',
      isVerified: false,
    },
  });

  // Jobs management states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [newJob, setNewJob] = useState({
    // Core — required by CreateJobV2Dto
    title: '',
    description: '',
    employmentType: 'FULL_TIME',
    // Experience
    experienceLevel: 'MID', // ENTRY | MID | SENIOR | LEAD
    experienceYears: '', // optional number
    // Compensation
    salaryMin: '',
    salaryMax: '',
    salaryVisible: true, // boolean
    // Classification
    categoryName: 'Artificial Intelligence',
    department: '', // optional
    industry: '', // optional
    // Location (single entry; mapped to locations[])
    country: 'United Arab Emirates',
    city: 'Dubai',
    workplaceType: 'HYBRID', // ONSITE | REMOTE | HYBRID
    // Tags
    skills: 'Python, PyTorch',
    benefits: 'Health Insurance, Visa Sponsorship',
  });

  // Applicants management states
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [hiringSalary, setHiringSalary] = useState('');
  const [hiringJoinedDate, setHiringJoinedDate] = useState('');

  // Editable org profile state
  const [orgEdit, setOrgEdit] = useState({
    name: '',
    industry: '',
    companySize: '',
    website: '',
    headquarters: '',
    countries: [] as string[],
  });
  const workflowStages = [
    'APPLIED',
    'UNDER_REVIEW',
    'SHORTLISTED',
    'INTERVIEW_SCHEDULED',
    'OFFER_EXTENDED',
    'HIRED',
    'REJECTED',
  ];

  const currentStatus = selectedApplication?.status || '';
  // Countries input (comma-separated text)
  const [countriesInput, setCountriesInput] = useState('');
  // Sync countries input when organization loads
  useEffect(() => {
    setCountriesInput(recruiterInfo.organization.countries?.join(', ') || '');
  }, [recruiterInfo.organization.countries]);
  useEffect(() => {
    if (activeTab === 'applicants' && applications.length > 0 && !selectedApplication) {
      setSelectedApplication(applications[0]);
    }
  }, [activeTab, applications, selectedApplication]);
  // Sync org edit fields when recruiterInfo loads
  useEffect(() => {
    setOrgEdit({
      name: recruiterInfo.organization.name || '',
      industry: recruiterInfo.organization.industry || '',
      companySize: recruiterInfo.organization.companySize || '',
      website: recruiterInfo.organization.website || '',
      headquarters: recruiterInfo.organization.headquarters || '',
      countries: recruiterInfo.organization.countries || [],
    });
  }, [recruiterInfo.organization]);

  // Logo upload states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDragging, setLogoDragging] = useState(false);

  // Edit job states
  const [showEditJob, setShowEditJob] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editJobForm, setEditJobForm] = useState({
    title: '',
    description: '',
    employmentType: 'FULL_TIME',
    experienceLevel: 'MID',
    experienceYears: '',
    salaryMin: '',
    salaryMax: '',
    salaryVisible: true,
    categoryName: 'Artificial Intelligence',
    department: '',
    industry: '',
    skills: '',
    benefits: '',
  });

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  // Initial Authentication & Load
  useEffect(() => {
    const employerToken = localStorage.getItem('employer_token');

    const ecosystemToken = localStorage.getItem('accessToken');

    const token = employerToken || ecosystemToken;

    if (!token) {
      triggerToast('Please login to access the employer portal console.', 'error');

      router.replace('/employer-login');

      return;
    }

    setAuthToken(token);
  }, [router]);

  useEffect(() => {
    if (authToken) {
      initializeEmployerWorkspace();
    }
  }, [authToken]);
  const initializeEmployerWorkspace = async () => {
    try {
      setCheckingOrganization(true);

      const organization = await loadProfileAndOrg();

      /**
       * Organization not created
       */
      if (!organization) {
        setOrganizationExists(false);

        // Force organization profile tab
        setActiveTab('org');

        triggerToast('Please complete your organization profile before creating jobs.', 'info');

        return;
      }

      /**
       * Organization exists
       */
      setOrganizationExists(true);

      // Now only load employer modules
      await Promise.all([fetchJobs(), fetchApplications()]);
    } catch (error) {
      console.log('Employer workspace initialization failed:', error);

      triggerToast('Failed to initialize employer workspace.', 'error');
    } finally {
      setCheckingOrganization(false);
    }
  };

  // Load Recruiter Profile and Organization

  const loadProfileAndOrg = async () => {
    try {
      // Employer profile
      const empRes = await apiFetch('/employers/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      let email = '';
      let name = 'Recruiter Manager';

      if (empRes.ok) {
        const empData = await empRes.json();

        const emp = empData.data || empData;

        email = emp.user?.email || '';

        name = emp.user?.fullName || 'Recruiter Manager';
      }

      // Organization check
      const orgRes = await apiFetch('/organizations/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      /**
       * IMPORTANT
       * No organization created
       */
      if (!orgRes.ok) {
        if (orgRes.status === 404) {
          setRecruiterInfo((prev) => ({
            ...prev,

            name,
            email,
          }));

          return null;
        }

        throw new Error('Organization loading failed');
      }

      const orgData = await orgRes.json();

      const org = orgData.data || orgData;

      setRecruiterInfo({
        name,

        email,

        role: 'EMPLOYER',

        organization: {
          id: org.id,

          name: org.name || '',

          industry: org.industry || '',

          companySize: org.companySize || '',

          website: org.website || '',

          headquarters: org.headquarters || '',

          countries: org.countries || [],

          logoUrl: org.logoUrl || '',

          isVerified: org.isVerified || false,
        },
      });
      setOrganizationExists(true);

      if (org.logoUrl) {
        setLogoPreview(`http://localhost:5000${org.logoUrl}`);
      }

      return org;
    } catch (error) {
      console.log('Organization error:', error);

      triggerToast('Unable to load organization profile.', 'error');

      return null;
    }
  };

  // Fetch Recruiter Jobs List
  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const response = await apiFetch('/employers/me/jobs', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        const jobsList = data.data ? data.data.jobs : data.jobs || data;
        setJobs(jobsList || []);
      }
    } catch (err) {
      triggerToast('Error loading jobs list.', 'error');
    } finally {
      setJobsLoading(false);
    }
  };

  // Fetch Received Applications
  const fetchApplications = async () => {
    setApplicantsLoading(true);
    try {
      const response = await apiFetch('/employers/applications', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('APPLICATION DATA:', JSON.stringify(data, null, 2));
        const appsList = data.data || data;

        // Enrich applications with AI screening models
        const enriched = (appsList || []).map((app: any) => ({
          ...app,

          status: app.status || app.applicationStatus || app.pipelineStage || 'APPLIED',

          aiScreening: app.aiScreening || null,
        }));

        setApplications(enriched);
        if (selectedApplication) {
          const updatedSelected = enriched.find(
            (item: Application) => item.id === selectedApplication.id,
          );

          if (updatedSelected) {
            setSelectedApplication(updatedSelected);
          }
        }
      }
    } catch (err) {
      triggerToast('Error loading applicants list.', 'error');
    } finally {
      setApplicantsLoading(false);
    }
  };

  // Post a new Job
  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: newJob.title,
        description: newJob.description,
        employmentType: newJob.employmentType,
        experienceLevel: newJob.experienceLevel,
        experienceYears: newJob.experienceYears ? parseInt(newJob.experienceYears, 10) : undefined,
        salaryMin: newJob.salaryMin ? parseFloat(newJob.salaryMin) : undefined,
        salaryMax: newJob.salaryMax ? parseFloat(newJob.salaryMax) : undefined,
        salaryVisible: newJob.salaryVisible,
        categoryName: newJob.categoryName || undefined,
        department: newJob.department || undefined,
        industry: newJob.industry || undefined,
        locations: [
          {
            country: newJob.country,
            city: newJob.city,
            workplaceType: newJob.workplaceType,
          },
        ],
        skills: newJob.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        benefits: newJob.benefits
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean),
      };

      const response = await apiFetch('/employers/me/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        triggerToast('Job posting created successfully!');
        setShowCreateJob(false);
        fetchJobs();
      } else {
        const data = await response.json();
        triggerToast(data.message || 'Failed to create job template.', 'error');
      }
    } catch (err) {
      triggerToast('Failed to create job template.', 'error');
    }
  };

  const openEditJob = (job: Job) => {
    if (job.status !== 'DRAFT') {
      triggerToast('Published or paused jobs cannot be edited.', 'error');
      return;
    }

    setEditingJob(job);
    setEditJobForm({
      title: job.title || '',
      description: job.description || '',
      employmentType: job.employmentType || 'FULL_TIME',
      experienceLevel: job.experienceLevel || 'MID',
      experienceYears: (job as any).experienceYears ? String((job as any).experienceYears) : '',
      salaryMin: job.salaryMin ? String(job.salaryMin) : '',
      salaryMax: job.salaryMax ? String(job.salaryMax) : '',
      salaryVisible: (job as any).salaryVisible ?? true,
      categoryName: (job as any).category?.name || 'Artificial Intelligence',
      department: (job as any).department || '',
      industry: (job as any).industry || '',
      skills: (job as any).skills?.map((s: any) => s.skillName).join(', ') || '',
      benefits: (job as any).benefits?.map((b: any) => b.benefitName).join(', ') || '',
    });
    setShowEditJob(true);
  };

  const handleDuplicateJob = async (job: Job) => {
    try {
      const response = await apiFetch(`/employers/me/jobs/${job.id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        triggerToast(`"${job.title}" duplicated as a new draft.`);
        fetchJobs();
      } else {
        const data = await response.json();
        triggerToast(data.message || 'Failed to duplicate job.', 'error');
      }
    } catch {
      triggerToast('Failed to duplicate job.', 'error');
    }
  };

  const handleDeleteJob = async (job: Job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    try {
      const response = await apiFetch(`/employers/me/jobs/${job.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        triggerToast('Job deleted successfully.');
        fetchJobs();
      } else {
        const data = await response.json();
        triggerToast(data.message || 'Failed to delete job.', 'error');
      }
    } catch {
      triggerToast('Failed to delete job.', 'error');
    }
  };

  const handleEditJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    try {
      const payload = {
        title: editJobForm.title,
        description: editJobForm.description,
        employmentType: editJobForm.employmentType,
        experienceLevel: editJobForm.experienceLevel,
        experienceYears: editJobForm.experienceYears
          ? parseInt(editJobForm.experienceYears, 10)
          : undefined,
        salaryMin: editJobForm.salaryMin ? parseFloat(editJobForm.salaryMin) : undefined,
        salaryMax: editJobForm.salaryMax ? parseFloat(editJobForm.salaryMax) : undefined,
        salaryVisible: editJobForm.salaryVisible,
        categoryName: editJobForm.categoryName || undefined,
        department: editJobForm.department || undefined,
        industry: editJobForm.industry || undefined,
        skills: editJobForm.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        benefits: editJobForm.benefits
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean),
      };

      const response = await apiFetch(`/employers/me/jobs/${editingJob.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        triggerToast('Job updated successfully!');
        setShowEditJob(false);
        setEditingJob(null);
        fetchJobs();
      } else {
        const data = await response.json();
        triggerToast(data.message || 'Failed to update job.', 'error');
      }
    } catch (err) {
      triggerToast('Failed to update job.', 'error');
    }
  };

  // Job lifecycle status transitions
  const transitionJobStatus = async (jobId: string, action: 'publish' | 'pause' | 'close') => {
    try {
      const response = await apiFetch(`/employers/me/jobs/${jobId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        triggerToast(`Job status transitioned successfully!`);
        fetchJobs();
      } else {
        const data = await response.json();
        triggerToast(data.message || 'Failed to transition status.', 'error');
      }
    } catch (err) {
      triggerToast('Failed to transition job status.', 'error');
    }
  };

  // Update Applicant hiring workflow status
  const updateApplicantStatus = async (appId: string, nextStage: string) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/v1/employers/applications/${appId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            status: nextStage,
            notes: 'Status updated via Recruiter console.',
          }),
        },
      );

      if (response.ok) {
        triggerToast('Candidate stage transitioned!');
        fetchApplications();
        if (selectedApplication && selectedApplication.id === appId) {
          setSelectedApplication((prev) => (prev ? { ...prev, status: nextStage } : null));
        }
      } else {
        const data = await response.json();
        triggerToast(data.message || 'Failed to update status.', 'error');
      }
    } catch (err) {
      triggerToast('Failed to update candidate status.', 'error');
    }
  };

  // Submit Recruiter internal private comments note
  const submitRecruiterNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplication || !noteContent.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/v1/applications/${selectedApplication.id}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ content: noteContent }),
        },
      );

      if (response.ok) {
        triggerToast('Internal feedback note attached!');
        setNoteContent('');
      } else {
        const data = await response.json();
        triggerToast(data.message || 'Failed to attach comment.', 'error');
      }
    } catch (err) {
      triggerToast('Failed to submit internal comments.', 'error');
    }
  };

  // Submit Hiring decision details
  const submitHiringDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplication) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/v1/applications/${selectedApplication.id}/hiring`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            decision: 'HIRED',
            offeredSalary: hiringSalary ? parseFloat(hiringSalary) : undefined,
            joinedAt: hiringJoinedDate || undefined,
            notes: 'Officially extended ecosystem job offer.',
          }),
        },
      );

      if (response.ok) {
        triggerToast('Hiring decision logged successfully!');
        updateApplicantStatus(selectedApplication.id, 'HIRED');
        setHiringSalary('');
        setHiringJoinedDate('');
      } else {
        const data = await response.json();
        triggerToast(data.message || 'Failed to log hiring decision.', 'error');
      }
    } catch (err) {
      triggerToast('Failed to submit hiring offer details.', 'error');
    }
  };

  // Handle logo file selection
  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      triggerToast('Please upload a valid image file.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      triggerToast('Logo must be under 2MB.', 'error');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setLogoDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  };

  const handleLogoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setLogoDragging(true);
  };

  const handleLogoDragLeave = () => setLogoDragging(false);

  const handleLogoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
  };

  const handleSaveOrgProfile = async () => {
    try {
      const formData = new FormData();

      formData.append('name', orgEdit.name || '');
      formData.append('industry', orgEdit.industry || '');
      formData.append('companySize', orgEdit.companySize || '');
      formData.append('website', orgEdit.website || '');
      formData.append('headquarters', orgEdit.headquarters || '');

      // Array needs JSON conversion
      const countries = countriesInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      formData.append('countries', JSON.stringify(countries));

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await apiFetch('/organizations/me', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();

        triggerToast(data.message || 'Failed to save organization profile.', 'error');

        return;
      }

      const updatedOrg = await loadProfileAndOrg();

      setLogoFile(null);

      if (updatedOrg?.logoUrl) {
        setLogoPreview(`http://localhost:5000${updatedOrg.logoUrl}`);
      }

      triggerToast('Organization profile saved successfully!');
    } catch (error) {
      console.log(error);

      triggerToast('Failed to save organization profile.', 'error');
    }
  };

  // Sign out
  const handleLogout = () => {
    localStorage.clear();
    triggerToast('Logged out successfully.');
    router.push('/employer-login');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col text-slate-100">
      {/* Toast Alert banner */}
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      )}

      {/* Main Header Component */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
              JovianeX Recruiter Workspace
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold">
              💼 {recruiterInfo.organization.name}
            </span>
            <span className="text-slate-400">{recruiterInfo.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-slate-300 border-slate-700 hover:bg-slate-800"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Grid Dashboard layout */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-6 p-4 md:p-6">
        {/* Sidebar Nav controls */}
        <aside className="w-full md:w-64 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            🏠 Today's Operations
          </button>
          <button
            disabled={!organizationExists}
            onClick={() => {
              if (organizationExists) {
                setActiveTab('jobs');
              }
            }}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all ${
              !organizationExists
                ? 'opacity-40 cursor-not-allowed text-slate-600'
                : activeTab === 'jobs'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            💼 Jobs Openings ({jobs.length})
            {!organizationExists && (
              <span className="block text-[10px] text-amber-400 mt-1">
                Complete organization profile first
              </span>
            )}
          </button>
          <button
            disabled={!organizationExists}
            onClick={() => {
              if (organizationExists) {
                setActiveTab('applicants');
              }
            }}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all ${
              !organizationExists
                ? 'opacity-40 cursor-not-allowed text-slate-600'
                : activeTab === 'applicants'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            👥 Candidate Screening ({applications.length})
            {!organizationExists && (
              <span className="block text-[10px] text-amber-400 mt-1">Organization required</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('org')}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'org'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            🏢 Organization Profile
          </button>
        </aside>

        {/* Tab contents pages */}
        <main className="flex-1 flex flex-col gap-6">
          {/* TAB 1: WORKFLOW HOMEPAGE */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white rounded-2xl p-6 border border-slate-800 shadow-xl">
                <h2 className="text-xl font-bold mb-2">Today's Operations Highlights 📋</h2>
                <p className="text-slate-400 text-xs">
                  Review applicant profiles, schedule interviews, and evaluate AI-screened candidate
                  ranks directly.
                </p>
              </div>

              {/* Action queue highlights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Shortlisted feed card */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="border-b border-slate-850">
                    <CardTitle className="text-sm font-bold text-white">
                      ✨ Today's AI Shortlisted Candidates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col gap-3">
                    {applications.filter(
                      (a) => a.status === 'APPLIED' || a.status === 'UNDER_REVIEW',
                    ).length === 0 ? (
                      <span className="text-xs text-slate-500">No new applications to screen.</span>
                    ) : (
                      applications.slice(0, 3).map((app) => (
                        <div
                          key={app.id}
                          onClick={() => {
                            setSelectedApplication(app);
                            setActiveTab('applicants');
                          }}
                          className="p-3 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-850 rounded-xl flex justify-between items-center cursor-pointer transition-all"
                        >
                          <div>
                            <h4 className="font-bold text-xs text-white">
                              {app.candidate.user.fullName || app.candidate.user.email}
                            </h4>
                            <span className="text-[10px] text-indigo-400 block mt-0.5">
                              {app.job.title}
                            </span>
                          </div>
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                            Screen Match
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Interviews scheduled today */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader className="border-b border-slate-850">
                    <CardTitle className="text-sm font-bold text-white">
                      🎤 Interviews Scheduled Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col gap-3">
                    {applications.filter((a) => a.status === 'INTERVIEW_SCHEDULED').length === 0 ? (
                      <div className="p-4 text-center">
                        <span className="text-xs text-slate-500">
                          No interviews scheduled today.
                        </span>
                      </div>
                    ) : (
                      applications
                        .filter((a) => a.status === 'INTERVIEW_SCHEDULED')
                        .map((app) => (
                          <div
                            key={app.id}
                            className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex justify-between items-center"
                          >
                            <div>
                              <h4 className="font-bold text-xs text-white">
                                {app.candidate.user.fullName || app.candidate.user.email}
                              </h4>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                Time Slot: 2:00 PM • Remote Google Meet
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(app);
                                setActiveTab('applicants');
                              }}
                              className="bg-indigo-600 hover:bg-indigo-500 text-[10px] py-1 h-[28px]"
                            >
                              Join Prep
                            </Button>
                          </div>
                        ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Pending reviews metrics */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="border-b border-slate-850">
                  <CardTitle className="text-white text-sm">Today's Hiring Funnel</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                      <span className="text-2xl font-bold text-emerald-400">
                        {applications.filter((a) => a.status === 'APPLIED').length}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                        New Candidates
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                      <span className="text-2xl font-bold text-indigo-400">
                        {applications.filter((a) => a.status === 'UNDER_REVIEW').length}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                        Under Review
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                      <span className="text-2xl font-bold text-purple-400">
                        {applications.filter((a) => a.status === 'INTERVIEW_SCHEDULED').length}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                        Interviews
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                      <span className="text-2xl font-bold text-amber-400">
                        {
                          applications.filter(
                            (a) => a.status === 'OFFER_EXTENDED' || a.status === 'HIRED',
                          ).length
                        }
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                        Hired Decisions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: JOBS OPENINGS */}
          {activeTab === 'jobs' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-100 text-lg">Job Openings ({jobs.length})</h3>
                <Button
                  onClick={() => setShowCreateJob(true)}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  ➕ Create Job Opening
                </Button>
              </div>

              {jobsLoading ? (
                <LoadingState label="Loading job openings list..." />
              ) : jobs.length === 0 ? (
                <EmptyState
                  title="No jobs created yet"
                  desc="Click create job button to initialize opening."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {jobs.map((job) => (
                    <Card
                      key={job.id}
                      className="bg-slate-900 border-slate-800 hover:border-slate-750 transition-all flex flex-col justify-between"
                    >
                      <CardHeader className="border-slate-800 pb-2">
                        <div className="flex justify-between items-start gap-4">
                          <CardTitle className="text-white text-base">{job.title}</CardTitle>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                              job.status === 'PUBLISHED'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 text-xs text-slate-400 leading-relaxed flex-grow">
                        <p className="line-clamp-4">{job.description}</p>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 border-t border-slate-850 pt-4">
                        {/* DRAFT JOB */}
                        {job.status === 'DRAFT' && (
                          <>
                            {/* Edit - Delete is inside Edit Modal */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditJob(job)}
                              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                            >
                              ✏️ Edit
                            </Button>

                            {/* Publish */}
                            <Button
                              size="sm"
                              onClick={() => transitionJobStatus(job.id, 'publish')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                            >
                              🚀 Publish
                            </Button>
                          </>
                        )}

                        {/* PUBLISHED JOB */}
                        {job.status === 'PUBLISHED' && (
                          <>
                            {/* No Edit / No Delete after publishing */}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => transitionJobStatus(job.id, 'pause')}
                              className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-md font-mediumtransition"
                            >
                              ⏸ Pause
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => transitionJobStatus(job.id, 'close')}
                              className="text-xs"
                            >
                              🔒 Close
                            </Button>
                          </>
                        )}

                        {/* PAUSED JOB */}
                        {job.status === 'PAUSED' && (
                          <>
                            {/* No Edit / No Delete */}
                            <Button
                              size="sm"
                              onClick={() => transitionJobStatus(job.id, 'publish')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                            >
                              ▶ Resume
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => transitionJobStatus(job.id, 'close')}
                              className="text-xs"
                            >
                              🔒 Close
                            </Button>
                          </>
                        )}

                        {/* CLOSED JOB */}
                        {job.status === 'CLOSED' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDuplicateJob(job)}
                              className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-md font-medium transition"
                            >
                              📋 Duplicate as Draft
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteJob(job)}
                              className="text-xs"
                            >
                              🗑️ Delete
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CANDIDATE SCREENING DETAILS */}
          {activeTab === 'applicants' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <h3 className="font-bold text-slate-100 text-lg">Candidate Screening & Audits</h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Applicants sidebar list */}
                <div className="lg:col-span-1 flex flex-col gap-3">
                  {applicantsLoading ? (
                    <LoadingState label="Loading candidate pipeline..." />
                  ) : applications.length === 0 ? (
                    <EmptyState title="No applicants" desc="Applications will display here." />
                  ) : (
                    applications.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApplication(app)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedApplication?.id === app.id
                            ? 'bg-slate-900 border-emerald-500/50 text-white shadow-xl'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <h4 className="font-bold text-sm">
                          {app.candidate.user.fullName || app.candidate.user.email}
                        </h4>
                        <span className="text-xs text-slate-400 block mt-1">{app.job.title}</span>
                        <span className="inline-block text-[10px] font-bold mt-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wider">
                          {app.status.replaceAll('_',' ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Candidate details screening card */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {selectedApplication ? (
                    <Card className="bg-slate-900 border-slate-800 animate-fade-in">
                      <CardHeader className="border-b border-slate-850">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-white text-lg">
                              {selectedApplication.candidate.user.fullName ||
                                selectedApplication.candidate.user.email}
                            </CardTitle>
                            <span className="text-xs text-indigo-400 block mt-1 font-semibold">
                              🎯 {selectedApplication.candidate.headline || 'Candidate Profile'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Applied: {new Date(selectedApplication.appliedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 flex flex-col gap-6">
                        {/* AI candidate screening model */}
                        {selectedApplication.aiScreening && (
                          <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl text-xs flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                              <span className="text-emerald-400 font-bold uppercase tracking-wider">
                                ✨ AI Portal Screening Assessment:
                              </span>
                              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-2.5 py-1 rounded font-bold uppercase">
                                {selectedApplication.aiScreening.fitRecommendation}
                              </span>
                            </div>
                            <p className="text-slate-350 leading-relaxed font-light mt-1">
                              <strong>AI Executive Summary:</strong>{' '}
                              {selectedApplication.aiScreening ? (
                                <div>{selectedApplication.aiScreening.summary}</div>
                              ) : (
                                <p className="text-slate-500 text-xs">
                                  AI screening not completed yet.
                                </p>
                              )}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                              <div>
                                <span className="font-bold text-emerald-400 block mb-1">
                                  ✓ Key Strengths:
                                </span>
                                <ul className="list-disc pl-4 text-slate-400 flex flex-col gap-1">
                                  {selectedApplication.aiScreening.strengths.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <span className="font-bold text-rose-400 block mb-1">
                                  ❌ Skill Deficits:
                                </span>
                                <ul className="list-disc pl-4 text-slate-400 flex flex-col gap-1">
                                  {selectedApplication.aiScreening.weaknesses.map((w, idx) => (
                                    <li key={idx}>{w}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div className="border-t border-slate-850 pt-2 flex justify-between items-center text-[10px] text-slate-500">
                              <span>Risk Indicator Profile:</span>
                              <span className="text-amber-400 font-bold uppercase">
                                {selectedApplication.aiScreening.risk}
                              </span>
                            </div>
                          </div>
                        )}

                        <div>
                          <span className="font-semibold text-slate-400 block text-xs mb-1 uppercase tracking-wider">
                            Professional Summary
                          </span>
                          <p className="text-slate-300 text-sm leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-850">
                            {selectedApplication.candidate.summary || 'No summary provided.'}
                          </p>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-400 block text-xs mb-1 uppercase tracking-wider">
                            Key Skills Tags
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedApplication.candidate.skills?.map((s, i) => (
                              <span
                                key={i}
                                className="bg-slate-950 border border-slate-800 text-indigo-400 px-2.5 py-1 rounded-lg text-xs font-semibold"
                              >
                                {s}
                              </span>
                            )) || <span className="text-xs text-slate-500">None tags listed.</span>}
                          </div>
                        </div>

                        {/* Pipeline stages transitions buttons */}
                        <div className="border-t border-slate-850 pt-4">
                          <span className="font-semibold text-slate-400 block text-xs mb-3 uppercase tracking-wider">
                            Transition Hiring Workflow
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {currentStatus !== 'UNDER_REVIEW' &&
                              currentStatus !== 'SHORTLISTED' &&
                              currentStatus !== 'INTERVIEW_SCHEDULED' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateApplicantStatus(selectedApplication.id, 'UNDER_REVIEW')
                                  }
                                  className="border-slate-800 text-xs hover:bg-slate-800 text-slate-300"
                                >
                                  Review
                                </Button>
                              )}

                            {currentStatus === 'UNDER_REVIEW' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateApplicantStatus(selectedApplication.id, 'SHORTLISTED')
                                }
                                className="border-slate-800 text-xs hover:bg-slate-800 text-slate-300"
                              >
                                Shortlist
                              </Button>
                            )}

                            {currentStatus === 'SHORTLISTED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateApplicantStatus(
                                    selectedApplication.id,
                                    'INTERVIEW_SCHEDULED',
                                  )
                                }
                                className="border-slate-800 text-xs hover:bg-slate-800 text-slate-300"
                             
                             >
                                Interview
                              </Button>
                            )}

                            {currentStatus === 'INTERVIEW_SCHEDULED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateApplicantStatus(selectedApplication.id, 'OFFER_EXTENDED')
                                }
                                className="border-slate-800 text-xs hover:bg-slate-800 text-slate-300"  
                              >
                                Extend Offer
                              </Button>
                            )}

                            {currentStatus !== 'HIRED' && currentStatus !== 'REJECTED' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  updateApplicantStatus(selectedApplication.id, 'REJECTED')
                                }
                              >
                                Reject Candidate
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Add internal private recruiter notes */}
                        <div className="border-t border-slate-850 pt-4">
                          <span className="font-semibold text-slate-400 block text-xs mb-2 uppercase tracking-wider">
                            Recruiter Private Feedback Comments
                          </span>
                          <form onSubmit={submitRecruiterNote} className="flex gap-2">
                            <Input
                              placeholder="Write hiring comments (private from candidate)..."
                              value={noteContent}
                              onChange={(e) => setNoteContent(e.target.value)}
                              className="bg-slate-950 border-slate-850 text-white placeholder-slate-700 focus:ring-emerald-500"
                            />
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500">
                              Attach Note
                            </Button>
                          </form>
                        </div>

                        {/* Hiring offers logged decisions */}
                        <div className="border-t border-slate-850 pt-4">
                          <span className="font-semibold text-slate-400 block text-xs mb-3 uppercase tracking-wider">
                            Final Hiring Decision & Offer
                          </span>
                          <form
                            onSubmit={submitHiringDecision}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
                          >
                            <Input
                              label="Offered Salary (AED/yr)"
                              placeholder="e.g. 180000"
                              value={hiringSalary}
                              onChange={(e) => setHiringSalary(e.target.value)}
                              className="bg-slate-950 border-slate-850 text-white focus:ring-emerald-500"
                            />
                            <div className="flex flex-col gap-1.5 w-full">
                              <label className="text-xs font-semibold text-slate-300">
                                Joined Date
                              </label>
                              <input
                                type="date"
                                value={hiringJoinedDate}
                                onChange={(e) => setHiringJoinedDate(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm bg-slate-950 border-slate-850 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                              />
                            </div>
                            <Button
                              type="submit"
                              className="bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-bold h-[38px]"
                            >
                              Confirm Hired
                            </Button>
                          </form>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyState
                      title="No candidate selected"
                      desc="Select applicant on the left sidebar to view details."
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ORG PROFILE */}
          {activeTab === 'org' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="border-slate-800">
                  <CardTitle className="text-white">Organization Settings Profile</CardTitle>

                  {!organizationExists && (
                    <p className="text-sm text-amber-400 mt-2">
                      ⚠️ Organization workspace is required. Complete this profile before creating
                      jobs or reviewing candidates.
                    </p>
                  )}
                </CardHeader>
                <CardContent className="p-6 flex flex-col gap-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Company Legal Name"
                      value={orgEdit.name || ''}
                      onChange={(e) =>
                        setOrgEdit((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                    />

                    <Input
                      label="Industry Taxonomy"
                      value={orgEdit.industry || ''}
                      onChange={(e) =>
                        setOrgEdit((prev) => ({
                          ...prev,
                          industry: e.target.value,
                        }))
                      }
                      className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                    />
                  </div>

                  {/* Company Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Company Size"
                      value={orgEdit.companySize || ''}
                      onChange={(e) =>
                        setOrgEdit((prev) => ({
                          ...prev,
                          companySize: e.target.value,
                        }))
                      }
                      className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                    />

                    <Input
                      label="Website Link"
                      value={orgEdit.website || ''}
                      onChange={(e) =>
                        setOrgEdit((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                      className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                    />
                  </div>

                  {/* Headquarters */}
                  <Input
                    label="Headquarters Location"
                    value={orgEdit.headquarters || ''}
                    onChange={(e) =>
                      setOrgEdit((prev) => ({
                        ...prev,
                        headquarters: e.target.value,
                      }))
                    }
                    className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                  />

                  {/* Operating Countries */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Operating Countries
                    </label>

                    <Input
                      placeholder="UAE, India, USA"
                      value={countriesInput}
                      onChange={(e) => setCountriesInput(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                    />
                    <p className="text-xs text-slate-500">
                      Add multiple countries separated by commas
                    </p>
                  </div>

                  {/* Company Logo Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">Company Logo</label>

                    <div
                      onDrop={handleLogoDrop}
                      onDragOver={handleLogoDragOver}
                      onDragLeave={handleLogoDragLeave}
                      onClick={() => document.getElementById('logo-upload-input')?.click()}
                      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer ${
                        logoDragging
                          ? 'border-emerald-500 bg-emerald-950/20'
                          : 'border-slate-700 bg-slate-950 hover:border-slate-600 hover:bg-slate-900/60'
                      }`}
                    >
                      <input
                        id="logo-upload-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoInputChange}
                      />

                      {logoPreview ? (
                        <div className="flex flex-col items-center gap-3">
                          <img
                            src={logoPreview}
                            alt="Company logo"
                            className="w-24 h-24 object-contain rounded-xl border border-slate-700 bg-slate-900 p-2"
                          />

                          <span className="text-xs text-slate-400">{logoFile?.name}</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                            🏢
                          </div>

                          <div className="text-center">
                            <p className="text-sm font-semibold text-slate-300">
                              Drag & drop your company logo
                            </p>

                            <p className="text-xs text-slate-500 mt-1">PNG, JPG, SVG up to 2MB</p>
                          </div>
                        </>
                      )}

                      {logoDragging && (
                        <div className="absolute inset-0 rounded-xl bg-emerald-950/30 flex items-center justify-center">
                          <span className="text-emerald-400 font-semibold text-sm">
                            Drop to upload
                          </span>
                        </div>
                      )}
                    </div>

                    {logoFile && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-500">
                          {logoFile.name} - {(logoFile.size / 1024).toFixed(1)}
                          {' KB'}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview(null);
                          }}
                          className="text-xs text-slate-500 hover:text-rose-400"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-800 bg-transparent flex justify-end">
                  <Button
                    onClick={handleSaveOrgProfile}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    Save
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Footer component */}
      <footer className="bg-slate-900 text-slate-500 border-t border-slate-800 p-6 text-center text-xs mt-auto">
        <div className="max-w-7xl mx-auto">© 2026 JovianeX AI Launch Platform.</div>
      </footer>

      {/* Create Job Modal — Prisma-aligned */}
      {showCreateJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl w-full max-w-3xl border border-slate-700 shadow-2xl shadow-black/60 overflow-hidden animate-slide-up flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
                  💼
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Create New Job Posting
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setShowCreateJob(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all text-sm"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateJobSubmit} className="flex flex-col overflow-y-auto flex-1">
              <div className="px-7 py-6 flex flex-col gap-7">
                {/* ── Section 1: Role Basics ── */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                      1
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Role Basics
                    </span>
                    <div className="flex-1 h-px bg-slate-800 ml-1" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Job Title — spans full width */}
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                        Job Title <span className="text-rose-400">*</span>
                        <span className="font-mono text-[9px] text-slate-600">Job.title</span>
                      </label>
                      <input
                        className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        placeholder="e.g. Senior PyTorch Research Engineer"
                        value={newJob.title}
                        onChange={(e) => setNewJob((prev) => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>

                    {/* Department */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                        Department
                        <span className="font-mono text-[9px] text-slate-600">Job.department</span>
                      </label>
                      <input
                        className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        placeholder="e.g. Engineering, Research"
                        value={newJob.department}
                        onChange={(e) =>
                          setNewJob((prev) => ({ ...prev, department: e.target.value }))
                        }
                      />
                    </div>

                    {/* Industry */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                        Industry
                        <span className="font-mono text-[9px] text-slate-600">Job.industry</span>
                      </label>
                      <input
                        className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        placeholder="e.g. Artificial Intelligence, Fintech"
                        value={newJob.industry}
                        onChange={(e) =>
                          setNewJob((prev) => ({ ...prev, industry: e.target.value }))
                        }
                      />
                    </div>

                    {/* Category — spans full width */}
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                        Job Category
                        <span className="font-mono text-[9px] text-slate-600">
                          JobCategory.name (upsert)
                        </span>
                      </label>
                      <select
                        className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        value={newJob.categoryName}
                        onChange={(e) =>
                          setNewJob((prev) => ({ ...prev, categoryName: e.target.value }))
                        }
                      >
                        {[
                          'Artificial Intelligence',
                          'Machine Learning',
                          'Data Science',
                          'Software Engineering',
                          'DevOps & Cloud',
                          'Cybersecurity',
                          'Product Management',
                          'Design & UX',
                          'Sales & Marketing',
                          'Finance & Accounting',
                          'Human Resources',
                          'Operations',
                        ].map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Employment Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      Employment Type <span className="text-rose-400">*</span>
                      <span className="font-mono text-[9px] text-slate-600">
                        Job.employmentType
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: '🕐 Full Time', value: 'FULL_TIME' },
                        { label: '⏱ Part Time', value: 'PART_TIME' },
                        { label: '📋 Contract', value: 'CONTRACT' },
                        { label: '🎓 Internship', value: 'INTERNSHIP' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setNewJob((prev) => ({ ...prev, employmentType: opt.value }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${newJob.employmentType === opt.value ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Section 2: Experience ── */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                      2
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Experience Requirements
                    </span>
                    <div className="flex-1 h-px bg-slate-800 ml-1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      Experience Level
                      <span className="font-mono text-[9px] text-slate-600">
                        Job.experienceLevel
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: '🌱 Entry', value: 'ENTRY' },
                        { label: '⚡ Mid', value: 'MID' },
                        { label: '🚀 Senior', value: 'SENIOR' },
                        { label: '🏆 Lead', value: 'LEAD' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setNewJob((prev) => ({ ...prev, experienceLevel: opt.value }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${newJob.experienceLevel === opt.value ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      Minimum Years of Experience
                      <span className="font-mono text-[9px] text-slate-600">
                        Job.experienceYears
                      </span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 1, 2, 3, 5, 7, 10].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() =>
                            setNewJob((prev) => ({ ...prev, experienceYears: String(yr) }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${newJob.experienceYears === String(yr) ? 'bg-purple-500/15 border-purple-500/40 text-purple-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
                        >
                          {yr === 0 ? 'Any' : `${yr}+ yrs`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Section 3: Job Description ── */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                      3
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Job Description
                    </span>
                    <div className="flex-1 h-px bg-slate-800 ml-1" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                        Description &amp; Requirements <span className="text-rose-400">*</span>
                        <span className="font-mono text-[9px] text-slate-600">Job.description</span>
                      </label>
                      <span className="text-[10px] text-slate-600">
                        {newJob.description.length} chars
                      </span>
                    </div>
                    <textarea
                      className="px-3.5 py-3 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all min-h-[130px] resize-y leading-relaxed"
                      placeholder="Describe the role responsibilities, technical requirements, team setup, and what makes this opportunity unique..."
                      value={newJob.description}
                      onChange={(e) =>
                        setNewJob((prev) => ({ ...prev, description: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                {/* ── Section 3: Compensation ── */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                      3
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Compensation
                    </span>
                    <div className="flex-1 h-px bg-slate-800 ml-1" />
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Min Salary (AED/mo)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                            AED
                          </span>
                          <input
                            type="number"
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            placeholder="15,000"
                            value={newJob.salaryMin}
                            onChange={(e) =>
                              setNewJob((prev) => ({ ...prev, salaryMin: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Max Salary (AED/mo)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                            AED
                          </span>
                          <input
                            type="number"
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            placeholder="25,000"
                            value={newJob.salaryMax}
                            onChange={(e) =>
                              setNewJob((prev) => ({ ...prev, salaryMax: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                    {newJob.salaryMin && newJob.salaryMax && (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
                        <span>💰</span>
                        <span className="font-semibold">
                          Salary range: AED {Number(newJob.salaryMin).toLocaleString()} – AED{' '}
                          {Number(newJob.salaryMax).toLocaleString()} / month
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Section 4: Location ── */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-400 text-[10px] font-bold flex items-center justify-center">
                      4
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Location &amp; Workplace
                    </span>
                    <div className="flex-1 h-px bg-slate-800 ml-1" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300">Country</label>
                      <input
                        className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        placeholder="United Arab Emirates"
                        value={newJob.country}
                        onChange={(e) =>
                          setNewJob((prev) => ({ ...prev, country: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300">City</label>
                      <input
                        className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        placeholder="Dubai"
                        value={newJob.city}
                        onChange={(e) => setNewJob((prev) => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300">Workplace Type</label>
                      <div className="flex gap-2">
                        {[
                          { label: '🏢 Onsite', value: 'ONSITE' },
                          { label: '🌐 Remote', value: 'REMOTE' },
                          { label: '⚡ Hybrid', value: 'HYBRID' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setNewJob((prev) => ({ ...prev, workplaceType: opt.value }))
                            }
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                              newJob.workplaceType === opt.value
                                ? 'bg-teal-500/15 border-teal-500/40 text-teal-400'
                                : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 5: Skills & Benefits ── */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-bold flex items-center justify-center">
                      5
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Skills &amp; Benefits
                    </span>
                    <div className="flex-1 h-px bg-slate-800 ml-1" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Skills */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-300">
                        Required Skills
                      </label>
                      <input
                        className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        placeholder="Python, PyTorch, AWS..."
                        value={newJob.skills}
                        onChange={(e) => setNewJob((prev) => ({ ...prev, skills: e.target.value }))}
                      />
                      {newJob.skills.trim() && (
                        <div className="flex flex-wrap gap-1.5">
                          {newJob.skills
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .map((skill, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-semibold"
                              >
                                {skill}
                              </span>
                            ))}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-600">Separate skills with commas</p>
                    </div>

                    {/* Benefits */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-300">
                        Perks &amp; Benefits
                      </label>
                      <input
                        className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        placeholder="Health Insurance, Visa Sponsorship..."
                        value={newJob.benefits}
                        onChange={(e) =>
                          setNewJob((prev) => ({ ...prev, benefits: e.target.value }))
                        }
                      />
                      {newJob.benefits.trim() && (
                        <div className="flex flex-wrap gap-1.5">
                          {newJob.benefits
                            .split(',')
                            .map((b) => b.trim())
                            .filter(Boolean)
                            .map((benefit, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-semibold"
                              >
                                ✓ {benefit}
                              </span>
                            ))}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-600">Separate benefits with commas</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Footer Actions ── */}
              <div className="px-7 py-5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-4 shrink-0">
                <div className="text-xs text-slate-600">
                  <span className="text-rose-400">*</span> Required fields
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateJob(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
                  >
                    <span>✨</span> Publish Job Opening
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {showEditJob && editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg">
                  ✏️
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Edit Job Posting
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{editingJob.title}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditJob(false);
                  setEditingJob(null);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all text-sm"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditJobSubmit} className="flex flex-col overflow-y-auto flex-1">
              <div className="px-7 py-6 flex flex-col gap-6">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Job Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    value={editJobForm.title}
                    onChange={(e) => setEditJobForm((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Job Category</label>
                  <select
                    className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    value={editJobForm.categoryName}
                    onChange={(e) =>
                      setEditJobForm((p) => ({ ...p, categoryName: e.target.value }))
                    }
                  >
                    {[
                      'Artificial Intelligence',
                      'Machine Learning',
                      'Data Science',
                      'Software Engineering',
                      'DevOps & Cloud',
                      'Cybersecurity',
                      'Product Management',
                      'Design & UX',
                      'Sales & Marketing',
                      'Finance & Accounting',
                      'Human Resources',
                      'Operations',
                    ].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Description <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-slate-600">
                      {editJobForm.description.length} chars
                    </span>
                  </div>
                  <textarea
                    className="px-3.5 py-3 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all min-h-[120px] resize-y leading-relaxed"
                    value={editJobForm.description}
                    onChange={(e) => setEditJobForm((p) => ({ ...p, description: e.target.value }))}
                    required
                  />
                </div>

                {/* Employment Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Employment Type</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '🕐 Full Time', value: 'FULL_TIME' },
                      { label: '⏱ Part Time', value: 'PART_TIME' },
                      { label: '📋 Contract', value: 'CONTRACT' },
                      { label: '🎓 Internship', value: 'INTERNSHIP' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditJobForm((p) => ({ ...p, employmentType: opt.value }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${editJobForm.employmentType === opt.value ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Experience Level + Years */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">Experience Level</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: '🌱 Entry', value: 'ENTRY' },
                        { label: '⚡ Mid', value: 'MID' },
                        { label: '🚀 Senior', value: 'SENIOR' },
                        { label: '🏆 Lead', value: 'LEAD' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setEditJobForm((p) => ({ ...p, experienceLevel: opt.value }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${editJobForm.experienceLevel === opt.value ? 'bg-purple-500/15 border-purple-500/40 text-purple-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Min Years of Experience
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 1, 2, 3, 5, 7, 10].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() =>
                            setEditJobForm((p) => ({ ...p, experienceYears: String(yr) }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${editJobForm.experienceYears === String(yr) ? 'bg-purple-500/15 border-purple-500/40 text-purple-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
                        >
                          {yr === 0 ? 'Any' : `${yr}+ yrs`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Salary */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Salary Range (AED/mo)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                        AED
                      </span>
                      <input
                        type="number"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                        placeholder="Min"
                        value={editJobForm.salaryMin}
                        onChange={(e) =>
                          setEditJobForm((p) => ({ ...p, salaryMin: e.target.value }))
                        }
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                        AED
                      </span>
                      <input
                        type="number"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                        placeholder="Max"
                        value={editJobForm.salaryMax}
                        onChange={(e) =>
                          setEditJobForm((p) => ({ ...p, salaryMax: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  {editJobForm.salaryMin && editJobForm.salaryMax && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
                      <span>💰</span>
                      <span className="font-semibold">
                        AED {Number(editJobForm.salaryMin).toLocaleString()} – AED{' '}
                        {Number(editJobForm.salaryMax).toLocaleString()} / month
                      </span>
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={editJobForm.salaryVisible}
                      onChange={(e) =>
                        setEditJobForm((p) => ({ ...p, salaryVisible: e.target.checked }))
                      }
                      className="w-4 h-4 rounded accent-indigo-500"
                    />
                    <span className="text-xs text-slate-400">Show salary to candidates</span>
                  </label>
                </div>

                {/* Department & Industry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">Department</label>
                    <input
                      className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                      placeholder="e.g. Engineering"
                      value={editJobForm.department}
                      onChange={(e) =>
                        setEditJobForm((p) => ({ ...p, department: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">Industry</label>
                    <input
                      className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                      placeholder="e.g. Artificial Intelligence"
                      value={editJobForm.industry}
                      onChange={(e) => setEditJobForm((p) => ({ ...p, industry: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Skills & Benefits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-300">Required Skills</label>
                    <input
                      className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                      placeholder="Python, PyTorch, AWS..."
                      value={editJobForm.skills}
                      onChange={(e) => setEditJobForm((p) => ({ ...p, skills: e.target.value }))}
                    />
                    {editJobForm.skills.trim() && (
                      <div className="flex flex-wrap gap-1.5">
                        {editJobForm.skills
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((skill, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-semibold"
                            >
                              {skill}
                            </span>
                          ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600">Separate with commas</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Perks &amp; Benefits
                    </label>
                    <input
                      className="px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                      placeholder="Health Insurance, Visa Sponsorship..."
                      value={editJobForm.benefits}
                      onChange={(e) => setEditJobForm((p) => ({ ...p, benefits: e.target.value }))}
                    />
                    {editJobForm.benefits.trim() && (
                      <div className="flex flex-wrap gap-1.5">
                        {editJobForm.benefits
                          .split(',')
                          .map((b) => b.trim())
                          .filter(Boolean)
                          .map((benefit, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-semibold"
                            >
                              ✓ {benefit}
                            </span>
                          ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600">Separate with commas</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-7 py-5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-4 shrink-0">
                {/* Delete — only for DRAFT or CLOSED */}
                <div>
                  {editingJob && editingJob.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditJob(false);
                        setEditingJob(null);
                        handleDeleteJob(editingJob);
                      }}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-all flex items-center gap-2"
                    >
                      🗑️ Delete Job
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditJob(false);
                      setEditingJob(null);
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2"
                  >
                    <span>💾</span> Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
