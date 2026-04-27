import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import type { EntityRecord, PaginationMeta } from '../../../shared/types/api';

interface FindAllOptions {
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

function toApiRecord(r: {
  id: string;
  entityName: string;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}): EntityRecord {
  return {
    id: r.id,
    entityName: r.entityName,
    data: r.data as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export class EntityService {
  async findAll(
    userId: string,
    entityName: string,
    options: FindAllOptions,
  ): Promise<{ records: EntityRecord[]; meta: PaginationMeta }> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      prisma.record.findMany({
        where: { userId, entityName },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.record.count({ where: { userId, entityName } }),
    ]);

    return {
      records: records.map(toApiRecord),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(userId: string, entityName: string, id: string): Promise<EntityRecord | null> {
    const record = await prisma.record.findFirst({
      where: { id, userId, entityName },
    });
    return record ? toApiRecord(record) : null;
  }

  async create(
    userId: string,
    entityName: string,
    data: Record<string, unknown>,
  ): Promise<EntityRecord> {
    const record = await prisma.record.create({
      data: { userId, entityName, data: data as Prisma.JsonObject },
    });
    return toApiRecord(record);
  }

  async update(
    userId: string,
    entityName: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<EntityRecord | null> {
    const existing = await prisma.record.findFirst({ where: { id, userId, entityName } });
    if (!existing) return null;

    // Merge with existing data so partial updates don't wipe other fields
    const merged = { ...(existing.data as Record<string, unknown>), ...data };

    const record = await prisma.record.update({
      where: { id },
      data: { data: merged as Prisma.JsonObject },
    });
    return toApiRecord(record);
  }

  async delete(userId: string, entityName: string, id: string): Promise<boolean> {
    const existing = await prisma.record.findFirst({ where: { id, userId, entityName } });
    if (!existing) return false;
    await prisma.record.delete({ where: { id } });
    return true;
  }

  async bulkCreate(
    userId: string,
    entityName: string,
    rows: Record<string, unknown>[],
  ): Promise<{ created: number }> {
    await prisma.record.createMany({
      data: rows.map((data) => ({ userId, entityName, data: data as Prisma.JsonObject })),
    });
    return { created: rows.length };
  }
}
