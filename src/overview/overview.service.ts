import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../farms/employee.entity.js';
import { Farm, FarmStatus } from '../farms/farm.entity.js';
import { SupportRequest, SupportStatus } from '../support/support-request.entity.js';
import { User, UserRole, UserStatus } from '../users/user.entity.js';

@Injectable()
export class OverviewService {
  private readonly logger = new Logger(OverviewService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Farm) private readonly farms: Repository<Farm>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(SupportRequest)
    private readonly supportRequests: Repository<SupportRequest>,
  ) {}

  async getPlatformOverview() {
    // 1. Total owners categorization (Active, Suspended, Archived)
    const allOwners = await this.users.find({
      where: { role: UserRole.FARM_OWNER },
      select: {
        id: true,
        isActive: true,
        status: true,
        suspensionReason: true,
      },
    });

    const totalOwners = allOwners.length;
    let activeOwners = 0;
    let suspendedOwners = 0;
    let archivedOwners = 0;

    for (const owner of allOwners) {
      if (owner.isActive && owner.status === UserStatus.ACTIVE) {
        activeOwners++;
      } else {
        const reason = (owner.suspensionReason || '').toLowerCase();
        if (reason.includes('archive')) {
          archivedOwners++;
        } else {
          suspendedOwners++;
        }
      }
    }

    // 2. Staff members metrics across all farms
    const totalStaff = await this.employees.count();
    const activeStaff = await this.employees.count({ where: { isActive: true } });
    const inactiveStaff = totalStaff - activeStaff;

    // 3. Animals count:
    // As per specification: "animal nh hain to static krlena lkn jo data hamare pass ab tk h wo fetch krlena"
    const totalAnimals = 0;

    // 4. Farms count
    const totalFarms = await this.farms.count();
    const activeFarms = await this.farms.count({ where: { status: FarmStatus.ACTIVE } });
    const inactiveFarms = totalFarms - activeFarms;

    // 5. New farms per month (last 6 months trend)
    const monthlyRaw = await this.farms
      .createQueryBuilder('farm')
      .select("TO_CHAR(farm.createdAt, 'YYYY-MM')", 'month')
      .addSelect('COUNT(farm.id)', 'count')
      .groupBy("TO_CHAR(farm.createdAt, 'YYYY-MM')")
      .orderBy("TO_CHAR(farm.createdAt, 'YYYY-MM')", 'ASC')
      .getRawMany<{ month: string; count: string }>();

    const monthlyMap: Record<string, number> = {};
    for (const row of monthlyRaw) {
      monthlyMap[row.month] = parseInt(row.count, 10) || 0;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyNewFarms: { key: string; label: string; count: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${monthNum}`;
      const label = `${monthNames[d.getMonth()]} ${year}`;
      monthlyNewFarms.push({
        key,
        label,
        count: monthlyMap[key] || 0,
      });
    }

    // 6. Support requests overview
    const totalSupport = await this.supportRequests.count();
    const openSupport = await this.supportRequests.count({ where: { status: SupportStatus.OPEN } });
    const closedSupport = await this.supportRequests.count({ where: { status: SupportStatus.CLOSED } });

    // 7. Recent 5 farms
    const recentFarms = await this.farms.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: { owner: true },
    });

    // 8. Recent 5 support requests
    const recentSupportRequests = await this.supportRequests.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: { farm: true, owner: true },
    });

    return {
      owners: {
        total: totalOwners,
        active: activeOwners,
        suspended: suspendedOwners,
        archived: archivedOwners,
      },
      staff: {
        total: totalStaff,
        active: activeStaff,
        inactive: inactiveStaff,
      },
      animals: {
        total: totalAnimals,
        isStatic: true,
        note: 'Livestock inventory module scheduled for next milestone',
      },
      farms: {
        total: totalFarms,
        active: activeFarms,
        inactive: inactiveFarms,
      },
      monthlyNewFarms,
      support: {
        total: totalSupport,
        open: openSupport,
        closed: closedSupport,
      },
      recentFarms: recentFarms.map((f) => ({
        id: f.id,
        name: f.name,
        location: f.location,
        status: f.status,
        ownerName: f.owner?.name || 'Unassigned',
        ownerPhone: f.owner?.phone,
        ownerEmail: f.owner?.email,
        createdAt: f.createdAt,
      })),
      recentSupportRequests: recentSupportRequests.map((s) => ({
        id: s.id,
        ticketNumber: s.ticketNumber,
        subject: s.subject,
        status: s.status,
        priority: s.priority,
        farmName: s.farm?.name || 'Unknown Farm',
        ownerName: s.owner?.name || 'Owner',
        createdAt: s.createdAt,
      })),
    };
  }
}
