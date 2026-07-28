import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Database, documentVersions, serviceAgreementConsents } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type {
  ServiceAgreementDetail,
  ServiceAgreementListItem,
} from '../dtos/service-agreements.dtos';

const str = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const asData = (data: unknown): Record<string, unknown> =>
  typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};

/**
 * The citizen's service-agreement consent history (feature 139) — read-only over the append-only
 * `service_agreement_consents` audit. Every query is scoped to the caller and to `decision='approve'`
 * (the "agreements you accepted"); the title/content come from the CONSENTED version's `data` JSONB.
 */
@Injectable()
export class ServiceAgreementsService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Every approval event for the caller, newest first (append-only — re-approvals appear again). */
  async listMine(userId: string): Promise<ServiceAgreementListItem[]> {
    const rows = await this.db
      .select({
        id: serviceAgreementConsents.id,
        agreementDocumentId: serviceAgreementConsents.agreementDocumentId,
        data: documentVersions.data,
        createdAt: serviceAgreementConsents.createdAt,
      })
      .from(serviceAgreementConsents)
      .innerJoin(
        documentVersions,
        eq(documentVersions.id, serviceAgreementConsents.agreementVersionId),
      )
      .where(
        and(
          eq(serviceAgreementConsents.userId, userId),
          eq(serviceAgreementConsents.decision, 'approve'),
        ),
      )
      .orderBy(desc(serviceAgreementConsents.createdAt));

    return rows.map((row) => ({
      id: row.id,
      agreementDocumentId: row.agreementDocumentId,
      title: str(asData(row.data).title, 'Service agreement'),
      consentedAt: row.createdAt.toISOString(),
    }));
  }

  /** One consent event (by consent id), scoped to the caller. 404 when it's not theirs / unknown. */
  async getMine(userId: string, consentId: string): Promise<ServiceAgreementDetail> {
    // Validate before the query so a malformed id is a clean 400, not a driver 22P02 500.
    if (!z.uuid().safeParse(consentId).success) {
      throw new BadRequestException('Invalid service agreement id');
    }
    const rows = await this.db
      .select({
        id: serviceAgreementConsents.id,
        agreementDocumentId: serviceAgreementConsents.agreementDocumentId,
        decision: serviceAgreementConsents.decision,
        data: documentVersions.data,
        createdAt: serviceAgreementConsents.createdAt,
      })
      .from(serviceAgreementConsents)
      .innerJoin(
        documentVersions,
        eq(documentVersions.id, serviceAgreementConsents.agreementVersionId),
      )
      .where(
        and(
          eq(serviceAgreementConsents.id, consentId),
          eq(serviceAgreementConsents.userId, userId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Service agreement not found');
    }
    const data = asData(row.data);
    return {
      id: row.id,
      agreementDocumentId: row.agreementDocumentId,
      title: str(data.title, 'Service agreement'),
      description:
        typeof data.description === 'string' && data.description.length > 0
          ? data.description
          : null,
      content: data.content ?? null,
      decision: row.decision,
      approveLabel: str(data.approveLabel, 'I approve'),
      rejectLabel: str(data.rejectLabel, 'I do not approve'),
      consentedAt: row.createdAt.toISOString(),
    };
  }
}
