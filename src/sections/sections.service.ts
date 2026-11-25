import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Section, SectionStatus } from './entities/section.entity.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section)
    private readonly sectionRepo: Repository<Section>,
  ) {}

  async create(classId: string, dto: CreateSectionDto): Promise<Section> {
    const trimmedName = dto.name.trim().toUpperCase();

    // Check duplicate section name inside same class
    const existing = await this.sectionRepo
      .createQueryBuilder('section')
      .where('section.class_id = :classId', { classId })
      .andWhere('LOWER(section.name) = LOWER(:name)', { name: trimmedName })
      .getOne();

    if (existing) {
      throw new ConflictException(
        `Section '${trimmedName}' already exists in this class.`,
      );
    }

    const section = this.sectionRepo.create({
      class_id: classId,
      name: trimmedName,
      room_number: dto.room_number?.trim() || null,
      capacity: dto.capacity ?? 40,
      status: dto.status ?? SectionStatus.ACTIVE,
    });

    return await this.sectionRepo.save(section);
  }

  async findAll(query?: { classId?: string; status?: string }) {
    const qb = this.sectionRepo
      .createQueryBuilder('section')
      .leftJoinAndSelect('section.class', 'class')
      .orderBy('section.name', 'ASC');

    if (query?.classId) {
      qb.andWhere('section.class_id = :classId', { classId: query.classId });
    }

    if (query?.status && query.status !== 'all') {
      qb.andWhere('section.status = :status', {
        status: query.status.toLowerCase(),
      });
    }

    return await qb.getMany();
  }

  async findByClass(classId: string): Promise<Section[]> {
    return await this.sectionRepo.find({
      where: { class_id: classId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Section> {
    const section = await this.sectionRepo.findOne({
      where: { id },
      relations: { class: true },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID '${id}' not found.`);
    }

    return section;
  }

  async update(id: string, dto: UpdateSectionDto): Promise<Section> {
    const section = await this.findOne(id);

    if (dto.name) {
      const trimmedName = dto.name.trim().toUpperCase();
      if (trimmedName.toLowerCase() !== section.name.toLowerCase()) {
        const existing = await this.sectionRepo
          .createQueryBuilder('s')
          .where('s.class_id = :classId', { classId: section.class_id })
          .andWhere('LOWER(s.name) = LOWER(:name)', { name: trimmedName })
          .andWhere('s.id != :id', { id })
          .getOne();

        if (existing) {
          throw new ConflictException(
            `Section '${trimmedName}' already exists in this class.`,
          );
        }
        section.name = trimmedName;
      }
    }

    if (dto.room_number !== undefined)
      section.room_number = dto.room_number?.trim() || null;
    if (dto.capacity !== undefined) section.capacity = dto.capacity;
    if (dto.status !== undefined) section.status = dto.status;

    return await this.sectionRepo.save(section);
  }

  async toggleStatus(id: string, status?: SectionStatus): Promise<Section> {
    const section = await this.findOne(id);
    section.status =
      status ??
      (section.status === SectionStatus.ACTIVE
        ? SectionStatus.INACTIVE
        : SectionStatus.ACTIVE);
    return await this.sectionRepo.save(section);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const section = await this.findOne(id);

    // Note: When student table is ready, checking student dependency will also take place here.

    await this.sectionRepo.remove(section);
    return {
      success: true,
      message: `Section '${section.name}' deleted successfully.`,
    };
  }

  async count(): Promise<number> {
    return await this.sectionRepo.count();
  }
}
