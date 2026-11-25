import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class, ClassStatus } from './entities/class.entity.js';
import { Section, SectionStatus } from '../sections/entities/section.entity.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { UpdateClassDto } from './dto/update-class.dto.js';
import { QueryClassesDto } from './dto/query-classes.dto.js';
import { CreateSectionDto } from '../sections/dto/create-section.dto.js';
import { UpdateSectionDto } from '../sections/dto/update-section.dto.js';
import { SectionsService } from '../sections/sections.service.js';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    private readonly sectionsService: SectionsService,
  ) {}

  private async generateClassCode(): Promise<string> {
    const count = await this.classRepo.count();
    let code = `CLS_${String(count + 1).padStart(3, '0')}`;
    let offset = 1;
    while (await this.classRepo.findOne({ where: { code } })) {
      code = `CLS_${String(count + 1 + offset).padStart(3, '0')}`;
      offset++;
    }
    return code;
  }

  // ---------------- CLASS OPERATIONS ----------------

  async createClass(dto: CreateClassDto): Promise<Class> {
    const trimmedName = dto.name.trim();
    let code = dto.code?.trim().toUpperCase();

    if (!code) {
      code = await this.generateClassCode();
    } else {
      const existing = await this.classRepo.findOne({
        where: { code },
      });
      if (existing) {
        throw new ConflictException(
          `Class with code '${code}' already exists.`,
        );
      }
    }

    const newClass = this.classRepo.create({
      name: trimmedName,
      code,
      description: dto.description?.trim() || null,
      display_order: dto.display_order ?? 0,
      status: dto.status ?? ClassStatus.ACTIVE,
    });

    const savedClass = await this.classRepo.save(newClass);

    // If initial sections were passed within the Create Class form
    if (dto.sections && dto.sections.length > 0) {
      for (const sec of dto.sections) {
        if (sec.name?.trim()) {
          await this.sectionsService.create(savedClass.id, {
            name: sec.name.trim().toUpperCase(),
            room_number: sec.room_number?.trim() || undefined,
            capacity: sec.capacity ?? 40,
            status: SectionStatus.ACTIVE,
          });
        }
      }
    }

    return await this.findOneClass(savedClass.id);
  }

  async findAllClasses(query: QueryClassesDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const queryBuilder = this.classRepo
      .createQueryBuilder('cls')
      .leftJoinAndSelect('cls.sections', 'section')
      .orderBy('cls.display_order', 'ASC')
      .addOrderBy('cls.name', 'ASC')
      .addOrderBy('section.name', 'ASC');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      queryBuilder.andWhere(
        '(cls.name ILIKE :search OR cls.code ILIKE :search)',
        { search },
      );
    }

    if (query.status && query.status !== 'all') {
      queryBuilder.andWhere('cls.status = :status', {
        status: query.status.toLowerCase(),
      });
    }

    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneClass(id: string): Promise<Class> {
    const cls = await this.classRepo.findOne({
      where: { id },
      relations: { sections: true },
      order: {
        sections: {
          name: 'ASC',
        },
      },
    });

    if (!cls) {
      throw new NotFoundException(`Class with ID '${id}' not found.`);
    }

    return cls;
  }

  async updateClass(id: string, dto: UpdateClassDto): Promise<Class> {
    const cls = await this.findOneClass(id);

    if (dto.code && dto.code.trim().toUpperCase() !== cls.code) {
      const existing = await this.classRepo.findOne({
        where: { code: dto.code.trim().toUpperCase() },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Class with code '${dto.code.trim().toUpperCase()}' already exists.`,
        );
      }
      cls.code = dto.code.trim().toUpperCase();
    }

    if (dto.name !== undefined) cls.name = dto.name.trim();
    if (dto.description !== undefined)
      cls.description = dto.description?.trim() || null;
    if (dto.display_order !== undefined) cls.display_order = dto.display_order;
    if (dto.status !== undefined) cls.status = dto.status;

    await this.classRepo.save(cls);

    // Sync sections if provided
    if (dto.sections !== undefined) {
      const existingSections = await this.sectionsService.findByClass(cls.id);
      const incomingNames = new Set(
        dto.sections.map((s) => s.name.trim().toUpperCase()),
      );

      // Remove sections no longer in incoming list
      for (const ex of existingSections) {
        if (!incomingNames.has(ex.name)) {
          await this.sectionsService.remove(ex.id);
        }
      }

      // Add or update
      for (const sec of dto.sections) {
        const trimmedName = sec.name.trim().toUpperCase();
        const existing = existingSections.find((e) => e.name === trimmedName);
        if (existing) {
          await this.sectionsService.update(existing.id, {
            name: trimmedName,
            room_number: sec.room_number?.trim() || undefined,
            capacity: sec.capacity ?? 40,
          });
        } else {
          await this.sectionsService.create(cls.id, {
            name: trimmedName,
            room_number: sec.room_number?.trim() || undefined,
            capacity: sec.capacity ?? 40,
            status: SectionStatus.ACTIVE,
          });
        }
      }
    }

    return await this.findOneClass(id);
  }

  async toggleClassStatus(id: string, status?: ClassStatus): Promise<Class> {
    const cls = await this.findOneClass(id);
    cls.status =
      status ??
      (cls.status === ClassStatus.ACTIVE
        ? ClassStatus.INACTIVE
        : ClassStatus.ACTIVE);
    return await this.classRepo.save(cls);
  }

  async removeClass(
    id: string,
    permanent: boolean = false,
  ): Promise<{ success: boolean; message: string; softDeleted: boolean }> {
    const cls = await this.findOneClass(id);

    if (permanent) {
      if (cls.sections && cls.sections.length > 0) {
        throw new BadRequestException(
          `Cannot permanently delete class '${cls.name}' because it contains ${cls.sections.length} section(s).`,
        );
      }
      await this.classRepo.remove(cls);
      return {
        success: true,
        message: `Class '${cls.name}' permanently deleted.`,
        softDeleted: false,
      };
    }

    // Soft delete: move to inactive so it shows up in "Inactive" filter and can be reactivated
    cls.status = ClassStatus.INACTIVE;
    await this.classRepo.save(cls);
    return {
      success: true,
      message: `Class '${cls.name}' moved to Inactive records.`,
      softDeleted: true,
    };
  }

  async getStats() {
    const [totalClasses, activeClasses, inactiveClasses, totalSections] =
      await Promise.all([
        this.classRepo.count(),
        this.classRepo.count({ where: { status: ClassStatus.ACTIVE } }),
        this.classRepo.count({ where: { status: ClassStatus.INACTIVE } }),
        this.sectionsService.count(),
      ]);

    return {
      totalClasses,
      activeClasses,
      inactiveClasses,
      totalSections,
    };
  }

  // ---------------- SECTION OPERATIONS (DELEGATED TO SECTIONSSERVICE) ----------------

  async createSection(
    classId: string,
    dto: CreateSectionDto,
  ): Promise<Section> {
    const cls = await this.classRepo.findOne({ where: { id: classId } });
    if (!cls) {
      throw new NotFoundException(`Class with ID '${classId}' not found.`);
    }

    return await this.sectionsService.create(classId, dto);
  }

  async findSectionsByClass(classId: string): Promise<Section[]> {
    return await this.sectionsService.findByClass(classId);
  }

  async findOneSection(id: string): Promise<Section> {
    return await this.sectionsService.findOne(id);
  }

  async updateSection(id: string, dto: UpdateSectionDto): Promise<Section> {
    return await this.sectionsService.update(id, dto);
  }

  async toggleSectionStatus(
    id: string,
    status?: SectionStatus,
  ): Promise<Section> {
    return await this.sectionsService.toggleStatus(id, status);
  }

  async removeSection(id: string): Promise<{ success: boolean; message: string }> {
    return await this.sectionsService.remove(id);
  }
}
