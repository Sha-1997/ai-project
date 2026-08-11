import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { CreateJobV2Dto } from '../dto/create-job-v2.dto';


@Injectable()
export class JobsService {

  constructor(
    private readonly prisma: PrismaService,
  ) { }



  /**
   * Public Job Search
   */
async getJobs(
  search?: string,
  country?: string,
  city?: string,
  location?: string,
  category?: string,
  employmentType?: string,
  workplaceType?: string,
  salaryMin?: number,
  salaryMax?: number,
  experienceLevel?: string,
  skills?: string[],
  page:number = 1,
  limit:number = 10,
) {
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      deletedAt: null,
    };


    // Search by title / description
    if (search) {
      const searchText = search.trim();

      where.OR = [
        {
          title: {
            contains: searchText,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: searchText,
            mode: 'insensitive',
          },
        },
      ];
    }


    // Location filter
    if (location) {
      where.locations = {
        some: {
          OR: [
            {
              country: {
                contains: location,
                mode: 'insensitive',
              },
            },
            {
              city: {
                contains: location,
                mode: 'insensitive',
              },
            },
          ],
        },
      };
    }


    // Workplace type filter
    if (workplaceType) {
      where.locations = {
        some: {
          workplaceType,
        },
      };
    }


    // Salary filter
    if (salaryMin !== undefined) {
      where.salaryMax = {
        gte: salaryMin,
      };
    }


    if (salaryMax !== undefined) {
      where.salaryMin = {
        lte: salaryMax,
      };
    }


