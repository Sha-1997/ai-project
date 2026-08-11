import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';


@Injectable()
export class OtpService {


constructor(
 private readonly prisma:PrismaService
){}



async generate(
 identifier:string,
 type:string
){


const otp =
Math.floor(
100000 +
Math.random()*900000
).toString();



await this.prisma.otpVerification.deleteMany({

where:{
 identifier,
 type
}

});



await this.prisma.otpVerification.create({

data:{

identifier,

type,

otp,

expiresAt:
new Date(
Date.now()+5*60*1000
)

}

});



return otp;

}




async verify(
identifier:string,
otp:string
){


const record =
await this.prisma.otpVerification.findFirst({

where:{

identifier,

otp,

verified:false,

expiresAt:{
 gt:new Date()
}

}

});



if(!record){

return false;

}



await this.prisma.otpVerification.update({

where:{
id:record.id
},

data:{
verified:true
}

});


return true;


}


}