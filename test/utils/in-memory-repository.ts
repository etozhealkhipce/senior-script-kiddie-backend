import { FindOperator, type ObjectLiteral, type Repository } from 'typeorm';

type Where<T> = Partial<Record<keyof T, unknown>>;

// Just enough of TypeORM's Repository for unit tests of the admin services.
export class InMemoryRepository<T extends ObjectLiteral> {
  readonly rows: T[] = [];

  constructor(private readonly key: keyof T) {}

  findOneBy(where: Where<T>): Promise<T | null> {
    return Promise.resolve(
      this.rows.find((row) => this.matches(row, where)) ?? null,
    );
  }

  find(): Promise<T[]> {
    return Promise.resolve([...this.rows]);
  }

  save(entity: T): Promise<T> {
    const index = this.rows.findIndex(
      (row) => row[this.key] === entity[this.key],
    );
    if (index >= 0) this.rows[index] = entity;
    else this.rows.push(entity);
    return Promise.resolve(entity);
  }

  update(where: Where<T>, patch: Partial<T>): Promise<{ affected: number }> {
    const matched = this.rows.filter((row) => this.matches(row, where));
    matched.forEach((row) => Object.assign(row, patch));
    return Promise.resolve({ affected: matched.length });
  }

  delete(where: Where<T>): Promise<{ affected: number }> {
    const kept = this.rows.filter((row) => !this.matches(row, where));
    const affected = this.rows.length - kept.length;
    this.rows.splice(0, this.rows.length, ...kept);
    return Promise.resolve({ affected });
  }

  clear(): Promise<void> {
    this.rows.splice(0);
    return Promise.resolve();
  }

  asRepository(): Repository<T> {
    return this as unknown as Repository<T>;
  }

  private matches(row: T, where: Where<T>): boolean {
    return Object.entries(where).every(([field, expected]) => {
      const actual: unknown = row[field as keyof T];
      if (expected instanceof FindOperator) {
        if (expected.type !== 'lessThan')
          throw new Error(`Unsupported operator ${expected.type}`);
        return (actual as number | Date) < (expected.value as number | Date);
      }
      return actual === expected;
    });
  }
}
