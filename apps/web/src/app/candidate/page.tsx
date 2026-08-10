'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/app/utils/apiFetch';
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
  Toast,
} from '../../components/SharedUI';
import { CandidateJobModal } from '../../components/CandidateJobModal';
import { useCallback } from 'react';

interface Job {
  id: string;
  title: string;
  description: string;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  experienceLevel: string;
  createdAt: string;

  organization?: {
    name: string;
    industry?: string;
  };

  locations?: {
    country: string;
    city?: string;
    workplaceType: string;
  }[];

  skills?:
    | string[]
    | {
        skillName: string;
      }[];

  matchScore?: number;
  experienceYears?: number;
  educationRequirements?: string;
  category?: {
    name?: string;
  };

  matchReason?: {
    matchedSkills?: string[];
    missingSkills?: string[];
    explanation: string;
  };
}

interface Application {
  id: string;
  jobId: string;
  status: string;
  appliedAt: string;
  notes?: string;
  avgReviewDays: number;
  coachSuggestion: string;
  job: {
    title: string;
    organization: {
      name: string;
    };
  };
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export default function CandidatePortal() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'search' | 'saved' | 'resume' | 'ats' | 'chat' | 'applications'
  >('dashboard');

  // Dashboard Guided Stepper
  const [currentStep, setCurrentStep] = useState(1);
  const stepsList = [
    {
      number: 1,
      title: 'Create Profile',
      tab: 'resume',
      desc: 'Set up basic contact details and professional headline.',
    },
    {
      number: 2,
      title: 'AI Resume Builder',
      tab: 'resume',
      desc: 'Build or improve resume details with conversation style helper.',
    },
    {
      number: 3,
      title: 'ATS Analysis',
      tab: 'ats',
      desc: 'Paste target job specifications to evaluate compatibility.',
    },
    {
      number: 4,
      title: 'AI Improvements',
      tab: 'ats',
      desc: 'One-click resolve missing skills or formatting issues.',
    },
    {
      number: 5,
      title: 'Generate Cover Letter',
      tab: 'chat',
      desc: 'Ask the AI Coach to write custom introductory letters.',
    },
    {
      number: 6,
      title: 'Find Matching Jobs',
      tab: 'search',
      desc: 'Filter roles by keyword matching your target skills.',
    },
    {
      number: 7,
      title: 'One-click Apply',
      tab: 'search',
      desc: 'Submit application in seconds with default resume version.',
    },
    {
      number: 8,
      title: 'Track Applications',
      tab: 'applications',
      desc: 'Monitor hiring pipeline status and average review days.',
    },
    {
      number: 9,
      title: 'Interview Preparation',
      tab: 'chat',
      desc: 'Trigger mock interview questions with career coach.',
    },
  ];

  // Telemetry widgets state
  const [widgets, setWidgets] = useState({
    atsScore: 72,
    savedJobsCount: 0,
    applicationsCount: 0,
    resumeStatus: 'NEEDS_IMPROVEMENT',
    profileCompletion: 0,
  });
  const [profileCompletion, setProfileCompletion] = useState({
    percentage: 0,
    missingFields: [],
  });

  const [progress, setProgress] = useState({
    applied: 0,
    interviews: 0,
    offers: 0,
    rejected: 0,
  });

