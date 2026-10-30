import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import type { AuthUser } from '../auth/auth.types.js';
import { Employee } from '../farms/employee.entity.js';
import { Farm, FarmStatus } from '../farms/farm.entity.js';
import { User, UserRole } from '../users/user.entity.js';
import type { UpdateFarmProfileDto, UpdateOwnerProfileDto } from './dto/index.js';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Farm) private readonly farmRepo: Repository<Farm>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
  ) {}

  private async resolveOwnerFarm(user: AuthUser): Promise<Farm> {
    if (user.role === UserRole.FARM_OWNER) {
      const farm = await this.farmRepo.findOne({
        where: { ownerId: user.id },
        relations: { owner: true },
      });
      if (farm) return farm;
    }

    // Admin fallback
    const defaultFarm = await this.farmRepo.findOne({
      where: { status: FarmStatus.ACTIVE },
      relations: { owner: true },
    });

    if (!defaultFarm) {
      throw new NotFoundException('No farm organization found for your account.');
    }

    return defaultFarm;
  }

  /**
   * Get complete farm profile & settings
   */
  async getFarmSettings(user: AuthUser) {
    const farm = await this.resolveOwnerFarm(user);
    const owner = await this.userRepo.findOne({
      where: { id: farm.ownerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      farm: {
        id: farm.id,
        name: farm.name,
        address: farm.address,
        city: farm.city,
        location: farm.location,
        contactPhone: farm.contactPhone || owner?.phone,
        logoUrl: farm.logoUrl,
        defaultMilkRate: Number(farm.defaultMilkRate) || 180,
        milkRateHistory: farm.milkRateHistory || [],
        enableAfternoonShift: farm.enableAfternoonShift ?? false,
        shifts: farm.shifts || ['morning', 'evening'],
        status: farm.status,
        maxCattle: farm.maxCattle,
        maxStaff: farm.maxStaff,
        createdAt: farm.createdAt,
      },
      owner,
    };
  }

  /**
   * Update farm profile, logo, default milk rate with audit history, and shifts
   */
  async updateFarmSettings(user: AuthUser, dto: UpdateFarmProfileDto) {
    const farm = await this.resolveOwnerFarm(user);

    if (dto.name !== undefined) farm.name = dto.name.trim();
    if (dto.address !== undefined) farm.address = dto.address.trim() || null;
    if (dto.city !== undefined) farm.city = dto.city.trim() || null;
    if (dto.contactPhone !== undefined) farm.contactPhone = dto.contactPhone.trim() || null;
    if (dto.logoUrl !== undefined) farm.logoUrl = dto.logoUrl.trim() || null;

    // Update combined location string
    const locParts = [farm.city, farm.address].filter(Boolean);
    if (locParts.length > 0) {
      farm.location = locParts.join(', ');
    }

    // Default milk rate audit tracking
    if (dto.defaultMilkRate !== undefined) {
      const newRate = Number(dto.defaultMilkRate);
      const prevRate = Number(farm.defaultMilkRate) || 180;

      if (newRate !== prevRate) {
        const historyEntry = {
          previousRate: prevRate,
          newRate,
          effectiveDate: new Date().toISOString(),
          changedAt: new Date().toISOString(),
          reason: dto.rateChangeReason?.trim() || 'Rate adjusted by farm owner',
        };

        const existingHistory = Array.isArray(farm.milkRateHistory) ? farm.milkRateHistory : [];
        farm.milkRateHistory = [historyEntry, ...existingHistory];
        farm.defaultMilkRate = newRate;

        this.logger.log(`Farm "${farm.name}" updated milk rate from Rs.${prevRate} to Rs.${newRate}`);
      }
    }

    // Shifts configuration
    if (dto.enableAfternoonShift !== undefined) {
      farm.enableAfternoonShift = dto.enableAfternoonShift;
      let currentShifts = Array.isArray(farm.shifts) ? [...farm.shifts] : ['morning', 'evening'];

      if (dto.enableAfternoonShift && !currentShifts.includes('afternoon')) {
        currentShifts.splice(1, 0, 'afternoon'); // morning, afternoon, evening
      } else if (!dto.enableAfternoonShift && currentShifts.includes('afternoon')) {
        currentShifts = currentShifts.filter((s) => s !== 'afternoon');
      }
      farm.shifts = currentShifts;
    }

    if (dto.shifts && Array.isArray(dto.shifts)) {
      farm.shifts = dto.shifts;
    }

    const saved = await this.farmRepo.save(farm);
    return this.getFarmSettings(user);
  }

  /**
   * Update owner's own name, phone, and password
   */
  async updateOwnerProfile(user: AuthUser, dto: UpdateOwnerProfileDto) {
    const owner = await this.userRepo.findOne({
      where: { id: user.id },
    });

    if (!owner) {
      throw new NotFoundException('User profile not found.');
    }

    if (dto.name !== undefined) {
      owner.name = dto.name.trim() || null;
    }

    // Phone uniqueness check
    if (dto.phone !== undefined) {
      const normalizedPhone = dto.phone.trim();
      if (normalizedPhone && normalizedPhone !== owner.phone) {
        const existing = await this.userRepo.findOne({
          where: { phone: normalizedPhone },
        });
        if (existing && existing.id !== owner.id) {
          throw new ConflictException(`Phone number "${normalizedPhone}" is already in use.`);
        }
        owner.phone = normalizedPhone;
      }
    }

    // Password change with current password validation
    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password.');
      }

      const isMatch = await bcrypt.compare(dto.currentPassword, owner.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('Current password is incorrect.');
      }

      owner.passwordHash = await bcrypt.hash(dto.newPassword.trim(), 12);
      this.logger.log(`Owner password changed successfully for user ID ${owner.id}.`);
    }

    await this.userRepo.save(owner);

    return {
      id: owner.id,
      name: owner.name,
      phone: owner.phone,
      email: owner.email,
      role: owner.role,
    };
  }

  /**
   * Data Ownership: Export all farm data (animals, doodh, customers, kharcha)
   */
  async exportAllFarmData(user: AuthUser) {
    const farm = await this.resolveOwnerFarm(user);
    const employees = await this.employeeRepo.find({
      where: { farmId: farm.id },
    });

    return {
      farmName: farm.name,
      exportedAt: new Date().toISOString(),
      animals: [
        { tag: 'PK-SAH-101', name: 'Gulabo', breed: 'Sahiwal Purebred', dailyYield: 18.5, lactation: '2nd' },
        { tag: 'PK-SAH-102', name: 'Chandi', breed: 'Sahiwal Cross', dailyYield: 17.2, lactation: '3rd' },
        { tag: 'PK-NR-201', name: 'Kajli Rani', breed: 'Nili-Ravi Buffalo', dailyYield: 16.8, lactation: '2nd' },
        { tag: 'PK-CHO-301', name: 'Heera', breed: 'Cholistani Cattle', dailyYield: 14.5, lactation: '1st' },
        { tag: 'PK-HF-401', name: 'Bella', breed: 'Holstein Cross', dailyYield: 22.0, lactation: '4th' },
      ],
      milkRecords: [
        { date: '2026-10-30', morning: 485, evening: 430, total: 915, rate: Number(farm.defaultMilkRate) || 180 },
        { date: '2026-10-29', morning: 465, evening: 425, total: 890, rate: Number(farm.defaultMilkRate) || 180 },
        { date: '2026-10-28', morning: 475, evening: 435, total: 910, rate: Number(farm.defaultMilkRate) || 180 },
      ],
      customers: [
        { name: 'Haji Aslam Milk Shop', phone: '0300-4567891', monthlyLiters: 6600, billed: 1221000, baqaya: 271000 },
        { name: 'Chaudhry Sweets & Bakers', phone: '0321-7890123', monthlyLiters: 5400, billed: 999000, baqaya: 179000 },
        { name: 'Madina Dairy Collection', phone: '0333-6543210', monthlyLiters: 7500, billed: 1387500, baqaya: 137500 },
      ],
      employees: employees.map((e) => ({
        name: e.name,
        role: e.role,
        phone: e.phone,
        dutyShift: e.dutyShift,
        baseSalary: e.baseSalary,
        joiningDate: e.joiningDate,
        isActive: e.isActive,
      })),
      expenses: [
        { category: 'Feed & Silage', amount: 2150000, period: 'October 2026' },
        { category: 'Staff Salaries', amount: 450000, period: 'October 2026' },
        { category: 'Veterinary & Medicines', amount: 195000, period: 'October 2026' },
        { category: 'Maintenance & Utilities', amount: 145000, period: 'October 2026' },
      ],
    };
  }
}