    // Experience filter
    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }


    // Skills filter
    if (skills && skills.length > 0) {
      where.skills = {
        some: {
          skillName: {
            in: skills,
            mode: 'insensitive',
          },
        },
      };
    }

    if(country){
  where.locations = {
    some:{
      country:{
        contains:country,
        mode:'insensitive'
      }
    }
  };
}
if(city){
  where.locations = {
    some:{
      city:{
        contains:city,
        mode:'insensitive'
      }
    }
  };
}
if(category){
  where.category = {
    name:{
      contains:category,
      mode:'insensitive'
    }
  };
}
if(employmentType){
  where.employmentType = employmentType;
}
if(experienceLevel){
  where.experienceLevel = experienceLevel;
}



    const [jobs, total] =
      await this.prisma.$transaction([


        this.prisma.job.findMany({

          where,

          skip,

          take: limit,


          // SECURITY: only required fields
          select: {

            id: true,

            title: true,

            description: true,


            employmentType: true,


            salaryMin: true,

            salaryMax: true,

            salaryCurrency: true,

            salaryVisible: true,


            experienceYears: true,

            experienceLevel: true,


            department: true,

            industry: true,


            createdAt: true,

            updatedAt: true,


            organization: {

              select: {

                name: true,

                industry: true,

                logoUrl: true,

              },

            },


            category: {

              select: {

                name: true,

              },

            },


            locations: {

              select: {

                country: true,

                state: true,

                city: true,

                workplaceType: true,

              },

            },


            skills: {

              select: {

                skillName: true,

              },

            },


            benefits: {

              select: {

                benefitName: true,

              },

            },


          },


          orderBy: {

            createdAt: 'desc',

          },


        }),



        this.prisma.job.count({

          where,

        }),


      ]);



    return {

      jobs,


      pagination: {

        total,

        page,

        limit,

        totalPages: Math.ceil(total / limit),

      },

    };
  }

  /**
   * Employer's own job listings
   */
  async getMyJobs(
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ) {


    const employer =
      await this.prisma.employer.findUnique({

        where: {

          userId,

        },

      });



    if (!employer) {

      throw new ForbiddenException(
        'User is not registered as an employer.',
      );

    }



    const skip =
      (page - 1) * limit;



    const where: any = {

      employerId: employer.id,

      deletedAt: null,

    };



    if (status) {

      where.status =
        status.toUpperCase();

    }



    const [jobs, total] =
      await this.prisma.$transaction([


        this.prisma.job.findMany({

          where,

          skip,

          take: limit,


          include: {

            organization: true,

            category: true,

            locations: true,

            skills: true,

            benefits: true,


            _count: {

              select: {

                applications: true,

              },

            },

          },


          orderBy: {

            createdAt: 'desc',

          },

        }),



        this.prisma.job.count({

          where,

        }),


      ]);



    return {

      jobs,


      pagination: {

        total,

        page,

        limit,

        totalPages:
          Math.ceil(total / limit),

      },

    };

  }


  /**
   * Get Job Details
   */
  async getJobById(
    id: string,
  ) {


    const job =
      await this.prisma.job.findUnique({

        where: {

          id,

        },


        include: {


          organization: true,

          category: true,

          locations: true,

          skills: true,

          benefits: true,

          attachments: true,


          statusHistory: {

            orderBy: {

              changedAt: 'desc',

            },

          },


          employer: {

            include: {

              user: {

                select: {

                  email: true,

                  profile: true,

                },

              },

            },

          },


        },

      });



    if (!job || job.deletedAt) {

      throw new NotFoundException(
        'Job posting not found.',
      );

    }



    return job;

  }


  /**
   * Soft Delete Job
   */
  async deleteJob(
    userId: string,
    id: string,
  ) {


    const job =
      await this.prisma.job.findUnique({

        where: {

          id,

        },


        include: {

          employer: true,

        },

      });



    if (!job) {

      throw new NotFoundException(
        'Job posting not found.',
      );

    }



    if (job.employer.userId !== userId) {

      throw new ForbiddenException(
        'You do not have permission to delete this job.',
      );

    }



    if (
      job.status === 'PUBLISHED' ||
      job.status === 'PAUSED'
    ) {

      throw new BadRequestException(
        'Close the job before deleting it.',
      );

    }



    await this.prisma.job.update({

      where: {

        id,

      },


      data: {

        status: 'DELETED',

        deletedAt: new Date(),

        deletedById: userId,

        deleteReason:
          'Deleted by employer',

      },

    });



    return {

      success: true,

      message:
        'Job deleted successfully.',

    };

  }

  /**
 * Create Job in DRAFT status
 * Organization ID taken from backend
 */
  async createJob(
    userId: string,
    dto: CreateJobV2Dto,
  ) {


    const employer =
      await this.prisma.employer.findUnique({

        where: {

          userId,

        },


        include: {

          memberships: true,

        },

      });



    if (!employer) {

      throw new ForbiddenException(
        'Employer profile not found.',
      );

    }



    const membership =
      employer.memberships[0];



    if (!membership) {

      throw new ForbiddenException(
        'Employer is not assigned to an organization.',
      );

    }



    const organizationId =
      membership.organizationId;



    let categoryId: string | null = null;



    if (dto.categoryName) {


      const categoryName =
        dto.categoryName.trim();



      let category =
        await this.prisma.jobCategory.findUnique({

          where: {

            name: categoryName,

          },

        });



      if (!category) {

        category =
          await this.prisma.jobCategory.create({

            data: {

              name: categoryName,

            },

          });

      }



      categoryId =
        category.id;

    }





    return this.prisma.$transaction(
      async (tx) => {



        const job =
          await tx.job.create({

            data: {


              title:
                dto.title.trim(),


              description:
                dto.description.trim(),



              employmentType:
                dto.employmentType,



              salaryMin:
                dto.salaryMin ?? null,



              salaryMax:
                dto.salaryMax ?? null,



              salaryVisible:
                dto.salaryVisible ?? true,



              experienceYears:
                dto.experienceYears ?? 0,



              experienceLevel:
                dto.experienceLevel ?? 'MID',



              department:
                dto.department ?? null,



              industry:
                dto.industry ?? null,



              status:
                'DRAFT',



              visibility:
                'PUBLIC',



              employerId:
                employer.id,



              organizationId,



              categoryId,

            },

          });






        await tx.jobStatusHistory.create({

          data: {


            jobId:
              job.id,


            oldStatus:
              'NONE',


            newStatus:
              'DRAFT',


            changedById:
              userId,


            notes:
              'Job created.',


          },

        });






        if (dto.locations?.length) {


          await tx.jobLocation.createMany({

            data:

              dto.locations.map((loc) => ({

                jobId:
                  job.id,


                country:
                  loc.country,


                state:
                  loc.state ?? null,


                city:
                  loc.city ?? null,


                workplaceType:
                  loc.workplaceType ?? 'ONSITE',


              })),


          });

        }





        if (dto.skills?.length) {


          await tx.jobSkill.createMany({

            data:

              dto.skills.map((skill) => ({

                jobId:
                  job.id,


                skillName:
                  skill.trim(),


              })),


          });

        }





        if (dto.benefits?.length) {


          await tx.jobBenefit.createMany({

            data:

              dto.benefits.map((benefit) => ({

                jobId:
                  job.id,


                benefitName:
                  benefit.trim(),


              })),


          });

        }



        return job;


      },
    );

  }







  /**
   * Update Job
   */
  async updateJob(
    userId: string,
    id: string,
    dto: Partial<CreateJobV2Dto>,
  ) {



    const job =
      await this.prisma.job.findUnique({

        where: {

          id,

        },


        include: {

          employer: true,

        },

      });




    if (!job) {

      throw new NotFoundException(
        'Job posting not found.',
      );

    }





    if (job.employer.userId !== userId) {

      throw new ForbiddenException(
        'You do not own this job posting.',
      );

    }





    if (job.status === 'DELETED') {

      throw new BadRequestException(
        'Deleted job cannot be edited.',
      );

    }





    return this.prisma.$transaction(
      async (tx) => {



        let categoryId;



        if (dto.categoryName) {


          let category =
            await tx.jobCategory.findUnique({

              where: {

                name:
                  dto.categoryName.trim(),

              },

            });



          if (!category) {


            category =
              await tx.jobCategory.create({

                data: {

                  name:
                    dto.categoryName.trim(),

                },

              });


          }



          categoryId =
            category.id;

        }





        const updated =
          await tx.job.update({

            where: {

              id,

            },


            data: {


              title:
                dto.title?.trim(),



              description:
                dto.description?.trim(),



              employmentType:
                dto.employmentType,



              salaryMin:
                dto.salaryMin,



              salaryMax:
                dto.salaryMax,



              salaryVisible:
                dto.salaryVisible,



              experienceYears:
                dto.experienceYears,



              experienceLevel:
                dto.experienceLevel,



              department:
                dto.department,



              industry:
                dto.industry,



              ...(categoryId && {

                categoryId,

              }),


            },


          });






        if (dto.skills !== undefined) {


          await tx.jobSkill.deleteMany({

            where: {

              jobId: id,

            },

          });




          if (dto.skills.length) {


            await tx.jobSkill.createMany({

              data:

                dto.skills.map(skill => ({

                  jobId: id,

                  skillName:
                    skill.trim(),

                })),


            });

          }

        }






        if (dto.benefits !== undefined) {


          await tx.jobBenefit.deleteMany({

            where: {

              jobId: id,

            },

          });




          if (dto.benefits.length) {


            await tx.jobBenefit.createMany({

              data:

                dto.benefits.map(item => ({

                  jobId: id,

                  benefitName:
                    item.trim(),

                })),


            });


          }


        }



        return updated;


      },
    );

  }







  /**
   * Draft / Paused -> Published
   */
  async publishJob(
    userId: string,
    id: string,
  ) {



    const job =
      await this.prisma.job.findUnique({

        where: {

          id,

        },


        include: {

          employer: true,

        },

      });




    if (!job) {

      throw new NotFoundException(
        'Job posting not found.',
      );

    }




    if (job.employer.userId !== userId) {

      throw new ForbiddenException(
        'You do not have permission to publish this job.',
      );

    }




    if (job.status === 'DELETED') {

      throw new BadRequestException(
        'Deleted job cannot be published.',
      );

    }





    if (
      job.status !== 'DRAFT' &&
      job.status !== 'PAUSED'
    ) {

      throw new BadRequestException(
        'Only Draft or Paused jobs can be published.',
      );

    }





    return this.prisma.$transaction(
      async (tx) => {



        await tx.jobStatusHistory.create({

          data: {


            jobId:
              id,


            oldStatus:
              job.status,


            newStatus:
              'PUBLISHED',


            changedById:
              userId,


            notes:
              'Job published.',


          },

        });





        return tx.job.update({

          where: {

            id,

          },


          data: {

            status:
              'PUBLISHED',

          },


        });


      },
    );

  }
  /**
 * Published -> Paused
 */
  async pauseJob(
    userId: string,
    id: string,
  ) {


    const job =
      await this.prisma.job.findUnique({

        where: {
          id,
        },

        include: {
          employer: true,
        },

      });



    if (!job) {

      throw new NotFoundException(
        'Job posting not found.',
      );

    }



    if (job.employer.userId !== userId) {

      throw new ForbiddenException(
        'You do not have permission to pause this job.',
      );

    }



    if (job.status === 'DELETED') {

      throw new BadRequestException(
        'Deleted job cannot be paused.',
      );

    }



    if (job.status !== 'PUBLISHED') {

      throw new BadRequestException(
        'Only published jobs can be paused.',
      );

    }



    return this.prisma.$transaction(
      async (tx) => {


        await tx.jobStatusHistory.create({

          data: {

            jobId: id,

            oldStatus: 'PUBLISHED',

            newStatus: 'PAUSED',

            changedById: userId,

            notes: 'Job paused.',

          },

        });



        return tx.job.update({

          where: {
            id,
          },

          data: {

            status: 'PAUSED',

          },

        });


      },
    );

  }






  /**
   * Published / Paused -> Closed
   */
  async closeJob(
    userId: string,
    id: string,
  ) {


    const job =
      await this.prisma.job.findUnique({

        where: {
          id,
        },

        include: {
          employer: true,
        },

      });



    if (!job) {

      throw new NotFoundException(
        'Job posting not found.',
      );

    }



    if (job.employer.userId !== userId) {

      throw new ForbiddenException(
        'You do not have permission to close this job.',
      );

    }



    if (job.status === 'DELETED') {

      throw new BadRequestException(
        'Deleted job cannot be closed.',
      );

    }



    return this.prisma.$transaction(
      async (tx) => {


        await tx.jobStatusHistory.create({

          data: {

            jobId: id,

            oldStatus: job.status,

            newStatus: 'CLOSED',

            changedById: userId,

            notes: 'Job closed.',

          },

        });



        return tx.job.update({

          where: {
            id,
          },

          data: {

            status: 'CLOSED',

          },

        });


      },
    );

  }







  /**
   * Duplicate Job
   */
  async duplicateJob(
    userId: string,
    id: string,
  ) {


    const job =
      await this.prisma.job.findUnique({

        where: {
          id,
        },


        include: {

          employer: true,

          locations: true,

          skills: true,

          benefits: true,

        },

      });



    if (!job) {

      throw new NotFoundException(
        'Source job not found.',
      );

    }



    if (job.employer.userId !== userId) {

      throw new ForbiddenException(
        'You cannot duplicate this job.',
      );

    }



    return this.prisma.$transaction(
      async (tx) => {



        const duplicated =
          await tx.job.create({

            data: {


              title:
                `Copy of ${job.title}`,


              description:
                job.description,


              employmentType:
                job.employmentType,


              salaryMin:
                job.salaryMin,


              salaryMax:
                job.salaryMax,


              salaryVisible:
                job.salaryVisible,


              experienceYears:
                job.experienceYears,


              experienceLevel:
                job.experienceLevel,


              department:
                job.department,


              industry:
                job.industry,


              status:
                'DRAFT',


              visibility:
                'PUBLIC',


              employerId:
                job.employerId,


              organizationId:
                job.organizationId,


              categoryId:
                job.categoryId,


            },

          });





        await tx.jobStatusHistory.create({

          data: {

            jobId:
              duplicated.id,


            oldStatus:
              'NONE',


            newStatus:
              'DRAFT',


            changedById:
              userId,


            notes:
              `Duplicated from ${id}`,

          },

        });





        if (job.locations.length) {


          await tx.jobLocation.createMany({

            data:

              job.locations.map((loc) => ({

                jobId:
                  duplicated.id,


                country:
                  loc.country,


                state:
                  loc.state,


                city:
                  loc.city,


                workplaceType:
                  loc.workplaceType,


              })),


          });


        }





        if (job.skills.length) {


          await tx.jobSkill.createMany({

            data:

              job.skills.map((skill) => ({

                jobId:
                  duplicated.id,


                skillName:
                  skill.skillName,


              })),


          });


        }





        if (job.benefits.length) {


          await tx.jobBenefit.createMany({

            data:

              job.benefits.map((item) => ({

                jobId:
                  duplicated.id,


                benefitName:
                  item.benefitName,


              })),


          });


        }



        return duplicated;


      },
    );

  }








  /**
   * Save Job
   */
  async saveJob(
    userId: string,
    jobId: string,
  ) {


    const candidate =
      await this.prisma.candidate.findUnique({

        where: {
          userId,
        },

      });



    if (!candidate) {

      throw new ForbiddenException(
        'User is not registered as candidate.',
      );

    }



    const job =
      await this.prisma.job.findUnique({

        where: {
          id: jobId,
        },

      });



    if (!job || job.deletedAt) {

      throw new NotFoundException(
        'Job not found.',
      );

    }



    const existing =
      await this.prisma.savedJob.findUnique({

        where: {

          candidateId_jobId: {

            candidateId:
              candidate.id,


            jobId,

          },

        },

      });



    if (existing) {

      return {

        success: true,

        message:
          'Job already saved.',

      };

    }



    await this.prisma.savedJob.create({

      data: {

        candidateId:
          candidate.id,


        jobId,

      },

    });



    return {

      success: true,

      message:
        'Job saved successfully.',

    };

  }








  /**
   * Unsave Job
   */
  async unsaveJob(
    userId: string,
    jobId: string,
  ) {


    const candidate =
      await this.prisma.candidate.findUnique({

        where: {
          userId,
        },

      });



    if (!candidate) {

      throw new ForbiddenException(
        'User is not registered as candidate.',
      );

    }



    try {

      await this.prisma.savedJob.delete({

        where: {

          candidateId_jobId: {

            candidateId:
              candidate.id,


            jobId,

          },

        },

      });


    } catch {

      // ignore

    }



    return {

      success: true,

      message:
        'Job unsaved successfully.',

    };

  }



  async findAllJobCategory() {
    return this.prisma.jobCategory.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
      },
    });
  }




  /**
   * Candidate Saved Jobs
   */
  async getSavedJobs(
    userId: string,
  ) {


    const candidate =
      await this.prisma.candidate.findUnique({

        where: {
          userId,
        },

      });



    if (!candidate) {

      throw new ForbiddenException(
        'User is not registered as candidate.',
      );

    }




    const savedJobs =
      await this.prisma.savedJob.findMany({

        where: {

          candidateId:
            candidate.id,


          job: {

            deletedAt: null,

            status: {
              not: 'DELETED',
            },

          },

        },


        include: {

          job: {

            include: {

              organization: true,

              locations: true,

              skills: true,

              benefits: true,

            },

          },

        },


        orderBy: {

          savedAt: 'desc',

        },

      });



    return savedJobs.map(
      item => item.job,
    );

  }


}