  // Candidate core resume state
  const [candidateResume, setCandidateResume] = useState<any>({
    headline: '',
    careerSummary: '',
    currentLocation: 'United Arab Emirates',
    preferredLocation: 'United Arab Emirates',
    skills: [],
    experiences: [
      {
        title: '',
        companyName: '',
        startDate: '',
        description: '',
      },
    ],
    educations: [
      {
        institution: '',
        degree: '',
        startDate: '',
        endDate: '',
      },
    ],
  });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);

  const [isPhotoDragging, setIsPhotoDragging] = useState(false);

  const [isResumeDragging, setIsResumeDragging] = useState(false);
  const processPhoto = (file: File) => {
    if (!file.type.startsWith('image/')) {
      triggerToast('Please upload an image file.', 'error');
      return;
    }

    // save actual file for upload
    setProfilePhotoFile(file);

    // preview only
    setProfilePhoto(URL.createObjectURL(file));
  };

  const processResume = (file: File) => {
    if (file.type !== 'application/pdf') {
      triggerToast('Only PDF resume files are allowed.', 'error');
      return;
    }

    setResumeFile(file);
    setResumePreviewUrl(URL.createObjectURL(file));
  };

  const handlePhotoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPhotoDragging(false);

    const file = e.dataTransfer.files[0];

    if (file) {
      processPhoto(file);
    }
  };

  const handleResumeDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResumeDragging(false);

    const file = e.dataTransfer.files[0];

    if (file) {
      processResume(file);
    }
  };
  const [experienceIndex, setExperienceIndex] = useState(0);
  const [educationIndex, setEducationIndex] = useState(0);
  // Conversational Resume Wizard state
  const [wizardMessages, setWizardMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: 'Hi! I am your Resume Builder wizard. Tell me about your last job position?',
    },
  ]);
  const [wizardInput, setWizardInput] = useState('');
  const [wizardStepCount, setWizardStepCount] = useState(1);

  // Resume builder lists input
  const [newExp, setNewExp] = useState({
    title: '',
    companyName: '',
    startDate: '2023-01-01',
    isCurrent: true,
    description: '',
  });
  const [newEdu, setNewEdu] = useState({
    institution: '',
    degree: '',
    startDate: '2018-09-01',
    endDate: '2022-06-30',
  });

  // Job search state
  const [searchParams, setSearchParams] = useState({
    keyword: '',

    country: '',
    city: '',

    category: '',

    employmentType: '',

    workplaceType: '',

    salaryMin: '',
    salaryMax: '',

    experienceLevel: '',

    skills: '',

    sortBy: 'latest',

    page: 1,
  });
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);

  // Loadings & errors
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  // Modals state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);

  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [coverNotes, setCoverNotes] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const hasAppliedJob = (jobId: string) => applications.some((app) => app.jobId === jobId);
  const isJobSaved = (jobId: string) => savedJobs.some((job) => job.id === jobId);

  const toggleSaveJob = async (job: Job) => {
    if (!authToken) {
      triggerToast('Please login to save jobs.', 'error');
      return;
    }

    const isSaved = isJobSaved(job.id);
    setSavingJobId(job.id);

    try {
      const endpoint = isSaved ? '/jobs/unsave' : '/jobs/save';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ jobId: job.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || 'Unable to update saved jobs.');
      }

      if (isSaved) {
        setSavedJobs((prev) => prev.filter((savedJob) => savedJob.id !== job.id));
        setWidgets((prev) => ({ ...prev, savedJobsCount: Math.max(0, prev.savedJobsCount - 1) }));
        triggerToast('Job removed from your saved list.', 'info');
      } else {
        setSavedJobs((prev) => [job, ...prev.filter((savedJob) => savedJob.id !== job.id)]);
        setWidgets((prev) => ({ ...prev, savedJobsCount: prev.savedJobsCount + 1 }));
        triggerToast('Job saved to your bookmarks.', 'success');
      }
    } catch (error: any) {
      triggerToast(error?.message || 'Unable to update saved jobs.', 'error');
    } finally {
      setSavingJobId(null);
    }
  };

  // ATS scanner state
  const [targetJobDesc, setTargetJobDesc] = useState(
    'We are looking for a Senior Developer with expertise in Node.js, NestJS, TypeScript, and Docker containerization.',
  );
  const [atsResult, setAtsResult] = useState<any>({
    score: 72,
    breakdown: {
      keywords: 75,
      formatting: 90,
      skills: 65,
      experience: 60,
    },
    suggestions: [
      "Add 'NestJS' and 'Docker' to your resume skills tags.",
      'Expand details under your previous Software Engineer role.',
      'Verify format structures matches standardized templates.',
    ],
  });
  const [atsLoading, setAtsLoading] = useState(false);
  const [rawResumeText, setRawResumeText] = useState(
    'Senior Developer. Skills: TypeScript, Node.js, Express. 2 years experience.',
  );

  // Persistent AI Career Coach state
  const [coachHistory, setCoachHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your persistent JovianeX AI Career Coach. I can help generate roadmaps, analyze salary expectations, or do mock interviews. Pick an option below or type a question!',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [coachInput, setCoachInput] = useState('');
  const [showCoach, setShowCoach] = useState(true);

  const [jobFilters, setJobFilters] = useState({
    categories: [] as string[],
    employmentTypes: [] as string[],
    workplaceTypes: [] as string[],
    experienceLevels: [] as string[],
  });

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  const openJobModal = (job: Job) => {
    console.log('Selected Job:', job);

    setSelectedJob(job);
    setShowJobModal(true);
  };

  const sortSavedJobsForView = (jobs: Job[]) => {
    return [...jobs].sort((a, b) => {
      const appliedA = hasAppliedJob(a.id) ? 1 : 0;
      const appliedB = hasAppliedJob(b.id) ? 1 : 0;

      if (searchParams.sortBy === 'applied') {
        if (appliedA !== appliedB) return appliedB - appliedA;
      }

      if (searchParams.sortBy === 'latest') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      }

      if (searchParams.sortBy === 'match') {
        return (b.matchScore || 0) - (a.matchScore || 0);
      }

      return 0;
    });
  };

  const sortApplicationsForView = (apps: Application[]) => {
    return [...apps].sort((a, b) => {
      if (searchParams.sortBy === 'applied') {
        const statusPriority = (status: string) => {
          switch (status) {
            case 'APPLIED':
              return 0;
            case 'REVIEWING':
              return 1;
            case 'INTERVIEW_SCHEDULED':
              return 2;
            case 'OFFER_EXTENDED':
              return 3;
            case 'HIRED':
              return 4;
            case 'REJECTED':
              return 5;
            default:
              return 6;
          }
        };

        const priorityA = statusPriority(a.status);
        const priorityB = statusPriority(b.status);

        if (priorityA !== priorityB) return priorityA - priorityB;
      }

      if (searchParams.sortBy === 'latest') {
        const dateA = new Date(a.appliedAt || 0).getTime();
        const dateB = new Date(b.appliedAt || 0).getTime();
        return dateB - dateA;
      }

      if (searchParams.sortBy === 'match') {
        const matchA = (a as any).matchScore || 0;
        const matchB = (b as any).matchScore || 0;
        return matchB - matchA;
      }

      return 0;
    });
  };

  const cycleFilterSort = () => {
    const nextSort =
      searchParams.sortBy === 'latest'
        ? 'match'
        : searchParams.sortBy === 'match'
        ? 'applied'
        : 'latest';

    setSearchParams((prev) => ({ ...prev, sortBy: nextSort, page: 1 }));

    if (activeTab === 'search') {
      executeSearch(nextSort);
    } else {
      setSavedJobs((prev) => sortSavedJobsForView(prev));
      setApplications((prev) => sortApplicationsForView(prev));
    }
  };

  // Initial Authentication & Load
  useEffect(() => {
    const candidateToken = localStorage.getItem('candidate_token');

    const ecosystemToken = localStorage.getItem('accessToken');

    const token = candidateToken || ecosystemToken;

    if (!token) {
      triggerToast('Please login to access the candidate portal console.', 'error');

      router.replace('/candidate-login');

      return;
    }

    setAuthToken(token);
  }, [router]);

  useEffect(() => {
    if (!authToken) return;

    loadDashboard();
    loadResume();
    loadSavedJobs();
    loadApplications();
    loadJobFilters();
  }, [authToken]);

  useEffect(() => {
    setSavedJobs((prev) => sortSavedJobsForView(prev));
  }, [searchParams.sortBy]);

  useEffect(() => {
    setApplications((prev) => sortApplicationsForView(prev));
  }, [searchParams.sortBy]);

  useEffect(() => {
    if (!authToken) return;

    if (
      candidateResume.skills.length ||
      candidateResume.experiences.length ||
      candidateResume.educations.length
    ) {
      executeSearch();
    }
  }, [candidateResume.skills, candidateResume.experiences, candidateResume.educations, authToken]);

  useEffect(() => {
    if (!authToken) return;

    const timer = setTimeout(() => {
      executeSearch();
    }, 500);

    return () => clearTimeout(timer);
  }, [
    searchParams.keyword,
    searchParams.country,
    searchParams.city,
    searchParams.category,
    searchParams.employmentType,
    searchParams.workplaceType,
    searchParams.salaryMin,
    searchParams.salaryMax,
    searchParams.experienceLevel,
    searchParams.skills,
  ]);

  // Load Dashboard Stats Widgets
  const loadDashboard = async () => {
    setDashboardLoading(true);

    try {
      const res = await apiFetch('/career/dashboard', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const response = await res.json();

        const metrics = response.data || response;

        console.log('Metrics:', metrics);

        console.log('Profile Completion:', metrics.profileCompletion);

        setWidgets({
          atsScore: metrics.widgets?.atsScore || 72,

          savedJobsCount: metrics.widgets?.savedJobsCount || 0,

          applicationsCount: metrics.widgets?.applicationsCount || 0,

          resumeStatus: metrics.widgets?.resumeStatus || 'NEEDS_IMPROVEMENT',

          profileCompletion: metrics.profileCompletion?.progressPercentage || 0,
        });

        setProfileCompletion({
          percentage: metrics.profileCompletion?.progressPercentage || 0,

          missingFields: metrics.profileCompletion?.missingFields || [],
        });
      }
    } catch (e) {
      triggerToast('Failed to fetch dashboard metrics telemetry.', 'error');
    } finally {
      setDashboardLoading(false);
    }
  };
  // Fetch Resume details
  // Fetch Resume details
  const loadResume = async () => {
    setResumeLoading(true);

    try {
      const res = await apiFetch('/career/resume', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load resume');
      }

      const data = await res.json();

      const profile = data.data || data;

      if (profile) {
        setCandidateResume({
          headline: profile.headline || '',

          careerSummary: profile.careerSummary || '',

          currentLocation: profile.currentLocation || 'United Arab Emirates',

          preferredLocation: profile.preferredLocation || 'United Arab Emirates',

          skills: profile.skills || [],

          resumeUrl: profile.resumeUrl || '',

          profilePhoto: profile.user?.profile?.profilePhoto || '',

          experiences:
            profile.experiences?.length > 0
              ? profile.experiences
              : [
                  {
                    title: '',
                    companyName: '',
                    startDate: '',
                    endDate: '',
                    description: '',
                  },
                ],

          educations:
            profile.educations?.length > 0
              ? profile.educations
              : [
                  {
                    institution: '',
                    degree: '',
                    startDate: '',
                    endDate: '',
                  },
                ],
        });

        // Show uploaded profile photo
        const photo = profile.user?.profile?.profilePhoto;

        if (photo) {
          if (photo.startsWith('http')) {
            // Google / external image URL
            setProfilePhoto(photo);
          } else {
            // Local uploaded image
            setProfilePhoto(`http://localhost:5000${photo}`);
          }
        }

        // Show uploaded resume
        if (profile.resumeUrl) {
          setResumePreviewUrl(`http://localhost:5000${profile.resumeUrl}`);

          setResumeFile({
            name: profile.resumeUrl.split('/').pop() || 'Resume.pdf',
          } as File);
        }
      }
    } catch (e) {
      console.error(e);

      triggerToast('Failed to retrieve resume details.', 'error');
    } finally {
      setResumeLoading(false);
    }
  };
  const loadJobFilters = async () => {
    try {
      // Load categories from JobCategory table
      const categoryRes = await apiFetch('/jobs/job-categories', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      let categories: string[] = [];

      if (categoryRes.ok) {
        const categoryData = await categoryRes.json();

        const categoryList = categoryData.data || categoryData.categories || categoryData || [];

        categories = categoryList
          .map((category: any) => (typeof category === 'string' ? category : category.name))
          .filter(Boolean);
      }

      // Existing job based filters
      const res = await apiFetch('/jobs', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      let employmentTypes: string[] = [];
      let workplaceTypes: string[] = [];
      let experienceLevels: string[] = [];

      if (res.ok) {
        const data = await res.json();

        const jobs = data.data?.jobs || data.jobs || data || [];

        employmentTypes = Array.from(
          new Set(
            jobs
              .map((job: any) =>
                typeof job.employmentType === 'string'
                  ? job.employmentType
                  : job.employmentType?.name,
              )
              .filter(Boolean),
          ),
        );

        workplaceTypes = Array.from(
          new Set(
            jobs
              .flatMap(
                (job: any) =>
                  job.locations?.map((l: any) =>
                    typeof l.workplaceType === 'string' ? l.workplaceType : l.workplaceType?.name,
                  ) || [],
              )
              .filter(Boolean),
          ),
        );

        experienceLevels = Array.from(
          new Set(
            jobs
              .map((job: any) =>
                typeof job.experienceLevel === 'string'
                  ? job.experienceLevel
                  : job.experienceLevel?.name,
              )
              .filter(Boolean),
          ),
        );
      }

      setJobFilters({
        categories,
        employmentTypes,
        workplaceTypes,
        experienceLevels,
      });
    } catch (error) {
      console.error('Filter loading failed', error);
      triggerToast('Failed to load job filters.', 'error');
    }
  };
  // Fetch Saved jobs list
  const loadSavedJobs = async () => {
    try {
      const res = await apiFetch('/jobs/saved', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.data || data;
        const normalized = (list || []).map((job: Job) => {
          const match = calculateJobMatch(job, candidateResume);
          return {
            ...job,
            ...match,
          };
        });
        const sortedSavedJobs = [...normalized].sort((a, b) => {
          const appliedA = hasAppliedJob(a.id) ? 1 : 0;
          const appliedB = hasAppliedJob(b.id) ? 1 : 0;

          if (searchParams.sortBy === 'applied') {
            if (appliedA !== appliedB) return appliedB - appliedA;
          }

          if (searchParams.sortBy === 'latest') {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          }

          if (searchParams.sortBy === 'match') {
            return (b.matchScore || 0) - (a.matchScore || 0);
          }

          return 0;
        });

        setSavedJobs(sortedSavedJobs);
        setWidgets((prev) => ({ ...prev, savedJobsCount: sortedSavedJobs.length }));
      }
    } catch (e) {
      triggerToast('Failed to load saved jobs.', 'error');
    }
  };

  // Fetch candidate applied jobs timeline
  const loadApplications = async () => {
    try {
      const res = await apiFetch('/applications/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.data || data;

        // Enrich applications list with guidance defaults
        const enriched = (list || []).map((app: any) => ({
          ...app,
          avgReviewDays: app.avgReviewDays || 3,
          coachSuggestion:
            app.coachSuggestion || 'AI Coach Tip: Prepare for behavioral question tests.',
        }));

        setApplications(enriched);
        setProgress({
          applied: enriched.length,
          interviews: enriched.filter((a: any) => a.status === 'INTERVIEW_SCHEDULED').length,
          offers: enriched.filter((a: any) => a.status === 'OFFER_EXTENDED' || a.status === 'HIRED')
            .length,
          rejected: enriched.filter((a: any) => a.status === 'REJECTED').length,
        });
      }
    } catch (e) {
      triggerToast('Failed to retrieve applications pipeline timeline.', 'error');
    }
  };

  const normalizeCandidateProfile = (resume: any) => {
    return {
      skills: (resume?.skills || [])
        .map((skill: any) =>
          (typeof skill === 'string' ? skill : skill.skillName)?.trim().toLowerCase(),
        )
        .filter(Boolean),

      experiences: resume?.experiences || [],

      educations: resume?.educations || [],

      locations: [resume?.currentLocation, resume?.preferredLocation]
        .filter(Boolean)
        .map((l: string) => l.toLowerCase()),
    };
  };

  const calculateJobMatch = (job: Job, resume: any) => {
    const profile = normalizeCandidateProfile(resume);

    let score = 0;

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    // --------------------
    // SKILL MATCHING (40%)
    // --------------------

    const jobSkills = (job.skills || [])
      .map((skill: any) =>
        (typeof skill === 'string' ? skill : skill.skillName)?.trim().toLowerCase(),
      )
      .filter(Boolean);

    let skillScore = 0;

    jobSkills.forEach((skill) => {
      if (profile.skills.includes(skill)) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    if (jobSkills.length > 0) {
      skillScore = (matchedSkills.length / jobSkills.length) * 40;
    }

    score += skillScore;

    // --------------------
    // EXPERIENCE MATCHING (30%)
    // --------------------

    let experienceYears = 0;

    profile.experiences.forEach((exp: any) => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();

        experienceYears += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      }
    });

    let experienceScore = 0;

    const requiredExperience = job.experienceYears || 0;

    if (requiredExperience > 0) {
      if (experienceYears >= requiredExperience) {
        experienceScore = 30;
      } else {
        experienceScore = (experienceYears / requiredExperience) * 30;
      }
    } else {
      experienceScore = 30;
    }

    score += experienceScore;

    // --------------------
    // EDUCATION MATCHING (15%)
    // --------------------

    let educationMatch = false;

    if (job.educationRequirements) {
      educationMatch = profile.educations.some((edu: any) => {
        const degree = `${edu.degree} ${edu.fieldOfStudy}`.toLowerCase();

        return degree.includes(job.educationRequirements.toLowerCase());
      });

      if (educationMatch) {
        score += 15;
      }
    } else {
      score += 15;
    }

    // --------------------
    // LOCATION MATCHING (15%)
    // --------------------

    let locationMatch = false;

    const jobLocations = (job.locations || []).map((l: any) =>
      `${l.city}, ${l.country}`.toLowerCase(),
    );

    locationMatch = jobLocations.some((jobLoc: string) =>
      profile.locations.some(
        (candidateLoc: string) => jobLoc.includes(candidateLoc) || candidateLoc.includes(jobLoc),
      ),
    );

    if (locationMatch || jobLocations.length === 0) {
      score += 15;
    }

    return {
      matchScore: Math.round(Math.min(score, 100)),

      matchReason: {
        matchedSkills,

        missingSkills,

        experience: `${experienceYears.toFixed(1)} years`,

        education: educationMatch ? 'Education requirement matched' : 'Education not matched',

        location: locationMatch ? 'Location matched' : 'Location not matched',

        explanation:
          `${matchedSkills.length}/${jobSkills.length} skills matched. ` +
          `${experienceYears.toFixed(1)} years experience. ` +
          `${educationMatch ? 'Education matched.' : 'Education needs review.'}`,
      },
    };
  };

  // Execute job search marketplace
  const executeSearch = async (overrideSort?: string) => {
    setJobsLoading(true);
    try {
      const activeSort = overrideSort || searchParams.sortBy;
      const query = new URLSearchParams();
      if (searchParams.keyword) query.append('search', searchParams.keyword);

      if (searchParams.country) query.append('country', searchParams.country);

      if (searchParams.city) query.append('city', searchParams.city);

      if (searchParams.category) query.append('category', searchParams.category);

      if (searchParams.employmentType) query.append('employmentType', searchParams.employmentType);

      if (searchParams.workplaceType) query.append('workplaceType', searchParams.workplaceType);

      if (searchParams.salaryMin) query.append('salaryMin', searchParams.salaryMin);

      if (searchParams.salaryMax) query.append('salaryMax', searchParams.salaryMax);

      if (searchParams.experienceLevel)
        query.append('experienceLevel', searchParams.experienceLevel);

      if (searchParams.skills) query.append('skills', searchParams.skills);

      const res = await apiFetch(`/jobs?${query.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const jobsList = data.data ? data.data.jobs : data.jobs || data;

        // Enrich matching algorithms
        const enriched = (jobsList || []).map((job: Job) => {
          const match = calculateJobMatch(job, candidateResume);

          return {
            ...job,
            ...match,
          };
        });

        const sortedResults = [...enriched].sort((a, b) => {
          const appliedA = hasAppliedJob(a.id) ? 1 : 0;
          const appliedB = hasAppliedJob(b.id) ? 1 : 0;

          if (activeSort === 'applied') {
            if (appliedA !== appliedB) return appliedB - appliedA;
          }

          if (activeSort === 'latest') {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          }

          if (activeSort === 'match') {
            return (b.matchScore || 0) - (a.matchScore || 0);
          }

          return 0;
        });

        setSearchResults(sortedResults);
      }
    } catch (e) {
      triggerToast('Error querying jobs marketplace listings.', 'error');
    } finally {
      setJobsLoading(false);
    }
  };

  // AI Resume wizard conversation styles
  const handleWizardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardInput.trim()) return;

    const userText = wizardInput.trim();
    setWizardMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setWizardInput('');

    setTimeout(() => {
      if (wizardStepCount === 1) {
        setWizardMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Great! What key programming languages and technologies did you use there?',
          },
        ]);
        setWizardStepCount(2);
        // Automatically inject parsed work experience details
        setCandidateResume((prev: any) => ({
          ...prev,
          experiences: [
            ...prev.experiences,
            {
              title: 'Senior AI Developer',
              companyName: 'Scale AI',
              startDate: '2023-05-01',
              description: userText,
            },
          ],
        }));
      } else if (wizardStepCount === 2) {
        setWizardMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Awesome! What professional achievements are you most proud of in that position?',
          },
        ]);
        setWizardStepCount(3);
        const newSkills = userText.split(',').map((s) => s.trim());
        setCandidateResume((prev: any) => ({
          ...prev,
          skills: Array.from(new Set([...prev.skills, ...newSkills])),
        }));
      } else {
        setWizardMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Perfect! I have automatically compiled and injected these updates into your resume layout. Take a look!',
          },
        ]);
        // Update summary details
        setCandidateResume((prev: any) => ({
          ...prev,
          careerSummary: `Experienced engineer. Specialized achievements: ${userText}`,
        }));
        triggerToast('Resume details automatically compiled!', 'success');
        setShowWizard(false);
      }
    }, 1000);
  };

  // Edit Resume Details Handler
  const handleUpdateResume = async (e: React.FormEvent) => {
    e.preventDefault();

    setResumeLoading(true);

    try {
      const formData = new FormData();
      const cleanedResume = {
        ...candidateResume,

        experiences: candidateResume.experiences.filter(
          (exp) => exp.title || exp.companyName || exp.startDate,
        ),

        educations: candidateResume.educations.filter(
          (edu) => edu.institution || edu.degree || edu.startDate,
        ),
      };

      formData.append('resumeData', JSON.stringify(candidateResume));

      if (profilePhotoFile instanceof File) {
        formData.append('profilePhoto', profilePhotoFile);
      }

      if (resumeFile instanceof File) {
        formData.append('resumeFile', resumeFile);
      }

      const res = await apiFetch('/career/resume', {
        method: 'PUT',
        body: formData,
      });

      const responseData = await res.json();

      console.log('Resume API Response:', responseData);

      if (res.ok) {
        triggerToast('Resume and profile updated successfully!');

        await loadResume();
        await loadDashboard();
      } else {
        triggerToast(responseData?.error?.message || 'Failed to save resume', 'error');
      }
    } catch (err) {
      console.error('Resume upload exception:', err);

      triggerToast('Upload failed', 'error');
    } finally {
      setResumeLoading(false);
    }
  };
  // Quick Apply
  const triggerQuickApply = async (jobId: string) => {
    if (hasAppliedJob(jobId)) {
      triggerToast('You have already applied to this job.', 'info');
      return;
    }

    setApplyingJobId(jobId);

    try {
      const res = await apiFetch('/jobs/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ jobId, coverLetter: 'Default AI Compiled Application profile.' }),
      });
      if (res.ok) {
        const matchedJob = searchResults.find((job) => job.id === jobId) || savedJobs.find((job) => job.id === jobId);

        if (matchedJob && !isJobSaved(jobId)) {
          try {
            const saveRes = await apiFetch('/jobs/save', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({ jobId }),
            });

            if (saveRes.ok) {
              setSavedJobs((prev) => [matchedJob, ...prev.filter((savedJob) => savedJob.id !== jobId)]);
              setWidgets((prev) => ({ ...prev, savedJobsCount: prev.savedJobsCount + 1 }));
            }
          } catch {
            // silent fallback; the job application still succeeded
          }
        }

        triggerToast('Applied successfully!');
        await loadApplications();
        await loadDashboard();
      } else {
        triggerToast('Application failed.', 'error');
      }
    } catch (e) {
      triggerToast('Server connection error.', 'error');
    } finally {
      setApplyingJobId(null);
    }
  };

  // One-click improve with AI ATS suggestions
  const resolveAtsScoreIssues = () => {
    setAtsLoading(true);
    setTimeout(() => {
      // Simulate resolving keyword gaps
      setCandidateResume((prev: any) => ({
        ...prev,
        skills: Array.from(new Set([...prev.skills, 'NestJS', 'Docker', 'Kubernetes'])),
      }));
      setAtsResult({
        score: 95,
        breakdown: {
          keywords: 95,
          formatting: 95,
          skills: 95,
          experience: 90,
        },
        suggestions: ['Excellent! All keywords matching successfully.'],
      });
      setWidgets((prev) => ({ ...prev, atsScore: 95 }));
      setAtsLoading(false);
      triggerToast('Resume details optimized with AI!', 'success');
    }, 1200);
  };

  // Ask Persistent Coach custom triggers
  const triggerCoachCommand = (command: string) => {
    setCoachHistory((prev) => [
      ...prev,
      { role: 'user', content: command, timestamp: new Date().toLocaleTimeString() },
    ]);
    setChatLoading(true);

    setTimeout(() => {
      let answer = '';
      if (command.includes('Roadmap')) {
        answer =
          '🛣 **YOUR CAREER ROADMAP (Senior Node Architect):**\n1. Master NestJS microservices. \n2. Learn Docker & Kubernetes orchestration. \n3. Obtain AWS Solutions Architect Associate certificate.\n4. Gain experience leading junior developers.';
      } else if (command.includes('Salary')) {
        answer =
          '💰 **SALARY GUIDANCE (United Arab Emirates):**\nAverage salary range for Senior Backend developers is 22,000 AED - 32,000 AED per month, depending on cloud architect skills.';
      } else if (command.includes('Progress')) {
        answer =
          '📈 **WEEKLY STATUS AUDIT:**\nYour ATS compatibility score increased from 72% to 95%! You have submitted 1 application which is currently UNDER_REVIEW. Keep applying to 3 more jobs this week.';
      } else {
        answer = `Sure! I have evaluated your profile skills (${candidateResume.skills.join(', ')}). Let's schedule a mock interview simulation to prepare.`;
      }
      setCoachHistory((prev) => [
        ...prev,
        { role: 'assistant', content: answer, timestamp: new Date().toLocaleTimeString() },
      ]);
      setChatLoading(false);
    }, 1000);
  };

  const handleCoachChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachInput.trim()) return;
    const inputVal = coachInput.trim();
    setCoachInput('');
    triggerCoachCommand(inputVal);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col text-slate-100 relative">
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      )}

      {/* Main Header Component */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              JovianeX AI Candidate Hub
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setShowCoach(!showCoach)}
              className="px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-semibold hover:bg-indigo-500/25 transition-all text-xs"
            >
              💬 AI Coach {showCoach ? 'Hide' : 'Show'}
            </button>
            <span className="text-slate-400">{candidateResume.headline}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.clear();
                router.push('/candidate-login');
              }}
              className="text-slate-300 border-slate-700 hover:bg-slate-800"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Persistent AI Career Coach Sidebar Panel */}
      {showCoach && (
        <aside className="fixed right-4 bottom-4 w-80 md:w-96 h-[500px] bg-slate-900/95 backdrop-blur-lg border border-slate-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fade-in">
          <div className="bg-indigo-900/50 p-4 border-b border-slate-850 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <div>
                <h4 className="font-bold text-sm text-indigo-200">AI Career Coach Dashboard</h4>
                <span className="text-[10px] text-slate-400">Roadmaps • Salary • Mock Prep</span>
              </div>
            </div>
            <button onClick={() => setShowCoach(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 text-xs">
            {coachHistory.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white self-end'
                    : 'bg-slate-950 border border-slate-850 text-slate-300 self-start'
                }`}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && <LoadingState label="Coach is analyzing..." />}
          </div>

          {/* Coach Quick Triggers Shortcuts */}
          <div className="px-4 py-2 border-t border-slate-850 bg-slate-950/50 flex gap-2 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => triggerCoachCommand('Suggest Career Roadmap')}
              className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-2.5 py-1 rounded-full font-semibold hover:bg-indigo-500/20 transition-all"
            >
              🛣 Career Roadmap
            </button>
            <button
              onClick={() => triggerCoachCommand('Provide Salary Guidance')}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-semibold hover:bg-emerald-500/20 transition-all"
            >
              💰 Salary Advice
            </button>
            <button
              onClick={() => triggerCoachCommand('Check Weekly Progress')}
              className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] px-2.5 py-1 rounded-full font-semibold hover:bg-purple-500/20 transition-all"
            >
              📈 Weekly Progress
            </button>
          </div>

          <form
            onSubmit={handleCoachChatSubmit}
            className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything..."
              value={coachInput}
              onChange={(e) => setCoachInput(e.target.value)}
              className="flex-grow bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
            />
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs">
              Send
            </Button>
          </form>
        </aside>
      )}

      {/* Main Layout Grid */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-6 p-4 md:p-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            🏠 Onboarding Journey
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'resume'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            📄 AI Resume Builder
          </button>
          <button
            onClick={() => setActiveTab('ats')}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'ats'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            🎯 ATS Audit Scanners
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'search'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            🔍 Job Match Marketplace
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'saved'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            📌 Saved Openings
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'applications'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            📑 Applications Tracker
          </button>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 flex flex-col gap-6">
          {/* TAB 1: ONBOARDING DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Proactive Notification Alerts */}
              {widgets.atsScore < 80 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-2xl flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <p>
                      <strong>ATS Score Alert:</strong> Your compatibility rating dropped to{' '}
                      <strong>{widgets.atsScore}%</strong>. Add missing skills like NestJS to secure
                      recruiter callbacks.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('ats')}
                    className="bg-amber-600 hover:bg-amber-500 text-xs"
                  >
                    Improve Now
                  </Button>
                </div>
              )}

              {/* Action-Based Dashboard Widgets */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card
                  onClick={() => setActiveTab('resume')}
                  className="bg-slate-900 border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-slate-400">Resume Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-xl font-bold text-indigo-400">
                      {widgets.profileCompletion}% Complete
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">Complete your history logs</p>
                  </CardContent>
                </Card>

                <Card
                  onClick={() => setActiveTab('ats')}
                  className="bg-slate-900 border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-slate-400">Overall ATS Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-xl font-bold text-emerald-400">{widgets.atsScore}%</span>
                    <p className="text-[10px] text-slate-500 mt-1">Review keywords matches</p>
                  </CardContent>
                </Card>

                <Card
                  onClick={() => setActiveTab('search')}
                  className="bg-slate-900 border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-slate-400">Job Compatibility</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-xl font-bold text-purple-400">23 Matches</span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Ready for application submissions
                    </p>
                  </CardContent>
                </Card>

                <Card
                  onClick={() => {
                    setActiveTab('chat');
                    setShowCoach(true);
                    triggerCoachCommand('Suggest Career Roadmap');
                  }}
                  className="bg-slate-900 border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-slate-400">Mock Interviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-xl font-bold text-amber-400">Simulation Ready</span>
                    <p className="text-[10px] text-slate-500 mt-1">Coaching algorithms loaded</p>
                  </CardContent>
                </Card>
              </div>

              {/* Guided Experience Workflow Stepper */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="border-b border-slate-850">
                  <CardTitle className="text-white text-base">
                    Your Guided Onboarding Journey
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    {stepsList.map((step) => (
                      <div
                        key={step.number}
                        onClick={() => {
                          setCurrentStep(step.number);
                          setActiveTab(step.tab as any);
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                          currentStep === step.number
                            ? 'bg-slate-950 border-indigo-500 text-white'
                            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              currentStep >= step.number
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {step.number}
                          </span>
                          <div>
                            <h4 className="font-bold text-sm">{step.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                        <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                          Start →
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: AI RESUME BUILDER */}
          {activeTab === 'resume' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-100 text-lg">AI Resume Builder</h3>
                <Button
                  onClick={() => setShowWizard(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs"
                >
                  💬 Start Conversational Wizard
                </Button>
              </div>

              {showWizard && (
                <Card className="bg-slate-900 border-indigo-500/40">
                  <CardHeader className="bg-indigo-950/40 border-b border-slate-850">
                    <CardTitle className="text-indigo-200 text-sm">
                      Resume Conversational Assistant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col gap-4 max-h-[300px] overflow-y-auto text-xs">
                    {wizardMessages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl max-w-[80%] ${
                          m.role === 'user'
                            ? 'bg-indigo-600 text-white self-end'
                            : 'bg-slate-950 border border-slate-850 text-slate-300'
                        }`}
                      >
                        {m.content}
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="bg-slate-950/60 p-3 border-t border-slate-850">
                    <form onSubmit={handleWizardSubmit} className="flex gap-2 w-full">
                      <input
                        type="text"
                        placeholder="Reply to assistant..."
                        value={wizardInput}
                        onChange={(e) => setWizardInput(e.target.value)}
                        className="flex-grow bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-500 text-xs"
                      >
                        Send
                      </Button>
                    </form>
                  </CardFooter>
                </Card>
              )}

              <form onSubmit={handleUpdateResume} className="flex flex-col gap-4 text-slate-300">
                <Card className="bg-slate-900 border-slate-800">
                  <CardContent className="p-6 flex flex-col gap-6">
                    {/* PROFILE PHOTO */}

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                      <h3 className="text-white text-sm font-semibold mb-4">Profile Photo</h3>

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsPhotoDragging(true);
                        }}
                        onDragLeave={() => setIsPhotoDragging(false)}
                        onDrop={handlePhotoDrop}
                        className={`border border-dashed rounded-xl p-6 text-center transition ${
                          isPhotoDragging
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700'
                        }`}
                      >
                        {profilePhoto ? (
                          <img
                            src={profilePhoto}
                            alt="Profile Preview"
                            className="w-32 h-32 mx-auto rounded-full object-cover border-2 border-indigo-500"
                          />
                        ) : (
                          <div className="w-32 h-32 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-3xl">
                            👤
                          </div>
                        )}

                        <p className="text-xs text-slate-400 mt-4">Drag & drop your photo here</p>

                        <p className="text-xs text-slate-600">JPG / PNG supported</p>

                        <input
                          type="file"
                          id="photoUpload"
                          hidden
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) processPhoto(file);
                          }}
                        />

                        <label
                          htmlFor="photoUpload"
                          className="inline-block mt-4 cursor-pointer bg-indigo-600 px-4 py-2 rounded-lg text-white text-xs"
                        >
                          Choose Photo
                        </label>
                      </div>
                    </div>

                    {/* Basic Information */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Headline"
                        value={candidateResume.headline}
                        onChange={(e) =>
                          setCandidateResume((prev: any) => ({
                            ...prev,
                            headline: e.target.value,
                          }))
                        }
                        className="bg-slate-950 border-slate-850 text-white"
                      />

                      <Input
                        label="Current Location"
                        value={candidateResume.currentLocation}
                        onChange={(e) =>
                          setCandidateResume((prev: any) => ({
                            ...prev,
                            currentLocation: e.target.value,
                          }))
                        }
                        className="bg-slate-950 border-slate-850 text-white"
                      />

                      <Input
                        label="Preferred Location"
                        value={candidateResume.preferredLocation}
                        onChange={(e) =>
                          setCandidateResume((prev: any) => ({
                            ...prev,
                            preferredLocation: e.target.value,
                          }))
                        }
                        className="bg-slate-950 border-slate-850 text-white"
                      />

                      {/* Skills */}

                      <Input
                        label="Skills (comma separated)"
                        value={candidateResume.skills.join(', ')}
                        onChange={(e) =>
                          setCandidateResume((prev: any) => ({
                            ...prev,
                            skills: e.target.value
                              .split(',')
                              .map((x) => x.trim())
                              .filter(Boolean),
                          }))
                        }
                        className="bg-slate-950 border-slate-850 text-white"
                      />
                    </div>

                    {/* Summary */}

                    <div>
                      <label className="text-xs text-slate-950  font-semibold">
                        Professional Summary
                      </label>

                      <textarea
                        value={candidateResume.careerSummary}
                        onChange={(e) =>
                          setCandidateResume((prev: any) => ({
                            ...prev,
                            careerSummary: e.target.value,
                          }))
                        }
                        className="w-full min-h-[120px] bg-slate-950 border border-slate-850 rounded-lg p-3 text-white"
                      />
                    </div>

                    {/* EXPERIENCE */}

                    <div className="flex flex-col gap-4">
                      <h3 className="text-xs text-slate-950  font-semibold">Experience</h3>

                      <div className="border border-slate-800 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Professional Role"
                          value={candidateResume.experiences?.[experienceIndex]?.title || ''}
                          onChange={(e) => {
                            setCandidateResume((prev: any) => {
                              const experiences = [...(prev.experiences || [])];

                              // create missing experience object
                              if (!experiences[experienceIndex]) {
                                experiences[experienceIndex] = {
                                  title: '',
                                  companyName: '',
                                  startDate: '',
                                  description: '',
                                };
                              }

                              experiences[experienceIndex] = {
                                ...experiences[experienceIndex],
                                title: e.target.value,
                              };

                              return {
                                ...prev,
                                experiences,
                              };
                            });
                          }}
                          className="bg-slate-950 border-slate-850 text-white"
                        />

                        <Input
                          label="Company Name"
                          value={candidateResume.experiences?.[experienceIndex]?.companyName || ''}
                          onChange={(e) => {
                            setCandidateResume((prev: any) => {
                              const experiences = [...(prev.experiences || [])];

                              experiences[experienceIndex] = {
                                ...(experiences[experienceIndex] || {
                                  title: '',
                                  companyName: '',
                                  startDate: '',
                                  description: '',
                                }),
                                companyName: e.target.value,
                              };

                              return {
                                ...prev,
                                experiences,
                              };
                            });
                          }}
                          className="bg-slate-950 border-slate-850 text-white"
                        />

                        <Input
                          label="Start Date"
                          type="date"
                          value={candidateResume.experiences?.[experienceIndex]?.startDate || ''}
                          onChange={(e) => {
                            setCandidateResume((prev: any) => {
                              const experiences = [...(prev.experiences || [])];

                              experiences[experienceIndex] = {
                                ...(experiences[experienceIndex] || {}),
                                startDate: e.target.value,
                              };

                              return {
                                ...prev,
                                experiences,
                              };
                            });
                          }}
                          className="bg-slate-950 border-slate-850 text-white"
                        />

                        <textarea
                          placeholder="Description"
                          value={candidateResume.experiences?.[experienceIndex]?.description || ''}
                          onChange={(e) => {
                            setCandidateResume((prev: any) => {
                              const experiences = [...(prev.experiences || [])];

                              experiences[experienceIndex] = {
                                ...(experiences[experienceIndex] || {}),
                                description: e.target.value,
                              };

                              return {
                                ...prev,
                                experiences,
                              };
                            });
                          }}
                          className="md:col-span-2 bg-slate-950 border border-slate-850 rounded-lg p-3 text-white"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          disabled={experienceIndex === 0}
                          onClick={() => setExperienceIndex((prev) => prev - 1)}
                        >
                          Previous
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            setCandidateResume((prev: any) => ({
                              ...prev,

                              experiences: [
                                ...prev.experiences,
                                {
                                  title: '',
                                  companyName: '',
                                  startDate: '',
                                  description: '',
                                },
                              ],
                            }));

                            setExperienceIndex(candidateResume.experiences.length);
                          }}
                        >
                          + Add Experience
                        </Button>

                        <Button
                          type="button"
                          disabled={experienceIndex === candidateResume.experiences.length - 1}
                          onClick={() => setExperienceIndex((prev) => prev + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>

                    {/* EDUCATION */}

                    <div className="flex flex-col gap-4">
                      <h3 className="text-white font-semibold">Education</h3>

                      <div className="border border-slate-800 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Institution"
                          value={candidateResume.educations[educationIndex]?.institution || ''}
                          onChange={(e) => {
                            setCandidateResume((prev: any) => {
                              const educations = [...(prev.educations || [])];

                              if (!educations[educationIndex]) {
                                educations[educationIndex] = {
                                  institution: '',
                                  degree: '',
                                  startDate: '',
                                  endDate: '',
                                };
                              }

                              educations[educationIndex] = {
                                ...educations[educationIndex],
                                institution: e.target.value,
                              };

                              return {
                                ...prev,
                                educations,
                              };
                            });
                          }}
                          className="bg-slate-950 border-slate-850 text-white"
                        />

                        <Input
                          label="Degree"
                          value={candidateResume.educations[educationIndex]?.degree || ''}
                          onChange={(e) => {
                            const educations = [...candidateResume.educations];

                            educations[educationIndex].degree = e.target.value;

                            setCandidateResume((prev: any) => ({
                              ...prev,
                              educations,
                            }));
                          }}
                          className="bg-slate-950 border-slate-850 text-white"
                        />

                        <Input
                          label="Start Date"
                          type="date"
                          value={candidateResume.educations[educationIndex]?.startDate || ''}
                          onChange={(e) => {
                            const educations = [...candidateResume.educations];

                            educations[educationIndex].startDate = e.target.value;

                            setCandidateResume((prev: any) => ({
                              ...prev,
                              educations,
                            }));
                          }}
                          className="bg-slate-950 border-slate-850 text-white"
                        />

                        <Input
                          label="End Date"
                          type="date"
                          value={candidateResume.educations[educationIndex]?.endDate || ''}
                          onChange={(e) => {
                            const educations = [...candidateResume.educations];

                            educations[educationIndex].endDate = e.target.value;

                            setCandidateResume((prev: any) => ({
                              ...prev,
                              educations,
                            }));
                          }}
                          className="bg-slate-950 border-slate-850 text-white"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          disabled={educationIndex === 0}
                          onClick={() => setEducationIndex((prev) => prev - 1)}
                        >
                          Previous
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            setCandidateResume((prev: any) => ({
                              ...prev,

                              educations: [
                                ...prev.educations,
                                {
                                  institution: '',
                                  degree: '',
                                  startDate: '',
                                  endDate: '',
                                },
                              ],
                            }));

                            setEducationIndex(candidateResume.educations.length);
                          }}
                        >
                          + Add Education
                        </Button>

                        <Button
                          type="button"
                          disabled={educationIndex === candidateResume.educations.length - 1}
                          onClick={() => setEducationIndex((prev) => prev + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>

                    {/* RESUME UPLOAD LAST */}

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                      <h3 className="text-white text-sm font-semibold mb-4">Resume Upload (PDF)</h3>

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsResumeDragging(true);
                        }}
                        onDragLeave={() => {
                          setIsResumeDragging(false);
                        }}
                        onDrop={handleResumeDrop}
                        className={`border border-dashed rounded-xl p-8 text-center transition ${
                          isResumeDragging
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-700'
                        }`}
                      >
                        📄
                        <p className="text-xs text-slate-400 mt-3">
                          Drag & drop your resume PDF here
                        </p>
                        <p className="text-xs text-slate-600">PDF only</p>
                        <input
                          type="file"
                          id="resumeUpload"
                          hidden
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) processResume(file);
                          }}
                        />
                        <label
                          htmlFor="resumeUpload"
                          className="inline-block mt-4 cursor-pointer bg-emerald-600 px-4 py-2 rounded-lg text-white text-xs"
                        >
                          Choose Resume
                        </label>
                      </div>

                      {resumeFile && (
                        <div className="mt-4">
                          <p className="text-xs text-emerald-400">✅ {resumeFile.name}</p>

                          {resumePreviewUrl && (
                            <div className="mt-4">
                              <iframe
                                src={`${resumePreviewUrl}#toolbar=0`}
                                className="w-full h-96 rounded-lg border border-slate-700"
                                title="Resume Preview"
                              />

                              <a
                                href={resumePreviewUrl}
                                target="_blank"
                                className="text-indigo-400 text-xs mt-2 inline-block"
                              >
                                Open Resume
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="justify-end p-4 border-t border-slate-850">
                    <Button
                      type="submit"
                      disabled={resumeLoading}
                      className="bg-indigo-600 hover:bg-indigo-500"
                    >
                      Save Profile Changes
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </div>
          )}

          {/* TAB 3: ATS AUDIT SCANNERS */}
          {activeTab === 'ats' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <h3 className="font-bold text-slate-100 text-lg">ATS Optimization Core</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-slate-800 md:col-span-1">
                  <CardHeader className="border-b border-slate-850">
                    <CardTitle className="text-white text-base">Overall Score</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 text-center">
                    <span className="text-6xl font-extrabold text-emerald-400">
                      {atsResult?.score || 0}%
                    </span>

                    {/* ATS Breakdown bars */}
                    <div className="flex flex-col gap-3 mt-6 text-left text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Keywords Compatibility</span>
                          <span className="text-emerald-400 font-semibold">
                            {atsResult?.breakdown?.keywords || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full"
                            style={{ width: `${atsResult?.breakdown?.keywords || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Formatting Checklist</span>
                          <span className="text-emerald-400 font-semibold">
                            {atsResult?.breakdown?.formatting || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full"
                            style={{ width: `${atsResult?.breakdown?.formatting || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Skills Compliance</span>
                          <span className="text-emerald-400 font-semibold">
                            {atsResult?.breakdown?.skills || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full"
                            style={{ width: `${atsResult?.breakdown?.skills || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-center border-t border-slate-850 p-4">
                    <Button
                      onClick={resolveAtsScoreIssues}
                      disabled={atsLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 w-full text-xs"
                    >
                      🪄 Fix with AI (Boost to 95%+)
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="bg-slate-900 border-slate-800 md:col-span-2">
                  <CardHeader className="border-b border-slate-850">
                    <CardTitle className="text-white text-base">
                      AI Scanners Audit Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex flex-col gap-4 text-xs">
                    <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl">
                      <h4 className="font-bold text-slate-300 mb-2">
                        Audit Targets Job Description:
                      </h4>
                      <p className="text-slate-400 leading-relaxed">{targetJobDesc}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-300 mb-2">Key Critical Suggestions:</h4>
                      <ul className="list-disc pl-4 text-slate-400 flex flex-col gap-2">
                        {atsResult?.suggestions.map((s: string, idx: number) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: JOB MATCH MARKETPLACE */}
          {activeTab === 'search' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Keyword */}
                <Input
                  label="Keywords"
                  placeholder="e.g. Flutter, React, Node.js"
                  value={searchParams.keyword}
                  onChange={(e) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      keyword: e.target.value,
                      page: 1,
                    }))
                  }
                  className="bg-slate-950 border-slate-850 text-white"
                />

                {/* Country */}
                <Input
                  label="Country"
                  placeholder="e.g. UAE"
                  value={searchParams.country}
                  onChange={(e) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      country: e.target.value,
                      page: 1,
                    }))
                  }
                  className="bg-slate-950 border-slate-850 text-white"
                />

                {/* City */}
                <Input
                  label="City"
                  placeholder="e.g. Dubai"
                  value={searchParams.city}
                  onChange={(e) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      city: e.target.value,
                      page: 1,
                    }))
                  }
                  className="bg-slate-950 border-slate-850 text-white"
                />

                {/* Job Category */}
                <Select
                  label="Job Category"
                  value={searchParams.category}
                  onChange={(e) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      category: e.target.value,
                      page: 1,
                    }))
                  }
                  options={[
                    {
                      value: '',
                      label: 'All Categories',
                    },
                    ...jobFilters.categories.map((cat) => ({
                      value: cat,
                      label: cat,
                    })),
                  ]}
                />

                {/* Employment Type */}
                <Select
                  label="Employment Type"
                  value={searchParams.employmentType}
                  onChange={(e) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      employmentType: e.target.value,
                    }))
                  }
                  options={[
                    {
                      value: '',
                      label: 'All Types',
                    },
                    ...jobFilters.employmentTypes.map((type) => ({
                      value: type,
                      label: type.replaceAll('_', ' '),
                    })),
                  ]}
                />

                {/* Experience Level */}
                <Select
                  label="Experience Level"
                  value={searchParams.experienceLevel}
                  onChange={(e) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      experienceLevel: e.target.value,
                    }))
                  }
                  options={[
                    {
                      value: '',
                      label: 'Any Experience',
                    },
                    ...jobFilters.experienceLevels.map((level) => ({
                      value: level,
                      label: level,
                    })),
                  ]}
                />

                {/* Minimum Salary */}
                <Input
                  label="Min Salary"
                  type="number"
                  placeholder="5000"
                  value={searchParams.salaryMin}
                  onChange={(e) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      salaryMin: e.target.value,
                      page: 1,
                    }))
                  }
                  className="bg-slate-950 border-slate-850 text-white"
                />

                {/* Maximum Salary */}
                <Input
                  label="Max Salary"
                  type="number"
                  placeholder="10000"
                  value={searchParams.salaryMax}
                  onChange={(e) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      salaryMax: e.target.value,
                      page: 1,
                    }))
                  }
                  className="bg-slate-950 border-slate-850 text-white"
                />

                {/* Search Button */}
                <Button
                  onClick={() => executeSearch()}
                  disabled={jobsLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 h-[38px] font-bold"
                >
                  Search Matches
                </Button>
              </div>

              {jobsLoading ? (
                <LoadingState label="Analyzing compatible roles..." />
              ) : searchResults.length === 0 ? (
                <EmptyState title="No match found" desc="Modify filters tags queries." />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={cycleFilterSort}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all shadow-sm hover:shadow-md ${
                        searchParams.sortBy === 'latest'
                          ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                          : searchParams.sortBy === 'match'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      <span className="text-sm">⚙️</span>
                      <span>Filter</span>
                      <span className="text-[10px] opacity-80">
                        {searchParams.sortBy === 'latest'
                          ? 'Latest Posted'
                          : searchParams.sortBy === 'match'
                          ? 'Highest Match'
                          : 'Applied First'}
                      </span>
                    </button>
                  </div>
                  {searchResults.map((job) => (
                    <Card
                      key={job.id}
                      className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all"
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-4 flex-wrap">
                          <div className="flex-1 min-w-[220px] max-w-full overflow-hidden">
                            <div className="flex flex-wrap items-start gap-2">
                              <h4 className="font-bold text-white text-base break-words max-w-full">
                                {job.title}
                              </h4>
                              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                                {job.matchScore}% Match
                              </span>
                            </div>
                            <span className="text-xs text-indigo-400 block mt-1 font-semibold break-words">
                              🏢 {job.organization?.name || 'Eecosystem Partner'}
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5 break-words">
                              📍{' '}
                              {job.locations?.map((l) => `${l.city}, ${l.country}`).join(' | ') ||
                                'Dubai, UAE'}{' '}
                              • {job.employmentType || 'N/A'}
                            </span>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 break-words overflow-hidden">
                              {job.description
                                ? job.description.length > 160
                                  ? `${job.description.slice(0, 160)}...`
                                  : job.description
                                : 'Job description not available.'}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <strong className="text-slate-200">Employment:</strong>
                                {job.employmentType || 'N/A'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <strong className="text-slate-200">Salary:</strong>
                                {job.salaryMin != null || job.salaryMax != null
                                  ? `${job.salaryMin ?? '-'} - ${job.salaryMax ?? '-'} ${job.salaryCurrency ?? ''}`
                                  : 'Not specified'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 flex-wrap justify-end shrink-0 max-w-full">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleSaveJob(job)}
                              disabled={Boolean(savingJobId)}
                              className={`text-xs whitespace-nowrap ${
                                isJobSaved(job.id)
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {savingJobId === job.id
                                ? 'Saving…'
                                : isJobSaved(job.id)
                                ? '★ Saved'
                                : '☆ Save'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => triggerQuickApply(job.id)}
                              disabled={hasAppliedJob(job.id) || Boolean(applyingJobId)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-xs whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {hasAppliedJob(job.id)
                                ? 'Applied'
                                : applyingJobId === job.id
                                ? 'Applying…'
                                : 'One-click Apply'}
                            </Button>
                          </div>
                        </div>

                        {/* AI Match Reasons breakdown */}
                        {job.matchReason && (
                          <div className="mt-4 p-3.5 bg-slate-950/80 border border-slate-850 rounded-xl text-xs">
                            <div className="flex gap-4 mb-2 flex-wrap">
                              <span className="text-emerald-400 font-semibold">
                                ✓ Matching:{' '}
                                {job.matchReason.matchedSkills?.join(', ') || 'No matching skills'}
                              </span>
                              <span className="text-rose-400 font-semibold">
                                ❌ Missing:{' '}
                                {job.matchReason.missingSkills?.join(', ') || 'No missing skills'}
                              </span>
                            </div>
                            <p className="text-slate-400 leading-relaxed font-light mt-1">
                              <strong>Coach Audit Explanation:</strong>{' '}
                              {job.matchReason.explanation}
                            </p>
                          </div>
                        )}

                        <div className="mt-5 pt-4 border-t border-slate-800 flex justify-between items-center">
                          <button
                            onClick={() => openJobModal(job)}
                            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium hover:underline transition"
                          >
                            View More →
                          </button>

                          <span className="text-xs text-slate-500">
                            Posted {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SAVED JOBS */}
          {activeTab === 'saved' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <h3 className="font-bold text-slate-100 text-lg">
                Saved Openings ({savedJobs.length})
              </h3>

              {savedJobs.length === 0 ? (
                <EmptyState
                  title="No bookmarks yet"
                  desc="Save jobs from marketplace to review later."
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={cycleFilterSort}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all shadow-sm hover:shadow-md ${
                        searchParams.sortBy === 'latest'
                          ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                          : searchParams.sortBy === 'match'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      <span className="text-sm">⚙️</span>
                      <span>Filter</span>
                      <span className="text-[10px] opacity-80">
                        {searchParams.sortBy === 'latest'
                          ? 'Latest Posted'
                          : searchParams.sortBy === 'match'
                          ? 'Highest Match'
                          : 'Applied First'}
                      </span>
                    </button>
                  </div>
                  {savedJobs.map((job) => (
                    <Card key={job.id} className="bg-slate-900 border-slate-800">
                      <CardContent className="p-6 flex justify-between items-start gap-4 flex-wrap">
                        <div className="flex-1 min-w-[220px] max-w-full overflow-hidden">
                          <div className="flex items-start gap-2 flex-wrap">
                            <h4 className="font-bold text-white text-base break-words max-w-full">
                              {job.title}
                            </h4>
                            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                              {job.matchScore ?? 0}% Match
                            </span>
                          </div>
                          <span className="text-xs text-indigo-400 block mt-1 font-semibold break-words">
                            🏢 {job.organization?.name || 'Eecosystem Partner'}
                          </span>
                          <span className="text-xs text-slate-500 block mt-1 break-words">
                            Posted {new Date(job.createdAt || 0).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap justify-end shrink-0 max-w-full">
                          <Button
                            variant="outline"
                            onClick={() => toggleSaveJob(job)}
                            disabled={Boolean(savingJobId)}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs whitespace-nowrap"
                          >
                            {savingJobId === job.id ? 'Saving…' : 'Remove'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openJobModal(job)}
                            className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 text-xs whitespace-nowrap"
                          >
                            View More
                          </Button>
                          <Button
                            onClick={() => triggerQuickApply(job.id)}
                            disabled={hasAppliedJob(job.id) || Boolean(applyingJobId)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-xs whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {hasAppliedJob(job.id)
                              ? 'Applied'
                              : applyingJobId === job.id
                              ? 'Applying…'
                              : 'One-click Apply'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: APPLICATIONS TRACKER */}
          {activeTab === 'applications' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <h3 className="font-bold text-slate-100 text-lg">Applications Pipeline Timeline</h3>

              {applications.length === 0 ? (
                <EmptyState
                  title="No submissions yet"
                  desc="Quick apply to jobs in the marketplace."
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={cycleFilterSort}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all shadow-sm hover:shadow-md ${
                        searchParams.sortBy === 'latest'
                          ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                          : searchParams.sortBy === 'match'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      <span className="text-sm">⚙️</span>
                      <span>Filter</span>
                      <span className="text-[10px] opacity-80">
                        {searchParams.sortBy === 'latest'
                          ? 'Latest Posted'
                          : searchParams.sortBy === 'match'
                          ? 'Highest Match'
                          : 'Applied First'}
                      </span>
                    </button>
                  </div>
                  {applications.map((app) => (
                    <Card key={app.id} className="bg-slate-900 border-slate-800">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-4 flex-wrap">
                          <div className="min-w-[220px] max-w-full overflow-hidden">
                            <h4 className="font-bold text-white text-base break-words max-w-full">
                              {app.job.title}
                            </h4>
                            <span className="text-xs text-indigo-400 block mt-1 break-words">
                              🏢 {app.job.organization?.name}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-1 break-words">
                              Applied: {new Date(app.appliedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end max-w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openJobModal({
                                id: app.jobId || app.id,
                                title: app.job.title,
                                description: '',
                                employmentType: '',
                                salaryCurrency: '',
                                createdAt: app.appliedAt,
                                organization: app.job.organization,
                              } as Job)}
                              className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 text-xs"
                            >
                              View More
                            </Button>
                            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                              {app.status}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Timeline guidance details */}
                        <div className="mt-4 p-4 bg-slate-950 border border-slate-850 rounded-2xl text-xs flex flex-col gap-2">
                          <div className="flex justify-between items-center text-slate-400">
                            <span>Average Recruiter Response Time:</span>
                            <span className="text-emerald-400 font-bold">
                              {app.avgReviewDays} Days
                            </span>
                          </div>
                          <p className="text-indigo-300 font-medium leading-relaxed bg-indigo-950/20 border border-indigo-950/30 p-2.5 rounded-lg mt-1">
                            💡 {app.coachSuggestion}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <CandidateJobModal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
        onApply={triggerQuickApply}
        job={selectedJob}
        isApplying={Boolean(applyingJobId)}
        isApplied={selectedJob ? hasAppliedJob(selectedJob.id) : false}
      />

      {/* Footer component */}
      <footer className="bg-slate-900 text-slate-500 border-t border-slate-800 p-6 text-center text-xs mt-auto">
        <div className="max-w-7xl mx-auto">
          © 2026 JovianeX AI Launch Platform. Premium Candidate Workspaces.
        </div>
      </footer>
    </div>
  );
}
