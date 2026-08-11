export type EventType =
  | 'USER_REGISTERED'
  | 'LOGIN_SUCCESSFUL'
  | 'MEMBERSHIP_ACTIVATED'
  | 'PAYMENT_COMPLETED'
  | 'JOB_PUBLISHED'
  | 'JOB_VIEWED'
  | 'JOB_APPLIED'
  | 'CANDIDATE_SHORTLISTED';

export interface BaseEventPayload {
  [key: string]: any;
}

export interface UserRegisteredPayload extends BaseEventPayload {
  userId: string;
  email: string;
  role: string;
  country: string;
}

export interface LoginSuccessfulPayload extends BaseEventPayload {
  userId: string;
  email: string;
  clientIp?: string;
  userAgent?: string;
}

export interface MembershipActivatedPayload extends BaseEventPayload {
  userId: string;
  planCode: string;
  durationYears: number;
}

export interface PaymentCompletedPayload extends BaseEventPayload {
  orderId: string;
  amount: number;
  currency: string;
  planCode: string;
}

export interface JobPublishedPayload extends BaseEventPayload {
  jobId: string;
  title: string;
  organizationId: string;
  employmentType: string;
}

export interface JobViewedPayload extends BaseEventPayload {
  jobId: string;
  candidateId?: string;
}

export interface JobAppliedPayload extends BaseEventPayload {
  applicationId: string;
  jobId: string;
  candidateId: string;
}

export interface CandidateShortlistedPayload extends BaseEventPayload {
  applicationId: string;
  jobId: string;
  recruiterId: string;
}

export interface EcosystemEvent<T extends BaseEventPayload = BaseEventPayload> {
  eventId: string;
  eventType: EventType;
  version: string;
  timestamp: string;
  actorId?: string;
  correlationId: string;
  payload: T;
}
