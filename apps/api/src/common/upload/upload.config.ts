import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerConfig = {

  storage: diskStorage({

    destination: './uploads',

    filename: (req, file, callback) => {

      const uniqueName =
        Date.now() +
        '-' +
        Math.round(Math.random() * 100000);

      callback(
        null,
        uniqueName + extname(file.originalname),
      );

    },

  }),

};