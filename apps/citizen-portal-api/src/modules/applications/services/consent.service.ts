import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  type Database,
  documentReferences,
  documentVersions,
  documents,
  serviceAgreementConsents,
  workspaceDefaultAgreements,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, desc, eq } from 'drizzle-orm';
import type { ConsentDecision, ServiceAgreementConsentItem } from '../dtos/consent.dtos';

const AGREEMENT_KIND = 'service-agreement';

/**
 * Citizen consent (Wave 3): the single resolver both the surface and submit enforcement use, so
 * they never disagree. Everything keys on each agreement's CURRENTLY-published version, so a newly
 * published agreement version has no consent row → the citizen is re-prompted (feature 88).
 */
@Injectable()
export class ConsentService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** The agreements a service requires + the caller's decisions (for the pre-application gate). */
  async agreementsForService(
    userId: string,
    serviceId: string,
  ): Promise<ServiceAgreementConsentItem[]> {
    const svc = await this.db
      .select({ versionId: documentVersions.id })
      .from(documents)
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, documents.id),
          eq(documentVersions.status, 'published'),
        ),
      )
      .where(and(eq(documents.id, serviceId), eq(documents.kind, 'service')))
      .limit(1);
    const published = svc[0];
    if (published === undefined) {
      throw new NotFoundException('Service not found');
    }
    return this.resolveForServiceVersion(userId, published.versionId);
  }

  /** Record an approve/reject decision on a published agreement version (append-only). */
  async record(
    userId: string,
    agreementVersionId: string,
    decision: ConsentDecision,
  ): Promise<{ agreementVersionId: string; decision: ConsentDecision }> {
    const rows = await this.db
      .select({ agreementDocumentId: documentVersions.documentId })
      .from(documentVersions)
      .innerJoin(documents, eq(documents.id, documentVersions.documentId))
      .where(
        and(
          eq(documentVersions.id, agreementVersionId),
          eq(documentVersions.status, 'published'),
          eq(documents.kind, AGREEMENT_KIND),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new UnprocessableEntityException('Not a published service agreement version');
    }
    // Append-only, latest-wins: skip the write when the citizen's latest decision on this
    // (user, agreement document + version) is already the same — the audit records only real changes.
    const latest = await this.db
      .select({ decision: serviceAgreementConsents.decision })
      .from(serviceAgreementConsents)
      .where(
        and(
          eq(serviceAgreementConsents.userId, userId),
          eq(serviceAgreementConsents.agreementVersionId, agreementVersionId),
        ),
      )
      .orderBy(desc(serviceAgreementConsents.createdAt))
      .limit(1);
    if (latest[0]?.decision === decision) {
      return { agreementVersionId, decision };
    }
    await this.db.insert(serviceAgreementConsents).values({
      userId,
      agreementDocumentId: row.agreementDocumentId,
      agreementVersionId,
      decision,
    });
    return { agreementVersionId, decision };
  }

  /** Gate a submission: every attached agreement must be decided on its current version, and every
   * required (isOptional=false) one must be approved. 422 otherwise. Optional may be either. */
  async assertSubmittableForForm(userId: string, formVersionId: string): Promise<void> {
    const refRows = await this.db
      .select({ serviceVersionId: documentReferences.ownerVersionId })
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.targetVersionId, formVersionId),
          eq(documentReferences.relation, 'application_form'),
        ),
      )
      .limit(1);
    const serviceVersionId = refRows[0]?.serviceVersionId;
    if (serviceVersionId === undefined) {
      return; // No service context — nothing to gate.
    }
    const items = await this.resolveForServiceVersion(userId, serviceVersionId);
    const blocking = items
      .filter((item) => {
        const optional = item.data.isOptional === true;
        if (item.decision === null) {
          return true; // Must decide on every agreement.
        }
        return !optional && item.decision !== 'approve'; // Required must be approved.
      })
      .map((item) => (typeof item.data.title === 'string' ? item.data.title : 'Service agreement'));
    if (blocking.length > 0) {
      throw new UnprocessableEntityException({
        message: 'You must respond to the service agreements before applying',
        errors: blocking,
      });
    }
  }

  /** The shared resolver: the agreements a citizen must decide for this service version — the service's
   * own attached `service_agreement` references UNION its workspace's default agreements — each to its
   * currently-published version + authored data + the caller's latest decision. Deduped by agreement
   * document (workspace defaults first), so an agreement that is both attached and defaulted shows once. */
  private async resolveForServiceVersion(
    userId: string,
    serviceVersionId: string,
  ): Promise<ServiceAgreementConsentItem[]> {
    // The service's own attached agreements' currently-published version (inner join drops those with
    // no published version). One row per agreement (unique(owner_version_id, target_document_id)).
    const attached = await this.db
      .select({
        agreementDocumentId: documentReferences.targetDocumentId,
        agreementVersionId: documentVersions.id,
        data: documentVersions.data,
      })
      .from(documentReferences)
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, documentReferences.targetDocumentId),
          eq(documentVersions.status, 'published'),
        ),
      )
      .where(
        and(
          eq(documentReferences.ownerVersionId, serviceVersionId),
          eq(documentReferences.relation, 'service_agreement'),
        ),
      );

    // The service's workspace (services are never global, so this is non-null in practice).
    const svc = await this.db
      .select({ workspaceId: documents.workspaceId })
      .from(documentVersions)
      .innerJoin(documents, eq(documents.id, documentVersions.documentId))
      .where(eq(documentVersions.id, serviceVersionId))
      .limit(1);
    const workspaceId = svc[0]?.workspaceId ?? null;

    // The workspace's default agreements (apply to every service in the workspace), current-published.
    const defaults =
      workspaceId === null
        ? []
        : await this.db
            .select({
              agreementDocumentId: workspaceDefaultAgreements.agreementDocumentId,
              agreementVersionId: documentVersions.id,
              data: documentVersions.data,
            })
            .from(workspaceDefaultAgreements)
            .innerJoin(
              documentVersions,
              and(
                eq(documentVersions.documentId, workspaceDefaultAgreements.agreementDocumentId),
                eq(documentVersions.status, 'published'),
              ),
            )
            .where(eq(workspaceDefaultAgreements.workspaceId, workspaceId));

    // Dedupe by agreement document (defaults first → an also-attached agreement lists once).
    const byDocument = new Map<string, (typeof attached)[number]>();
    for (const row of [...defaults, ...attached]) {
      if (!byDocument.has(row.agreementDocumentId)) {
        byDocument.set(row.agreementDocumentId, row);
      }
    }

    return Promise.all(
      [...byDocument.values()].map(async (row) => {
        const consent = await this.db
          .select({ decision: serviceAgreementConsents.decision })
          .from(serviceAgreementConsents)
          .where(
            and(
              eq(serviceAgreementConsents.userId, userId),
              eq(serviceAgreementConsents.agreementVersionId, row.agreementVersionId),
            ),
          )
          .orderBy(desc(serviceAgreementConsents.createdAt))
          .limit(1);
        return {
          agreementVersionId: row.agreementVersionId,
          agreementDocumentId: row.agreementDocumentId,
          data: row.data,
          decision: consent[0]?.decision ?? null,
        };
      }),
    );
  }
}
