import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Staff,
  StaffEmploymentStatus,
  StaffGender,
} from './entities/staff.entity.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { QueryStaffDto } from './dto/query-staff.dto.js';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
  ) {}

  private async generateStaffId(): Promise<string> {
    const count = await this.staffRepo.count();
    let staffId = `STF_${String(count + 1).padStart(3, '0')}`;
    let exists = await this.staffRepo.findOne({ where: { staff_id: staffId } });
    let offset = 1;
    while (exists) {
      staffId = `STF_${String(count + 1 + offset).padStart(3, '0')}`;
      exists = await this.staffRepo.findOne({ where: { staff_id: staffId } });
      offset++;
    }
    return staffId;
  }

  async createStaff(dto: CreateStaffDto): Promise<Staff> {
    const staffId = dto.staff_id?.trim() || (await this.generateStaffId());

    const existingStaff = await this.staffRepo.findOne({
      where: { staff_id: staffId },
    });
    if (existingStaff) {
      throw new ConflictException(`Staff ID "${staffId}" already exists.`);
    }

    const staff = this.staffRepo.create({
      ...dto,
      staff_id: staffId,
      full_name: dto.full_name.trim(),
      father_or_husband_name: dto.father_or_husband_name?.trim() || null,
      cnic_number: dto.cnic_number?.trim() || null,
      phone_number: dto.phone_number.trim(),
      role_title: dto.role_title.trim(),
      joining_date: dto.joining_date || null,
      base_salary: dto.base_salary !== undefined ? Number(dto.base_salary) : 0,
      home_address: dto.home_address?.trim() || null,
      emergency_contact_name: dto.emergency_contact_name?.trim() || null,
      emergency_contact_number: dto.emergency_contact_number?.trim() || null,
      notes: dto.notes?.trim() || null,
    });

    return this.staffRepo.save(staff);
  }

  async findAllStaff(query: QueryStaffDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const qb = this.staffRepo.createQueryBuilder('staff');

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(staff.full_name ILIKE :term OR staff.staff_id ILIKE :term OR staff.cnic_number ILIKE :term OR staff.phone_number ILIKE :term OR staff.role_title ILIKE :term OR staff.father_or_husband_name ILIKE :term)',
        { term },
      );
    }

    if (query.status && query.status !== 'all') {
      qb.andWhere('staff.employment_status = :status', {
        status: query.status,
      });
    }

    if (query.role_title && query.role_title !== 'all') {
      qb.andWhere('staff.role_title ILIKE :role_title', {
        role_title: `%${query.role_title.trim()}%`,
      });
    }

    if (query.gender && query.gender !== 'all') {
      qb.andWhere('staff.gender = :gender', { gender: query.gender });
    }

    qb.orderBy('staff.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOneStaff(id: string): Promise<Staff> {
    const staff = await this.staffRepo.findOne({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID "${id}" was not found.`);
    }

    return staff;
  }

  async updateStaff(id: string, dto: UpdateStaffDto): Promise<Staff> {
    const staff = await this.findOneStaff(id);

    if (dto.staff_id && dto.staff_id.trim() !== staff.staff_id) {
      const exists = await this.staffRepo.findOne({
        where: { staff_id: dto.staff_id.trim() },
      });
      if (exists) {
        throw new ConflictException(
          `Staff ID "${dto.staff_id}" is already used by another staff member.`,
        );
      }
      staff.staff_id = dto.staff_id.trim();
    }

    if (dto.full_name !== undefined) staff.full_name = dto.full_name.trim();
    if (dto.father_or_husband_name !== undefined) {
      staff.father_or_husband_name = dto.father_or_husband_name?.trim() || null;
    }
    if (dto.cnic_number !== undefined) {
      staff.cnic_number = dto.cnic_number?.trim() || null;
    }
    if (dto.phone_number !== undefined) staff.phone_number = dto.phone_number.trim();
    if (dto.gender !== undefined) staff.gender = dto.gender;
    if (dto.role_title !== undefined) staff.role_title = dto.role_title.trim();
    if (dto.employment_status !== undefined) staff.employment_status = dto.employment_status;
    if (dto.employment_type !== undefined) staff.employment_type = dto.employment_type;
    if (dto.joining_date !== undefined) staff.joining_date = dto.joining_date || null;
    if (dto.base_salary !== undefined) staff.base_salary = Number(dto.base_salary);
    if (dto.home_address !== undefined) staff.home_address = dto.home_address?.trim() || null;
    if (dto.emergency_contact_name !== undefined) {
      staff.emergency_contact_name = dto.emergency_contact_name?.trim() || null;
    }
    if (dto.emergency_contact_number !== undefined) {
      staff.emergency_contact_number = dto.emergency_contact_number?.trim() || null;
    }
    if (dto.notes !== undefined) staff.notes = dto.notes?.trim() || null;

    return this.staffRepo.save(staff);
  }

  async removeStaff(id: string): Promise<{ success: boolean; message: string }> {
    const staff = await this.findOneStaff(id);
    await this.staffRepo.remove(staff);
    return {
      success: true,
      message: `Staff member "${staff.full_name}" (${staff.staff_id}) deleted successfully.`,
    };
  }

  async getStats() {
    const total = await this.staffRepo.count();
    const active = await this.staffRepo.count({
      where: { employment_status: StaffEmploymentStatus.ACTIVE },
    });
    const male = await this.staffRepo.count({
      where: { gender: StaffGender.MALE },
    });
    const female = await this.staffRepo.count({
      where: { gender: StaffGender.FEMALE },
    });

    return {
      total,
      active,
      inactive: total - active,
      male,
      female,
    };
  }
}
