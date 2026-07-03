import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

/**
 * Global validation pipe powered by class-validator + class-transformer.
 *
 * Automatically transforms incoming JSON bodies into DTO instances
 * and validates them against decorators defined on the DTO class.
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: unknown, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.canValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value, {
      enableImplicitConversion: true,
      exposeUnsetFields: false,
    });

    const errors: ValidationError[] = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
    });

    if (errors.length > 0) {
      const messages = this.flattenErrors(errors);
      throw new BadRequestException(messages);
    }

    return object;
  }

  private canValidate(metatype: unknown): boolean {
    const types: unknown[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private flattenErrors(
    errors: ValidationError[],
    parentKey = '',
  ): string[] {
    const messages: string[] = [];

    for (const error of errors) {
      const propertyPath = parentKey
        ? `${parentKey}.${error.property}`
        : error.property;

      if (error.constraints) {
        messages.push(
          ...Object.values(error.constraints).map(
            (msg) => `${propertyPath}: ${msg}`,
          ),
        );
      }

      if (error.children && error.children.length > 0) {
        messages.push(...this.flattenErrors(error.children, propertyPath));
      }
    }

    return messages;
  }
}
