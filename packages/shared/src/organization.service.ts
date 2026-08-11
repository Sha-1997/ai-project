import { PrismaClient, Organization, BranchOffice, VerificationDocument, RecruiterInvitation, Employer } from "@prisma/client";
import * as crypto from "crypto";

export interface OrganizationInput {
  name: string;
  legalName: string;
  registrationNumber?: string;
  industry?: string;
  companySize?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  headquartersCountry: string;
  headquartersCity: string;
  timeZone?: string;
}

export interface BranchInput {
  address: string;
  country: string;
  city: string;
  contactPhone?: string;
}

export class OrganizationService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. CREATE ORGANIZATION & ASSIGN OWNER ROLE
   */
  async createOrganization(ownerUserId: string, input: OrganizationInput): Promise<Organization> {
    return this.prisma.$transaction(async (tx) => {
      // Create Organization
      const org = await tx.organization.create({
        data: {
          name: input.name,
          legalName: input.legalName,
          registrationNumber: input.registrationNumber,
          industry: input.industry,
          companySize: input.companySize,
          websiteUrl: input.websiteUrl,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          headquartersCountry: input.headquartersCountry,
          headquartersCity: input.headquartersCity,
          timeZone: input.timeZone || "Asia/Dubai",
          verificationStatus: "PENDING",
        },
      });

      // Create primary Owner user profile link
      await tx.employer.create({
        data: {
          userId: ownerUserId,
          organizationId: org.id,
          role: "OWNER",
        },
      });

      // Log audit trail
      await tx.auditLog.create({
        data: {
          userId: ownerUserId,
          action: "ORGANIZATION_CREATED",
          entityName: "Organization",
          entityId: org.id,
          newVal: JSON.stringify({ name: input.name }),
        },
      });

      return org;
    });
  }

  /**
   * 2. ADD BRANCH OFFICE
   */
  async addBranchOffice(orgId: string, input: BranchInput): Promise<BranchOffice> {
    const branch = await this.prisma.branchOffice.create({
      data: {
        organizationId: orgId,
        address: input.address,
        country: input.country,
        city: input.city,
        contactPhone: input.contactPhone,
        isActive: true,
      },
    });

    return branch;
  }

  /**
   * 3. UPLOAD VERIFICATION DOCUMENT
   * Sets verification status to DOCUMENT_SUBMITTED.
   */
  async uploadVerificationDocument(
    orgId: string,
    docType: "BUSINESS_REGISTRATION" | "TRADE_LICENSE" | "TAX_CERTIFICATE",
    fileUrl: string,
    fileName: string
  ): Promise<VerificationDocument> {
    return this.prisma.$transaction(async (tx) => {
      // Create document attachment
      const doc = await tx.verificationDocument.create({
        data: {
          organizationId: orgId,
          documentType: docType,
          fileUrl,
          fileName,
        },
      });

      // Update organization status to indicate document queue
      await tx.organization.update({
        where: { id: orgId },
        data: { verificationStatus: "DOCUMENT_SUBMITTED" },
      });

      await tx.auditLog.create({
        data: {
          action: "ORGANIZATION_DOCUMENT_SUBMITTED",
          entityName: "Organization",
          entityId: orgId,
          newVal: JSON.stringify({ documentType: docType, fileName }),
        },
      });

      return doc;
    });
  }

  /**
   * 4. GENERATE RECRUITER INVITATION
   * Validates actor permissions prior to creating token.
   */
  async inviteRecruiter(
    orgId: string,
    inviteeEmail: string,
    inviteRole: "ADMIN" | "RECRUITER" | "HIRING_MANAGER" | "HR",
    actorId: string
  ): Promise<RecruiterInvitation> {
    // RBAC isolation check: actor must belong to organization with OWNER or ADMIN role
    const staff = await this.prisma.employer.findFirst({
      where: { userId: actorId, organizationId: orgId },
    });

    if (!staff || !["OWNER", "ADMIN"].includes(staff.role)) {
      throw new Error("Unauthorized: Only Organization Owners or Admins are permitted to invite team members.");
    }

    // Generate secure registration tokens
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expiration limit: 7 days

    const invitation = await this.prisma.recruiterInvitation.create({
      data: {
        organizationId: orgId,
        inviteeEmail,
        inviteRole,
        inviteToken,
        status: "PENDING",
        expiresAt,
      },
    });

    return invitation;
  }

  /**
   * 5. ACCEPT INVITATION
   * Links invited user to Organization.
   */
  async acceptInvitation(inviteToken: string, userId: string): Promise<Employer> {
    return this.prisma.$transaction(async (tx) => {
      // Query invitation
      const invite = await tx.recruiterInvitation.findUnique({
        where: { inviteToken },
      });

      if (!invite || invite.status !== "PENDING") {
        throw new Error("Invalid or expired invitation token.");
      }

      if (invite.expiresAt < new Date()) {
        await tx.recruiterInvitation.update({
          where: { inviteToken },
          data: { status: "EXPIRED" },
        });
        throw new Error("Invitation token has expired.");
      }

      // Check if user already belongs to another organization
      const existing = await tx.employer.findUnique({ where: { userId } });
      if (existing) {
        throw new Error("User already belongs to an organization.");
      }

      // Accept invitation
      await tx.recruiterInvitation.update({
        where: { inviteToken },
        data: { status: "ACCEPTED" },
      });

      // Create corporate profile link
      const staff = await tx.employer.create({
        data: {
          userId,
          organizationId: invite.organizationId,
          role: invite.inviteRole,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "RECRUITER_INVITATION_ACCEPTED",
          entityName: "Employer",
          entityId: staff.id,
          newVal: JSON.stringify({ organizationId: invite.organizationId, role: invite.inviteRole }),
        },
      });

      return staff;
    });
  }

  /**
   * 6. MANUAL VERIFICATION TRANSITIONS (ADMIN ONLY ACTION)
   */
  async verifyOrganization(orgId: string, nextStatus: string, actorId: string): Promise<Organization> {
    const allowed = ["VERIFIED", "REJECTED", "SUSPENDED", "UNDER_REVIEW"];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Invalid target status transition: ${nextStatus}`);
    }

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new Error("Organization details not found.");

    const updatedOrg = await this.prisma.organization.update({
      where: { id: orgId },
      data: { verificationStatus: nextStatus },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "ORGANIZATION_VERIFICATION_STATUS_CHANGED",
        entityName: "Organization",
        entityId: orgId,
        previousVal: JSON.stringify({ status: org.verificationStatus }),
        newVal: JSON.stringify({ status: nextStatus }),
      },
    });

    return updatedOrg;
  }
}
