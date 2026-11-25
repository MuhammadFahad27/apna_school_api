import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, SubjectStatus } from './entities/subject.entity.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { UpdateSubjectDto } from './dto/update-subject.dto.js';
import { QuerySubjectsDto } from './dto/query-subjects.dto.js';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  private async generateSubjectId(): Promise<string> {
    const count = await this.subjectRepo.count();
    let subject_id = `SUB_${String(count + 1).padStart(3, '0')}`;
    let offset = 1;
    while (await this.subjectRepo.findOne({ where: { subject_id } })) {
      subject_id = `SUB_${String(count + 1 + offset).padStart(3, '0')}`;
      offset++;
    }
    return subject_id;
  }

  async create(dto: CreateSubjectDto): Promise<Subject> {
    const trimmedName = dto.name.trim();
    const trimmedCode = dto.code.trim().toUpperCase();

    const existingCode = await this.subjectRepo.findOne({
      where: { code: trimmedCode },
    });
    if (existingCode) {
      throw new ConflictException(
        `Subject with code '${trimmedCode}' already exists.`,
      );
    }

    const subject_id = await this.generateSubjectId();

    const subject = this.subjectRepo.create({
      subject_id,
      name: trimmedName,
      code: trimmedCode,
      description: dto.description?.trim() || null,
      status: dto.status ?? SubjectStatus.ACTIVE,
    });

    return await this.subjectRepo.save(subject);
  }

  async findAll(query: QuerySubjectsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.subjectRepo
      .createQueryBuilder('sub')
      .orderBy('sub.created_at', 'DESC');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(sub.name ILIKE :search OR sub.code ILIKE :search OR sub.subject_id ILIKE :search)',
        { search },
      );
    }

    if (query.status && query.status !== 'all') {
      qb.andWhere('sub.status = :status', {
        status: query.status.toLowerCase(),
      });
    }

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Subject> {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    if (!subject) {
      throw new NotFoundException(`Subject with ID '${id}' not found.`);
    }
    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const subject = await this.findOne(id);

    if (dto.code) {
      const trimmedCode = dto.code.trim().toUpperCase();
      if (trimmedCode !== subject.code) {
        const existing = await this.subjectRepo.findOne({
          where: { code: trimmedCode },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Subject with code '${trimmedCode}' already exists.`,
          );
        }
        subject.code = trimmedCode;
      }
    }

    if (dto.name !== undefined) subject.name = dto.name.trim();
    if (dto.description !== undefined)
      subject.description = dto.description?.trim() || null;
    if (dto.status !== undefined) subject.status = dto.status;

    return await this.subjectRepo.save(subject);
  }

  async toggleStatus(id: string, status?: SubjectStatus): Promise<Subject> {
    const subject = await this.findOne(id);
    subject.status =
      status ??
      (subject.status === SubjectStatus.ACTIVE
        ? SubjectStatus.INACTIVE
        : SubjectStatus.ACTIVE);
    return await this.subjectRepo.save(subject);
  }

  async remove(id: string, permanent = false): Promise<{ message: string }> {
    const subject = await this.findOne(id);
    if (permanent || subject.status === SubjectStatus.INACTIVE) {
      await this.subjectRepo.remove(subject);
      return { message: `Subject '${subject.name}' permanently deleted.` };
    } else {
      subject.status = SubjectStatus.INACTIVE;
      await this.subjectRepo.save(subject);
      return { message: `Subject '${subject.name}' marked as inactive.` };
    }
  }

  async getStats() {
    const totalSubjects = await this.subjectRepo.count();
    const activeSubjects = await this.subjectRepo.count({
      where: { status: SubjectStatus.ACTIVE },
    });
    const inactiveSubjects = totalSubjects - activeSubjects;

    return {
      totalSubjects,
      activeSubjects,
      inactiveSubjects,
    };
  }
}
