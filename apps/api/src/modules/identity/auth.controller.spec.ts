import 'reflect-metadata';

import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import {
  CandidateLoginProvider,
} from './dto/candidate-login.dto';



describe('AuthController', () => {

  let controller: AuthController;

  let mockAuthService: any;



  beforeEach(async () => {


    mockAuthService = {


      register: jest.fn().mockResolvedValue({

        userId: 'user-uuid',

        founderId: 'JXF-2026-000001',

        email: 'test@jovianex.com',

        status: 'PENDING_VERIFICATION',

        message: 'Account registered successfully.',

      }),



      login: jest.fn().mockResolvedValue({

        success: true,

        accessToken: 'jwt-access-token',

      }),



      candidateLogin: jest.fn().mockResolvedValue({

        success: true,

        accessToken: 'candidate-jwt-access-token',

        refreshToken: 'candidate-refresh-token',

        userId: 'candidate-user-id',

        email: 'candidate@jovianex.com',

      }),



      logout: jest.fn().mockResolvedValue({

        success: true,

        message: 'User logged out',

      }),



      rotateTokens: jest.fn().mockResolvedValue({

        success: true,

        accessToken: 'new-jwt-access-token',

      }),



      verifyEmail: jest.fn().mockResolvedValue({

        success: true,

      }),



      resendVerification: jest.fn().mockResolvedValue({

        success: true,

      }),



      forgotPassword: jest.fn().mockResolvedValue({

        success: true,

      }),



      resetPassword: jest.fn().mockResolvedValue({

        success: true,

      }),



      changePassword: jest.fn().mockResolvedValue({

        success: true,

      }),



      getSessions: jest.fn().mockResolvedValue([]),



      revokeSession: jest.fn().mockResolvedValue({

        success: true,

      }),



    };




    const module: TestingModule =
      await Test.createTestingModule({

        controllers: [
          AuthController,
        ],


        providers: [

          {

            provide: AuthService,

            useValue: mockAuthService,

          },

        ],


      }).compile();




    controller =
      module.get<AuthController>(
        AuthController
      );


  });






  it('should be defined', () => {

    expect(controller)
      .toBeDefined();

  });







  it('should call register service logic correctly', async () => {


    const dto = {


      fullName: 'User Name',

      email: 'test@jovianex.com',

      country: 'India',

      password: 'password123',

      confirmPassword: 'password123',


    };



    const req = {

      ip:'127.0.0.1',

      headers:{

        'user-agent':'Mozilla',

      },

    } as any;




    const res =
      await controller.register(
        dto,
        req
      );



    expect(
      mockAuthService.register
    )
    .toHaveBeenCalledWith(

      dto,

      '127.0.0.1',

      'Mozilla'

    );



    expect(res.userId)
      .toBe('user-uuid');



    expect(res.founderId)
      .toBe('JXF-2026-000001');

  });







  it('should call login service logic correctly', async () => {


    const dto = {

      email:'test@jovianex.com',

      password:'password123',

    };



    const req = {

      ip:'127.0.0.1',

      headers:{

        'user-agent':'Mozilla',

      },

    } as any;





    const res =
      await controller.login(
        dto,
        req
      );





    expect(
      mockAuthService.login
    )
    .toHaveBeenCalledWith(

      dto,

      '127.0.0.1',

      'Mozilla'

    );




    expect(res.accessToken)
      .toBe('jwt-access-token');

  });










  it('should call candidate login service logic correctly', async () => {



    const dto = {


      email:'candidate@jovianex.com',


      otp:'123456',


      provider:
        CandidateLoginProvider.EMAIL_OTP,


    };




    const req = {


      ip:'127.0.0.1',


      headers:{


        'user-agent':'Mozilla',


      },


    } as any;





    const res =
      await controller.candidateLogin(
        dto,
        req
      );





    expect(
      mockAuthService.candidateLogin
    )
    .toHaveBeenCalledWith(

      dto,

      '127.0.0.1',

      'Mozilla'

    );





    expect(res.accessToken)
      .toBe(
        'candidate-jwt-access-token'
      );


  });









  it('should call logout service logic correctly', async () => {


    const expressReq = {


      ip:'127.0.0.1',


      headers:{


        authorization:
          'Bearer some-access-token',


        'user-agent':
          'Mozilla',


      },


    } as any;





    const res =
      await controller.logout(
        {},
        expressReq
      );





    expect(
      mockAuthService.logout
    )
    .toHaveBeenCalledWith(


      'some-access-token',


      '127.0.0.1',


      'Mozilla'


    );





    expect(res.success)
      .toBe(true);


  });



});