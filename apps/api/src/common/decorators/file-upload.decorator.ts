import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Decorator pour upload de fichier unique
 * 
 * @param fieldName - Nom du champ dans le formulaire
 * @param options - Options Multer
 */
export function FileUpload(
  fieldName: string = 'file',
  options?: MulterOptions,
) {
  return applyDecorators(UseInterceptors(FileInterceptor(fieldName, options)));
}

/**
 * Decorator pour upload de fichiers multiples
 * 
 * @param fieldName - Nom du champ dans le formulaire
 * @param maxCount - Nombre maximum de fichiers
 * @param options - Options Multer
 */
export function FilesUpload(
  fieldName: string = 'files',
  maxCount: number = 10,
  options?: MulterOptions,
) {
  return applyDecorators(
    UseInterceptors(FilesInterceptor(fieldName, maxCount, options)),
  );
}
