import { IsIn, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsIn(['admin', 'rrhh'])
  role: 'admin' | 'rrhh';
}
