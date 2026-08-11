import { PrismaClient, ContentPage, ContentBlock, ContentVersion } from "@prisma/client";

export interface CMSBlockInput {
  blockType: string;
  sortOrder: number;
  blockContent: string; // JSON String representing content fields
}

export class CmsService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. CREATE PAGE (INITIAL DRAFT STATUS)
   */
  async createPage(title: string, slug: string, language = "en"): Promise<ContentPage> {
    const existing = await this.prisma.contentPage.findUnique({ where: { slug } });
    if (existing) throw new Error(`Slug ${slug} is already registered.`);

    return this.prisma.contentPage.create({
      data: {
        title,
        slug,
        language,
        status: "DRAFT",
      },
    });
  }

  /**
   * 2. SAVE PAGE BLOCKS & COMPOSE HISTORICAL VERSION SNAPSHOT
   * Inside a transaction block, replaces existing page blocks and writes backup version snapshots.
   */
  async savePageBlocks(
    pageId: string,
    blocksInput: CMSBlockInput[],
    author: string
  ): Promise<ContentBlock[]> {
    return this.prisma.$transaction(async (tx) => {
      const page = await tx.contentPage.findUnique({ where: { id: pageId } });
      if (!page) throw new Error("Content page not found.");

      // 1. Delete existing blocks
      await tx.contentBlock.deleteMany({ where: { pageId } });

      // 2. Insert new blocks
      const savedBlocks = await Promise.all(
        blocksInput.map((block) =>
          tx.contentBlock.create({
            data: {
              pageId,
              blockType: block.blockType,
              sortOrder: block.sortOrder,
              blockContent: block.blockContent,
            },
          })
        )
      );

      // 3. Query current total versions to calculate the next sequence number
      const versionCount = await tx.contentVersion.count({ where: { pageId } });
      const nextVersionNumber = versionCount + 1;

      // 4. Create block snapshot JSON and save the version history
      const snapshotString = JSON.stringify(blocksInput);
      await tx.contentVersion.create({
        data: {
          pageId,
          versionNumber: nextVersionNumber,
          blockSnapshot: snapshotString,
          author,
        },
      });

      // 5. Write log details
      await tx.auditLog.create({
        data: {
          action: "CMS_PAGE_EDITED",
          entityName: "ContentPage",
          entityId: pageId,
          newVal: JSON.stringify({ versionNumber: nextVersionNumber, author }),
        },
      });

      return savedBlocks;
    });
  }

  /**
   * 3. PUBLISH PAGE
   * Updates publishing status.
   */
  async publishPage(pageId: string, author: string): Promise<ContentPage> {
    const page = await this.prisma.contentPage.findUnique({ where: { id: pageId } });
    if (!page) throw new Error("Content page not found.");

    const updatedPage = await this.prisma.contentPage.update({
      where: { id: pageId },
      data: { status: "PUBLISHED" },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "CMS_PAGE_PUBLISHED",
        entityName: "ContentPage",
        entityId: pageId,
        newVal: JSON.stringify({ status: "PUBLISHED", author }),
      },
    });

    return updatedPage;
  }

  /**
   * 4. ROLLBACK TO VERSION HISTORIES
   * Restores block snapshot settings from database.
   */
  async rollbackPageVersion(pageId: string, versionNumber: number, author: string): Promise<ContentBlock[]> {
    return this.prisma.$transaction(async (tx) => {
      const versionRecord = await tx.contentVersion.findUnique({
        where: {
          pageId_versionNumber: {
            pageId,
            versionNumber,
          },
        },
      });

      if (!versionRecord) {
        throw new Error(`Version snapshot ${versionNumber} for page ${pageId} not found.`);
      }

      // Parse block snapshots from backup string
      const blocksSnapshot: CMSBlockInput[] = JSON.parse(versionRecord.blockSnapshot);

      // Delete current blocks
      await tx.contentBlock.deleteMany({ where: { pageId } });

      // Restore blocks snapshot
      const restoredBlocks = await Promise.all(
        blocksSnapshot.map((block) =>
          tx.contentBlock.create({
            data: {
              pageId,
              blockType: block.blockType,
              sortOrder: block.sortOrder,
              blockContent: block.blockContent,
            },
          })
        )
      );

      // Create a rollback version snapshot marker
      const versionCount = await tx.contentVersion.count({ where: { pageId } });
      const nextVersionNumber = versionCount + 1;
      await tx.contentVersion.create({
        data: {
          pageId,
          versionNumber: nextVersionNumber,
          blockSnapshot: versionRecord.blockSnapshot,
          author: `ROLLBACK to v${versionNumber} by ${author}`,
        },
      });

      // Write rollback audit logs
      await tx.auditLog.create({
        data: {
          action: "CMS_PAGE_ROLLEDBACK",
          entityName: "ContentPage",
          entityId: pageId,
          newVal: JSON.stringify({ restoredVersion: versionNumber, newVersion: nextVersionNumber, author }),
        },
      });

      return restoredBlocks;
    });
  }

  /**
   * 5. GET PUBLISHED CONTENT BY SLUG (API ROUTING ENDPOINT)
   */
  async getPublishedPage(slug: string, language = "en"): Promise<ContentPage & { blocks: ContentBlock[] }> {
    const page = await this.prisma.contentPage.findFirst({
      where: {
        slug,
        language,
        status: "PUBLISHED",
      },
      include: {
        blocks: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!page) {
      throw new Error(`Published page with slug ${slug} not found.`);
    }

    return page;
  }
}
