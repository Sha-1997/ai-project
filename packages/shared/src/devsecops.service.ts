import { PrismaClient, ReleasePipeline, DeploymentRecord, DevSecOpsSecret } from "@prisma/client";
import * as crypto from "crypto";

export class DevSecOpsService {
  private prisma: PrismaClient;
  private encryptionKey: Buffer;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
    // Simulate secure SRE HSM encryption keys
    this.encryptionKey = crypto.scryptSync("JVX-HSM-MASTER-SALT-TOKEN-1234", "SALT_HSM", 32);
  }

  /**
   * 1. CI BUILD PIPELINE (SECURITY VULNERABILITY GATE SCANS)
   * Automatically blocks builds if critical or high vulnerabilities are detected.
   */
  async triggerCiBuild(
    serviceName: string,
    branch: string,
    commitHash: string,
    triggeredBy: string,
    simulatedVulnerabilities: { severity: string; count: number }[] = []
  ): Promise<ReleasePipeline> {
    console.log(`[CI Pipeline] Running unit tests and linting check metrics on branch: ${branch}...`);

    let buildStatus = "SUCCESS";
    let failureDetails = "";

    // Security scanning gate: fail if any CRITICAL or HIGH vulnerabilities exist
    for (const scan of simulatedVulnerabilities) {
      if ((scan.severity === "CRITICAL" || scan.severity === "HIGH") && scan.count > 0) {
        buildStatus = "FAILED";
        failureDetails = `Blocked by Security Gates: Found ${scan.count} ${scan.severity} vulnerability targets.`;
        break;
      }
    }

    const pipeline = await this.prisma.releasePipeline.create({
      data: {
        serviceName,
        branch,
        commitHash,
        buildStatus,
        triggeredBy,
      },
    });

    if (buildStatus === "FAILED") {
      throw new Error(`CI Build abort details: ${failureDetails} (Pipeline ID: ${pipeline.id})`);
    }

    console.log(`[CI Pipeline] CI Build completed successfully. Generated artifact hash: ${pipeline.id}`);
    return pipeline;
  }

  /**
   * 2. CD DEPLOYMENT PIPELINE WITH MANDATORY PRODUCTION APPROVAL GATE
   * Rejects PRODUCTION deployments unless authorized.
   */
  async deployEnvironment(
    pipelineId: string,
    environmentName: string,
    approverUserId?: string,
    approvalToken?: string
  ): Promise<DeploymentRecord> {
    const pipeline = await this.prisma.releasePipeline.findUnique({ where: { id: pipelineId } });
    if (!pipeline) throw new Error("Pipeline compilation artifact not found.");
    if (pipeline.buildStatus !== "SUCCESS") throw new Error("Deployment blocked: CI compilation failed.");

    const env = environmentName.toUpperCase();
    const isProduction = env === "PRODUCTION";

    // Enforce SRE mandatory approval gate for Production
    if (isProduction && (!approverUserId || !approvalToken)) {
      const failedRecord = await this.prisma.deploymentRecord.create({
        data: {
          pipelineId,
          environmentName: env,
          deployStatus: "FAILED",
        },
      });
      throw new Error(`Deployment Blocked: Production releases mandate administrative approver credentials (Deployment ID: ${failedRecord.id})`);
    }

    return this.prisma.deploymentRecord.create({
      data: {
        pipelineId,
        environmentName: env,
        deployStatus: "SUCCESS",
        approvedBy: approverUserId || null,
        approvalToken: approvalToken || null,
        rollbackLogJson: JSON.stringify({
          previousCommitHash: pipeline.commitHash,
          targetServiceName: pipeline.serviceName,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  }

  /**
   * 3. CD SMOKE TESTING & AUTOMATED RELEASE ROLLBACKS
   */
  async simulateSmokeTestAndValidateDeployment(deploymentId: string, isSmokeTestHealthy: boolean): Promise<DeploymentRecord> {
    const deploy = await this.prisma.deploymentRecord.findUnique({ where: { id: deploymentId } });
    if (!deploy) throw new Error("Deployment record not found.");

    if (isSmokeTestHealthy) {
      console.log(`[CD Pipeline] Smoke test passed. Deployment ${deploymentId} is healthy.`);
      return deploy;
    }

    console.warn(`[CD Pipeline] Smoke test failed for deployment ${deploymentId}. Triggering automated SRE rollback...`);
    return this.triggerAutomatedRollback(deploymentId);
  }

  async triggerAutomatedRollback(deploymentId: string): Promise<DeploymentRecord> {
    const failedDeploy = await this.prisma.deploymentRecord.findUnique({
      where: { id: deploymentId },
      include: { pipeline: true },
    });
    if (!failedDeploy) throw new Error("Deployment record not found.");

    // Retrieve previous stable release commit deployment
    const stableRelease = await this.prisma.deploymentRecord.findFirst({
      where: {
        environmentName: failedDeploy.environmentName,
        deployStatus: "SUCCESS",
        id: { not: deploymentId },
        pipeline: { serviceName: failedDeploy.pipeline.serviceName },
      },
      orderBy: { createdAt: "desc" },
    });

    const rollbackSummary = {
      action: "ROLLED_BACK_TO_PREVIOUS",
      revertedFromDeploymentId: deploymentId,
      targetStableDeploymentId: stableRelease ? stableRelease.id : "INITIAL_BASELINE",
      revertedTimestamp: new Date().toISOString(),
    };

    return this.prisma.deploymentRecord.update({
      where: { id: deploymentId },
      data: {
        deployStatus: "ROLLED_BACK",
        rollbackLogJson: JSON.stringify(rollbackSummary),
      },
    });
  }

  /**
   * 4. ENCRYPTED ENV CONFIG SECRETS MANAGER (SIMULATED VAULT / HSM)
   */
  async encryptAndStoreSecret(key: string, value: string, environmentName: string): Promise<DevSecOpsSecret> {
    const env = environmentName.toUpperCase();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.encryptionKey, iv);

    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");

    const payload = `${iv.toString("hex")}:${encrypted}`;

    return this.prisma.devSecOpsSecret.upsert({
      where: {
        secretKey_environmentName: {
          secretKey: key,
          environmentName: env,
        },
      },
      update: {
        secretValueEncrypted: payload,
      },
      create: {
        secretKey: key,
        secretValueEncrypted: payload,
        environmentName: env,
      },
    });
  }

  async retrieveSecret(key: string, environmentName: string): Promise<string> {
    const env = environmentName.toUpperCase();
    const secret = await this.prisma.devSecOpsSecret.findUnique({
      where: {
        secretKey_environmentName: {
          secretKey: key,
          environmentName: env,
        },
      },
    });

    if (!secret) throw new Error(`Secret config "${key}" not found in environment "${env}"`);

    const parts = secret.secretValueEncrypted.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = Buffer.from(parts[1], "hex");

    const decipher = crypto.createDecipheriv("aes-256-cbc", this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
