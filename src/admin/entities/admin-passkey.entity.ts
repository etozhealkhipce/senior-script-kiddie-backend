import { Column, Entity, PrimaryColumn, type ValueTransformer } from 'typeorm';

// pg returns bigint as string; WebAuthn counters are uint32, which does not fit into int4.
const bigintToNumber: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

@Entity({ name: 'admin_passkeys' })
export class AdminPasskeyEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('bytea')
  publicKey: Buffer;

  @Column('bigint', { transformer: bigintToNumber })
  counter: number;

  @Column('text', { array: true, nullable: true })
  transports: string[] | null;

  @Column('text')
  name: string;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz', { nullable: true })
  lastUsedAt: Date | null;
}
