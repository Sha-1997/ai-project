import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../shared/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CandidateLoginDto, CandidateLoginProvider } from './dto/candidate-login.dto';
import { EmployerLoginDto } from './dto/employer-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as crypto from 'crypto';
import { configuration } from '../../config/configuration';
import { OAuth2Client } from 'google-auth-library';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { AppleService } from '../apple/apple.service';
import { jwtVerify, createRemoteJWKSet } from 'jose';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    private appleService: AppleService,
  ) {}

  private readonly googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  /**
   * Register a new user with immutable Founder ID & Profile
   */
  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const email = dto.email.toLowerCase().trim();

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      await this.audit.logAction(
        null,
        'REGISTRATION_ATTEMPT_DUPLICATE_EMAIL',
        ipAddress,
        userAgent,
        `Duplicate registration attempt for email: ${email}`,
      );
      throw new ConflictException('An account with this email address already exists.');
    }

    if (dto.phoneNumber) {
      const existingPhone = await this.prisma.profile.findFirst({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existingPhone) {
        throw new ConflictException('An account with this phone number already exists.');
      }
    }

    const passwordHash = this.hashPassword(dto.password);

    const count = await this.prisma.user.count();
    const serial = String(count + 1).padStart(6, '0');
    const founderId = `JXF-2026-${serial}`;

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          founderId,
          email,
          passwordHash,
          status: 'PENDING_VERIFICATION',
        },
      });

      await tx.profile.create({
        data: {
          userId: newUser.id,
          fullName: dto.fullName,
          phoneNumber: dto.phoneNumber || null,
          country: dto.country,
          marketingConsent: dto.marketingConsent || false,
          referralCode: dto.referralCode || null,
        },
      });

      // Record first password history log entry
      await tx.passwordHistory.create({
        data: {
          userId: newUser.id,
          passwordHash,
        },
      });

      return newUser;
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.verificationToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    await this.audit.logAction(
      user.id,
      'USER_REGISTRATION',
      ipAddress,
      userAgent,
      `User registered. Founder ID: ${founderId}, Status: PENDING_VERIFICATION`,
    );

    return {
      userId: user.id,
      founderId: user.founderId,
      email: user.email,
      status: user.status,
      message: 'Account registered successfully. Verification token generated.',
    };
  }

  /**
   * Secure Login with Failed Attempts Lockout checks
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.toLowerCase().trim();

    // 1. Lockout verification check
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingSeconds = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 1000);
      throw new UnauthorizedException(
        `Account temporarily locked. Try again in ${remainingSeconds} seconds.`,
      );
    }

    // 2. Count failed attempts in the last 15 minutes
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const failedAttemptsCount = await this.prisma.loginAttempt.count({
      where: {
        email,
        status: 'FAILED',
        attemptedAt: { gte: fifteenMinsAgo },
      },
    });

    if (failedAttemptsCount >= 5) {
      const lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      if (user) {
        await this.prisma.user.update({
          where: { email },
          data: { status: 'LOCKED', lockoutUntil },
        });
      }
      throw new UnauthorizedException(
        'Too many failed login attempts. Account locked for 15 minutes.',
      );
    }

    // 3. Authenticate User
    if (!user) {
      await this.prisma.loginAttempt.create({
        data: { email, status: 'FAILED', ipAddress, userAgent },
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw new UnauthorizedException(
        'Email verification is pending. Please verify your email first.',
      );
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account has been suspended.');
    }

    // Validate hash
    const isValid = this.verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      await this.prisma.loginAttempt.create({
        data: { userId: user.id, email, status: 'FAILED', ipAddress, userAgent },
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    // 4. Reset lockouts on success
    if (user.status === 'LOCKED' || user.lockoutUntil) {
      await this.prisma.user.update({
        where: { email },
        data: { status: 'ACTIVE', lockoutUntil: null },
      });
    }

    // Parse user agent
    const { os, browser } = this.parseUserAgent(userAgent);
    const deviceName = `${browser} on ${os}`;

    // 5. Generate short-lived Access Token & rotate Refresh Token
    const payload = { sub: user.id, email: user.email, status: user.status };
    console.log('JWT SECRET GUARD:', configuration.jwt.secret);
    const accessToken = this.generateJwt(
      payload,
      configuration.jwt.secret,
      configuration.jwt.expiresIn,
    ); // 15 Minutes expiry
    const refreshToken = crypto.randomBytes(40).toString('hex');

    const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days expiry

    await this.prisma.$transaction([
      this.prisma.userSession.create({
        data: {
          userId: user.id,
          token: accessToken,
          expiresAt: accessExpires,
          deviceName,
          browser,
          os,
          ipAddress,
          userAgent,
          isActive: true,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: refreshExpires,
          isRevoked: false,
        },
      }),
      this.prisma.loginAttempt.create({
        data: {
          userId: user.id,
          email,
          status: 'SUCCESS',
          ipAddress,
          userAgent,
        },
      }),
    ]);

    await this.audit.logAction(
      user.id,
      'USER_LOGIN',
      ipAddress,
      userAgent,
      `Session established. Device: ${deviceName}`,
    );

    return {
      accessToken,
      refreshToken,
      userId: user.id,
      email: user.email,
    };
  }

  /**
   * Candidate Login
   *
   * Supports:
   * - Email OTP
   * - Mobile OTP
   * - Google OAuth
   * - Apple Sign In
   */
  async candidateLogin(dto: CandidateLoginDto, ipAddress?: string, userAgent?: string) {
    let user: any = null;

    /*
  =====================================
  ENSURE CANDIDATE DATA
  =====================================
  */

    const ensureCandidateData = async (userId: string, userData: any) => {
      /*
    Founder Id
    */

      if (!userData.founderId) {
        await this.prisma.user.update({
          where: {
            id: userId,
          },

          data: {
            founderId: await this.generateFounderId(),
          },
        });
      }

      /*
    Candidate Role
    */

      const hasCandidateRole = userData.roles.some((r) => r.role === 'CANDIDATE');

      if (!hasCandidateRole) {
        await this.prisma.userRole.create({
          data: {
            userId,

            role: 'CANDIDATE',
          },
        });
      }

      /*
    Candidate Profile
    */

      if (!userData.candidate) {
        await this.prisma.candidate.create({
          data: {
            userId,

            status: 'ACTIVE',

            visibility: 'PUBLIC',

            skills: [],
          },
        });
      }
    };

    /*
  =====================================
  GOOGLE LOGIN
  =====================================
  */

    if (dto.provider === CandidateLoginProvider.GOOGLE) {
      const googleUser = await this.verifyGoogleToken(dto.idToken);

      if (!googleUser) {
        throw new UnauthorizedException('Google login failed.');
      }

      const email = googleUser.email.toLowerCase().trim();

      /*
    Check Google Identity
    */

      const identity = await this.prisma.userIdentity.findUnique({
        where: {
          provider_providerId: {
            provider: 'GOOGLE',

            providerId: googleUser.sub,
          },
        },

        include: {
          user: {
            include: {
              roles: true,

              candidate: true,
            },
          },
        },
      });

      if (identity) {
        user = identity.user;

        await ensureCandidateData(user.id, user);
      } else {
        /*
      Check Existing Email User
      */

        user = await this.prisma.user.findUnique({
          where: {
            email,
          },

          include: {
            roles: true,

            candidate: true,
          },
        });

        if (user) {
          await ensureCandidateData(user.id, user);
        } else {
          /*
        Create New Candidate
        */

          user = await this.prisma.user.create({
            data: {
              founderId: await this.generateFounderId(),

              email,

              status: 'ACTIVE',

              profile: {
                create: {
                  fullName: googleUser.name || 'Candidate',

                  profilePhoto: googleUser.picture,
                },
              },

              candidate: {
                create: {
                  status: 'ACTIVE',

                  visibility: 'PUBLIC',

                  skills: [],
                },
              },

              roles: {
                create: {
                  role: 'CANDIDATE',
                },
              },
            },

            include: {
              roles: true,

              candidate: true,
            },
          });
        }

        /*
      Save Google Identity
      */

        await this.prisma.userIdentity.create({
          data: {
            userId: user.id,

            provider: 'GOOGLE',

            providerId: googleUser.sub,

            email,
          },
        });
      }
    } else if (dto.provider === CandidateLoginProvider.APPLE) {
      /*
  =====================================
  APPLE LOGIN
  =====================================
  */
      const appleUser = await this.verifyAppleToken(dto.idToken);

      if (!appleUser) {
        throw new UnauthorizedException('Apple login failed.');
      }

      const email = appleUser.email?.toLowerCase().trim();

      if (!email) {
        throw new UnauthorizedException('Apple email missing.');
      }

      const identity = await this.prisma.userIdentity.findUnique({
        where: {
          provider_providerId: {
            provider: 'APPLE',

            providerId: appleUser.appleId,
          },
        },

        include: {
          user: {
            include: {
              roles: true,

              candidate: true,
            },
          },
        },
      });

      if (identity) {
        user = identity.user;

        await ensureCandidateData(user.id, user);
      } else {
        user = await this.prisma.user.findUnique({
          where: {
            email,
          },

          include: {
            roles: true,

            candidate: true,
          },
        });

        if (user) {
          await ensureCandidateData(user.id, user);
        } else {
          user = await this.prisma.user.create({
            data: {
              founderId: await this.generateFounderId(),

              email,

              status: 'ACTIVE',

              profile: {
                create: {
                  fullName: 'Candidate',
                },
              },

              candidate: {
                create: {
                  status: 'ACTIVE',

                  visibility: 'PUBLIC',

                  skills: [],
                },
              },

              roles: {
                create: {
                  role: 'CANDIDATE',
                },
              },
            },

            include: {
              roles: true,

              candidate: true,
            },
          });
        }

        await this.prisma.userIdentity.create({
          data: {
            userId: user.id,

            provider: 'APPLE',

            providerId: appleUser.appleId,

            email,
          },
        });
      }
    } else {
      /*
  =====================================
  EMAIL / MOBILE OTP LOGIN
  =====================================
  */
      /*
    Verify OTP First
    */
      if (dto.provider === CandidateLoginProvider.EMAIL_OTP) {
        const valid = await this.verifyEmailOtp(dto.email, dto.otp);

        if (!valid) {
          throw new UnauthorizedException('Invalid email OTP.');
        }
      }

      if (dto.provider === CandidateLoginProvider.MOBILE_OTP) {
        const valid = await this.verifyMobileOtp(dto.mobile, dto.otp);

        if (!valid) {
          throw new UnauthorizedException('Invalid mobile OTP.');
        }
      }

      /*
    Find Existing Email User
    */

      if (dto.email) {
        user = await this.prisma.user.findUnique({
          where: {
            email: dto.email.toLowerCase().trim(),
          },

          include: {
            roles: true,

            candidate: true,
          },
        });
      }

      /*
    Find Existing Mobile User
    */

      if (!user && dto.mobile) {
        const profile = await this.prisma.profile.findFirst({
          where: {
            phoneNumber: dto.mobile,
          },

          include: {
            user: {
              include: {
                roles: true,

                candidate: true,
              },
            },
          },
        });

        user = profile?.user;
      }

      /*
    Create New Candidate User
    */

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            founderId: await this.generateFounderId(),

            email: dto.email?.toLowerCase().trim(),

            status: 'ACTIVE',

            profile: {
              create: {
                fullName: 'Candidate',
              },
            },

            candidate: {
              create: {
                status: 'ACTIVE',

                visibility: 'PUBLIC',

                skills: [],
              },
            },

            roles: {
              create: {
                role: 'CANDIDATE',
              },
            },
          },

          include: {
            roles: true,

            candidate: true,
          },
        });
      } else {
        await ensureCandidateData(user.id, user);
      }
    }
    /*
  =====================================
  RELOAD USER
  =====================================
  */

    user = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },

      include: {
        roles: true,

        candidate: true,

        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Authentication failed.');
    }

    /*
  =====================================
  JWT PAYLOAD
  =====================================
  */

    const payload = {
      sub: user.id,

      email: user.email,

      roles: user.roles.map((r) => r.role),

      portal: 'CANDIDATE',
    };

    /*
  =====================================
  ACCESS TOKEN
  =====================================
  */

    const accessToken = this.generateJwt(
      payload,
      configuration.jwt.secret,
      configuration.jwt.expiresIn,
    );

    /*
  =====================================
  REFRESH TOKEN
  =====================================
  */

    const refreshToken = crypto.randomBytes(40).toString('hex');

    /*
  =====================================
  FINAL RESPONSE
  =====================================
  */

    return {
      accessToken,

      refreshToken,

      userId: user.id,

      founderId: user.founderId,

      email: user.email,

      roles: user.roles.map((r) => r.role),

      candidate: user.candidate,

      profile: user.profile,

      portal: 'CANDIDATE',
    };
  }

  /**
   * Employer Login
   *
   * Supports:
   * - Email OTP
   * - Mobile OTP
   * - Google OAuth
   * - Apple Sign In
   */
  async employerLogin(dto: EmployerLoginDto, ipAddress?: string, userAgent?: string) {
    let user: any = null;

    /*
  =====================================
  ENSURE EMPLOYER DATA
  =====================================
  */

    const ensureEmployerData = async (userId: string, userData: any) => {
      /*
    Create FounderId
    */

      if (!userData.founderId) {
        await this.prisma.user.update({
          where: {
            id: userId,
          },

          data: {
            founderId: await this.generateFounderId(),
          },
        });
      }

      /*
    Create Employer Role
    */

      const hasEmployerRole = userData.roles.some((r) => r.role === 'EMPLOYER');

      if (!hasEmployerRole) {
        await this.prisma.userRole.create({
          data: {
            userId,

            role: 'EMPLOYER',
          },
        });
      }

      /*
    Create Employer Profile
    */

      if (!userData.employer) {
        await this.prisma.employer.create({
          data: {
            userId,

            title: 'Recruiter',

            businessEmail: userData.email,
          },
        });
      }
    };

    /*
  =====================================
  GOOGLE LOGIN
  =====================================
  */

    if (dto.provider === 'GOOGLE') {
      const googleUser = await this.verifyGoogleToken(dto.idToken);

      if (!googleUser) {
        throw new UnauthorizedException('Google login failed.');
      }

      const email = googleUser.email.toLowerCase().trim();

      /*
    Check Existing Google Identity
    */

      const identity = await this.prisma.userIdentity.findUnique({
        where: {
          provider_providerId: {
            provider: 'GOOGLE',

            providerId: googleUser.sub,
          },
        },

        include: {
          user: {
            include: {
              roles: true,

              employer: true,
            },
          },
        },
      });

      if (identity) {
        user = identity.user;

        await ensureEmployerData(user.id, user);
      } else {
        /*
      Check Same Email User
      */

        user = await this.prisma.user.findUnique({
          where: {
            email,
          },

          include: {
            roles: true,

            employer: true,
          },
        });

        if (user) {
          /*
        Existing Email/OTP User

        Add Employer
        */

          await ensureEmployerData(user.id, user);
        } else {
          /*
        Create New Employer User
        */

          user = await this.prisma.user.create({
            data: {
              founderId: await this.generateFounderId(),

              email,

              status: 'ACTIVE',

              profile: {
                create: {
                  fullName: googleUser.name || 'Recruiter',

                  profilePhoto: googleUser.picture,
                },
              },

              employer: {
                create: {
                  title: 'Recruiter',

                  businessEmail: email,
                },
              },

              roles: {
                create: {
                  role: 'EMPLOYER',
                },
              },
            },

            include: {
              roles: true,

              employer: true,
            },
          });
        }

        /*
      Save Google Identity
      */

        await this.prisma.userIdentity.create({
          data: {
            userId: user.id,

            provider: 'GOOGLE',

            providerId: googleUser.sub,

            email,
          },
        });
      }
    }
    // =====================================
    // APPLE LOGIN
    // =====================================
    else if (dto.provider === 'APPLE') {
      const appleUser = await this.verifyAppleToken(dto.idToken);

      if (!appleUser) {
        throw new UnauthorizedException('Apple login failed.');
      }

      const email = appleUser.email?.toLowerCase().trim();

      if (!email) {
        throw new UnauthorizedException('Apple email missing.');
      }

      const identity = await this.prisma.userIdentity.findUnique({
        where: {
          provider_providerId: {
            provider: 'APPLE',

            providerId: appleUser.appleId,
          },
        },

        include: {
          user: {
            include: {
              roles: true,

              employer: true,
            },
          },
        },
      });

      if (identity) {
        user = identity.user;

        await ensureEmployerData(user.id, user);
      } else {
        user = await this.prisma.user.findUnique({
          where: {
            email,
          },

          include: {
            roles: true,

            employer: true,
          },
        });

        if (user) {
          await ensureEmployerData(user.id, user);
        } else {
          user = await this.prisma.user.create({
            data: {
              founderId: await this.generateFounderId(),

              email,

              status: 'ACTIVE',

              profile: {
                create: {
                  fullName: 'Recruiter',
                },
              },

              employer: {
                create: {
                  title: 'Recruiter',

                  businessEmail: email,
                },
              },

              roles: {
                create: {
                  role: 'EMPLOYER',
                },
              },
            },

            include: {
              roles: true,

              employer: true,
            },
          });
        }

        await this.prisma.userIdentity.create({
          data: {
            userId: user.id,

            provider: 'APPLE',

            providerId: appleUser.appleId,

            email,
          },
        });
      }
    }

    // =====================================
    // EMAIL / MOBILE OTP LOGIN
    // =====================================
    else {
      /*
  Verify OTP first
  */

      if (dto.provider === 'EMAIL_OTP') {
        const valid = await this.verifyEmailOtp(dto.email, dto.otp);

        if (!valid) {
          throw new UnauthorizedException('Invalid email OTP.');
        }
      }

      if (dto.provider === 'MOBILE_OTP') {
        const valid = await this.verifyMobileOtp(dto.mobile, dto.otp);

        if (!valid) {
          throw new UnauthorizedException('Invalid mobile OTP.');
        }
      }

      /*
  Find Existing User By Email
  */

      if (dto.email) {
        user = await this.prisma.user.findUnique({
          where: {
            email: dto.email.toLowerCase().trim(),
          },

          include: {
            roles: true,

            employer: true,
          },
        });
      }

      /*
  Find Existing User By Mobile
  */

      if (!user && dto.mobile) {
        const profile = await this.prisma.profile.findFirst({
          where: {
            phoneNumber: dto.mobile,
          },

          include: {
            user: {
              include: {
                roles: true,

                employer: true,
              },
            },
          },
        });

        user = profile?.user;
      }

      /*
  Create Employer User If Not Exists
  */

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            founderId: await this.generateFounderId(),

            email: dto.email?.toLowerCase().trim(),

            status: 'ACTIVE',

            profile: {
              create: {
                fullName: 'Recruiter',
              },
            },

            employer: {
              create: {
                title: 'Recruiter',

                businessEmail: dto.email,
              },
            },

            roles: {
              create: {
                role: 'EMPLOYER',
              },
            },
          },

          include: {
            roles: true,

            employer: true,
          },
        });
      } else {
        await ensureEmployerData(user.id, user);
      }
    }
    /*
  =====================================
  RELOAD USER
  =====================================
  */

    user = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },

      include: {
        roles: true,

        employer: true,

        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Authentication failed.');
    }

    /*
  =====================================
  JWT PAYLOAD
  =====================================
  */

    const payload = {
      sub: user.id,

      email: user.email,

      roles: user.roles.map((r) => r.role),

      portal: 'EMPLOYER',
    };

    /*
  =====================================
  ACCESS TOKEN
  =====================================
  */

    const accessToken = this.generateJwt(
      payload,
      configuration.jwt.secret,
      configuration.jwt.expiresIn,
    );

    /*
  =====================================
  REFRESH TOKEN
  =====================================
  */

    const refreshToken = crypto.randomBytes(40).toString('hex');

    /*
  =====================================
  FINAL RESPONSE
  =====================================
  */

    return {
      accessToken,

      refreshToken,

      userId: user.id,

      founderId: user.founderId,

      email: user.email,

      roles: user.roles.map((r) => r.role),

      employer: user.employer,

      profile: user.profile,

      portal: 'EMPLOYER',
    };
  }
  /**
   * Log out active session
   */
  async logout(accessToken: string, ipAddress?: string, userAgent?: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { token: accessToken },
    });

    if (session) {
      await this.prisma.userSession.delete({
        where: { token: accessToken },
      });
      // Delete any associated user refresh tokens to be secure
      await this.prisma.refreshToken.deleteMany({
        where: { userId: session.userId },
      });

      await this.audit.logAction(
        session.userId,
        'USER_LOGOUT',
        ipAddress,
        userAgent,
        'Session revoked successfully.',
      );
    }

    return { success: true, message: 'Logged out successfully.' };
  }

  /**
   * Rotate Access & Refresh Tokens
   */
  async rotateTokens(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.delete({
      where: { token: dto.refreshToken },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Associated user status is inactive.');
    }

    // Generate new rotated tokens
    const payload = { sub: user.id, email: user.email, status: user.status };
    const accessToken = this.generateJwt(
      payload,
      configuration.jwt.secret,
      configuration.jwt.expiresIn,
    );
    const newRefreshToken = crypto.randomBytes(40).toString('hex');

    const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { os, browser } = this.parseUserAgent(userAgent);
    const deviceName = `${browser} on ${os}`;

    await this.prisma.$transaction([
      this.prisma.userSession.create({
        data: {
          userId: user.id,
          token: accessToken,
          expiresAt: accessExpires,
          deviceName,
          browser,
          os,
          ipAddress,
          userAgent,
          isActive: true,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt: refreshExpires,
          isRevoked: false,
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Trigger Forgot Password Token
   */
  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      // Avoid user enumeration: return success messaging anyway
      return { success: true, message: 'If the email exists, a reset link will be sent.' };
    }

    // Generate reset challenge verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Hour expiry

    await this.prisma.verificationToken.create({
      data: {
        email: user.email,
        token,
        expiresAt,
      },
    });

    await this.audit.logAction(
      user.id,
      'PASSWORD_RESET_REQUESTED',
      ipAddress,
      userAgent,
      'Password reset token generated.',
    );

    return {
      success: true,
      resetToken: token,
      message: 'Reset token generated successfully.',
    };
  }

  /**
   * Reset Password validating token expiration & Password History constraints
   */
  async resetPassword(dto: ResetPasswordDto, ipAddress?: string, userAgent?: string) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const tokenRecord = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: tokenRecord.email },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Fetch user password history (last 3 entries)
    const history = await this.prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // Check if new password matches any of last 3 password hashes
    for (const entry of history) {
      if (this.verifyPassword(dto.password, entry.passwordHash)) {
        throw new BadRequestException('You cannot reuse any of your last 3 passwords.');
      }
    }

    const newHash = this.hashPassword(dto.password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash, status: 'ACTIVE', lockoutUntil: null },
      }),
      this.prisma.passwordHistory.create({
        data: { userId: user.id, passwordHash: newHash },
      }),
      this.prisma.verificationToken.delete({
        where: { token: dto.token },
      }),
    ]);

    await this.audit.logAction(
      user.id,
      'PASSWORD_RESET_SUCCESSFUL',
      ipAddress,
      userAgent,
      'Password successfully reset via token verification.',
    );

    return { success: true, message: 'Password has been reset successfully.' };
  }

  /**
   * Securely Change Password checking old password & history logs
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New passwords do not match.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Verify current credentials
    const isOldValid = this.verifyPassword(dto.oldPassword, user.passwordHash);
    if (!isOldValid) {
      throw new BadRequestException('Incorrect current password.');
    }

    // Fetch history (last 3 entries)
    const history = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    for (const entry of history) {
      if (this.verifyPassword(dto.newPassword, entry.passwordHash)) {
        throw new BadRequestException('You cannot reuse any of your last 3 passwords.');
      }
    }

    const newHash = this.hashPassword(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.passwordHistory.create({
        data: { userId, passwordHash: newHash },
      }),
    ]);

    await this.audit.logAction(
      userId,
      'PASSWORD_CHANGED',
      ipAddress,
      userAgent,
      'User password changed successfully.',
    );

    return { success: true, message: 'Password updated successfully.' };
  }

  /**
   * Retrieve active sessions list
   */
  async getSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, expiresAt: { gte: new Date() } },
      select: {
        id: true,
        deviceName: true,
        browser: true,
        os: true,
        ipAddress: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke active session by ID
   */
  async revokeSession(sessionId: string, userId: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session record not found.');
    }

    await this.prisma.userSession.delete({
      where: { id: sessionId },
    });

    return { success: true, message: 'Session revoked successfully.' };
  }

  /**
   * Verify email via token validation
   */
  async verifyEmail(token: string, ipAddress?: string, userAgent?: string) {
    const tokenRecord = await this.prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired verification token.');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.verificationToken.delete({
        where: { token },
      });
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: tokenRecord.email },
    });

    if (!user) {
      throw new NotFoundException('User associated with this token not found.');
    }

    await this.prisma.user.update({
      where: { email: tokenRecord.email },
      data: { status: 'ACTIVE' },
    });

    await this.prisma.verificationToken.delete({
      where: { token },
    });

    await this.audit.logAction(
      user.id,
      'EMAIL_VERIFICATION_SUCCESS',
      ipAddress,
      userAgent,
      `Email ${user.email} successfully verified. Status: ACTIVE`,
    );

    return {
      success: true,
      email: user.email,
      message: 'Email verified successfully. Account is now active.',
    };
  }

  /**
   * Resend verification token
   */
  async resendVerification(email: string, ipAddress?: string, userAgent?: string) {
    const formattedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address.');
    }

    if (user.status !== 'PENDING_VERIFICATION') {
      throw new BadRequestException('This account has already been verified.');
    }

    await this.prisma.verificationToken.deleteMany({
      where: { email: formattedEmail },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.verificationToken.create({
      data: {
        email: formattedEmail,
        token,
        expiresAt,
      },
    });

    await this.audit.logAction(
      user.id,
      'VERIFICATION_EMAIL_RESENT',
      ipAddress,
      userAgent,
      `Verification token regenerated for email: ${formattedEmail}`,
    );

    return {
      success: true,
      email: formattedEmail,
      message: 'Verification token resent successfully.',
    };
  }

  // added 28/july/2026
  async sendEmailOtp(email: string, ipAddress?: string, userAgent?: string) {
    const formattedEmail = email.toLowerCase().trim();

    /*
  =====================================
  Check Existing User
  =====================================
  */

    const user = await this.prisma.user.findUnique({
      where: {
        email: formattedEmail,
      },

      include: {
        roles: true,
      },
    });

    if (user) {
      const hasCandidateRole = user.roles.some((role) => role.role === 'CANDIDATE');

      if (!hasCandidateRole) {
        throw new UnauthorizedException('This email is registered as employer account.');
      }
    }

    /*
  =====================================
  Find Existing OTP
  =====================================
  */

    const existingOtp = await this.prisma.otpVerification.findUnique({
      where: {
        identifier_type_purpose: {
          identifier: formattedEmail,

          type: 'EMAIL',

          purpose: 'LOGIN',
        },
      },
    });

    /*
  =====================================
  Resend Cooldown 60 Seconds
  =====================================
  */

    if (existingOtp) {
      const cooldown = 60 * 1000;

      const elapsed = Date.now() - existingOtp.createdAt.getTime();

      if (elapsed < cooldown) {
        const remaining = Math.ceil((cooldown - elapsed) / 1000);

        throw new UnauthorizedException(
          `Please wait ${remaining} seconds before requesting another OTP.`,
        );
      }
    }

    /*
  =====================================
  Generate OTP
  =====================================
  */

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + 60 * 1000);

    const resendAvailableAt = new Date(Date.now() + 60 * 1000);

    console.log('NEW OTP:', otp);

    console.log('NEW EXPIRY:', expiresAt);

    /*
  =====================================
  UPSERT OTP
  =====================================
  */

    const otpRecord = await this.prisma.otpVerification.upsert({
      where: {
        identifier_type_purpose: {
          identifier: formattedEmail,

          type: 'EMAIL',

          purpose: 'LOGIN',
        },
      },

      update: {
        otp,

        expiresAt,

        verified: false,

        verifiedAt: null,

        attempts: 0,

        createdAt: new Date(),
      },

      create: {
        identifier: formattedEmail,

        type: 'EMAIL',

        purpose: 'LOGIN',

        otp,

        expiresAt,

        verified: false,

        attempts: 0,
      },
    });

    console.log('UPDATED OTP RECORD:', otpRecord);

    /*
  =====================================
  Send Email
  =====================================
  */

    await this.mailService.sendOtpEmail(formattedEmail, otp);

    return {
      success: true,

      message: 'OTP sent successfullyyyyyyyyyddd',

      resendAvailableAt,

      expiresAt,
    };
  }
  /**
   * Verify Email OTP
   *
   * Flow:
   * 1. Receive email and OTP from candidate
   * 2. Fetch OTP record from Redis / Database
   * 3. Check OTP expiry time
   * 4. Compare submitted OTP with stored OTP
   * 5. Mark OTP as used after successful verification
   */
  private async verifyEmailOtp(email?: string, otp?: string) {
    if (!email || !otp) {
      return false;
    }

    const formattedEmail = email.toLowerCase().trim();

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: formattedEmail,

        type: 'EMAIL',

        purpose: 'LOGIN',
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('========== OTP VERIFY ==========');

    console.log('INPUT OTP :', otp);

    console.log('DB OTP :', record?.otp);

    console.log('CREATED AT :', record?.createdAt);

    console.log('EXPIRES AT :', record?.expiresAt);

    console.log('CURRENT TIME :', new Date());

    console.log('===============================');

    if (!record) {
      return false;
    }

    if (record.expiresAt <= new Date()) {
      console.log('OTP EXPIRED');

      return false;
    }

    if (record.otp !== otp) {
      console.log('OTP NOT MATCH');

      return false;
    }

    return true;
  }
  async sendMobileOtp(mobile: string, ipAddress?: string, userAgent?: string) {
    const formattedMobile = mobile.trim();

    // ============================
    // Check existing profile
    // ============================

    let profile = await this.prisma.profile.findFirst({
      where: {
        phoneNumber: formattedMobile,
      },

      include: {
        user: {
          include: {
            roles: true,

            candidate: true,
          },
        },
      },
    });

    let user = profile?.user;

    // ============================
    // Existing user role validation
    // ============================

    if (user) {
      const hasCandidateRole = user.roles.some((role) => role.role === 'CANDIDATE');

      if (!hasCandidateRole) {
        throw new UnauthorizedException('This mobile number is registered as employer account.');
      }
    }

    // ============================
    // Create new candidate user
    // ============================

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: null,

          status: 'ACTIVE',

          profile: {
            create: {
              phoneNumber: formattedMobile,

              fullName: 'Candidate',
            },
          },

          candidate: {
            create: {
              status: 'ACTIVE',

              visibility: 'PUBLIC',

              skills: [],
            },
          },

          roles: {
            create: {
              role: 'CANDIDATE',
            },
          },
        },

        include: {
          roles: true,

          candidate: true,
        },
      });
    }

    // ============================
    // Generate OTP
    // ============================

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // ============================
    // Store OTP
    // ============================

    await this.prisma.otpVerification.create({
      data: {
        identifier: formattedMobile,

        type: 'MOBILE',

        purpose: 'LOGIN',

        otp,

        expiresAt,
      },
    });

    // ============================
    // Audit Log
    // ============================

    await this.audit.logAction(
      user.id,

      'MOBILE_OTP_SENT',

      ipAddress,

      userAgent,

      'Candidate mobile OTP generated',
    );

    // ============================
    // Send SMS OTP
    // ============================

    await this.smsService.sendOtp(formattedMobile, otp);

    return {
      success: true,

      message: 'Mobile OTP sent successfully',
    };
  }
  /**
   * Verify Mobile OTP
   *
   * Flow:
   * 1. Receive mobile number and OTP
   * 2. Find latest OTP record
   * 3. Check expiry
   * 4. Compare OTP
   * 5. Mark OTP as verified
   */
  private async verifyMobileOtp(mobile?: string, otp?: string) {
    if (!mobile || !otp) {
      return false;
    }

    const formattedMobile = mobile.trim();

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        identifier: formattedMobile,

        type: 'MOBILE',

        purpose: 'LOGIN',

        verified: false,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!record) {
      return false;
    }

    // OTP expired

    if (record.expiresAt < new Date()) {
      return false;
    }

    // Wrong OTP

    if (record.otp !== otp) {
      await this.prisma.otpVerification.update({
        where: {
          id: record.id,
        },

        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      return false;
    }

    // OTP success

    await this.prisma.otpVerification.update({
      where: {
        id: record.id,
      },

      data: {
        verified: true,

        verifiedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Verify Google OAuth Identity Token
   *
   * Flow:
   * 1. Receive Google ID token from frontend
   * 2. Verify token signature with Google OAuth service
   * 3. Extract Google user information
   * 4. Validate email and account status
   * 5. Allow login if token is valid
   */
  private async verifyGoogleToken(token?: string) {
    if (!token) {
      return false;
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        return false;
      }

      if (!payload.email_verified) {
        return false;
      }

      return payload;
    } catch {
      return false;
    }
  }

  /**
   * Verify Apple Sign-In Identity Token
   *
   * Flow:
   * 1. Receive Apple identity token from frontend
   * 2. Validate token signature using Apple's public keys
   * 3. Extract Apple user information
   * 4. Verify email identity
   * 5. Allow login if token is valid
   */
  private async verifyAppleToken(token?: string) {
    if (!token) {
      throw new UnauthorizedException('Apple token missing');
    }

    try {
      const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

      const { payload } = await jwtVerify(token, appleJWKS, {
        issuer: 'https://appleid.apple.com',

        audience: process.env.APPLE_CLIENT_ID,
      });

      return {
        appleId: payload.sub as string,

        email: payload.email as string,

        name: payload.name as string | undefined,
      };
    } catch (error) {
      console.error('Apple token verification failed:', error);

      throw new UnauthorizedException('Invalid Apple token');
    }
  }

  async appleLogin(idToken: string) {
    const appleUser = await this.appleService.verifyToken(idToken);

    let identity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerId: {
          provider: 'APPLE',

          providerId: appleUser.appleId,
        },
      },
    });

    let user;

    if (identity) {
      user = await this.prisma.user.findUnique({
        where: {
          id: identity.userId,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email: appleUser.email,

          status: 'ACTIVE',

          UserIdentity: {
            create: {
              provider: 'APPLE',

              providerId: appleUser.appleId,

              email: appleUser.email,
            },
          },
        },
      });
    }

    return user;
  }

  // --- CRYPTOGRAPHY HELPERS ---

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return verifyHash === hash;
  }

  private generateJwt(payload: any, secret: string, expiresIn: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    let expSecs = 900; // 15m default
    if (expiresIn === '15m') expSecs = 15 * 60;
    else if (expiresIn === '7d') expSecs = 7 * 24 * 60 * 60;

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expSecs;
    const payloadWithTimes = { ...payload, iat, exp };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payloadWithTimes)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  private parseUserAgent(ua?: string) {
    if (!ua) return { os: 'Unknown OS', browser: 'Unknown Browser' };
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    const lowercaseUa = ua.toLowerCase();

    // OS checks
    if (lowercaseUa.includes('windows')) os = 'Windows';
    else if (lowercaseUa.includes('macintosh') || lowercaseUa.includes('mac os')) os = 'macOS';
    else if (lowercaseUa.includes('android')) os = 'Android';
    else if (lowercaseUa.includes('iphone') || lowercaseUa.includes('ipad')) os = 'iOS';
    else if (lowercaseUa.includes('linux')) os = 'Linux';

    // Browser checks
    if (lowercaseUa.includes('edg')) browser = 'Microsoft Edge';
    else if (lowercaseUa.includes('chrome') && !lowercaseUa.includes('chromium'))
      browser = 'Google Chrome';
    else if (lowercaseUa.includes('safari') && !lowercaseUa.includes('chrome')) browser = 'Safari';
    else if (lowercaseUa.includes('firefox')) browser = 'Mozilla Firefox';
    else if (lowercaseUa.includes('trident') || lowercaseUa.includes('msie'))
      browser = 'Internet Explorer';

    return { os, browser };
  }

  /**
   * Generate Founder ID
   *
   * Format:
   * JXF-2026-000001
   */
  private async generateFounderId(): Promise<string> {
    const year = new Date().getFullYear();

    const lastUser = await this.prisma.user.findFirst({
      where: {
        founderId: {
          not: null,
        },
      },

      orderBy: {
        createdAt: 'desc',
      },

      select: {
        founderId: true,
      },
    });

    let nextNumber = 1;

    if (lastUser?.founderId) {
      const parts = lastUser.founderId.split('-');

      const lastNumber = Number(parts[2]);

      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `JXF-${year}-${String(nextNumber).padStart(6, '0')}`;
  }
}
