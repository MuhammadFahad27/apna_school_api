import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Al Harmain School System API - Principal: Sir Haroon';
  }
}
