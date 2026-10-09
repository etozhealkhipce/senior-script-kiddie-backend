import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'admin_account' })
export class AdminAccountEntity {
  @PrimaryColumn('int')
  id: number;

  @Column('text')
  passwordHash: string;

  @Column('boolean')
  mustChangePassword: boolean;

  @Column('text', { nullable: true })
  totpSecret: string | null;

  @Column('text', { nullable: true })
  pendingTotpSecret: string | null;

  @Column('integer', { nullable: true })
  totpLastStep: number | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
