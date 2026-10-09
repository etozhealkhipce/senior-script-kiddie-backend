import { Column, Entity, PrimaryColumn } from 'typeorm';

export type SessionKind = 'full' | 'setup';

@Entity({ name: 'admin_sessions' })
export class AdminSessionEntity {
  @PrimaryColumn('varchar', { length: 64 })
  tokenHash: string;

  @Column('varchar', { length: 8 })
  kind: SessionKind;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  lastUsedAt: Date;

  @Column('timestamptz')
  expiresAt: Date;
}
