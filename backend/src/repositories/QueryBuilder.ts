/**
 * Query Builder Utility
 * 
 * Helper class for building parameterized SQL queries safely.
 * Prevents SQL injection by using parameterized queries throughout.
 * Supports complex WHERE clauses, JOINs, pagination, and filtering.
 * 
 * @module src/repositories/QueryBuilder
 */

/**
 * SQL comparison operators
 */
export type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL';

/**
 * SQL logical operators
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * WHERE clause condition
 */
export interface WhereCondition {
  column: string;
  operator: ComparisonOperator;
  value?: any;
  logicalOperator?: LogicalOperator;
}

/**
 * JOIN clause definition
 */
export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  onCondition: string;
}

/**
 * Query builder for safe, parameterized SQL construction
 * 
 * @example
 * const query = new QueryBuilder('jobs')
 *   .select(['id', 'title', 'status'])
 *   .where('organization_id', '=', orgId)
 *   .where('status', '=', 'open')
 *   .where('deleted_at', 'IS NULL')
 *   .orderBy('created_at', 'DESC')
 *   .limit(20)
 *   .offset(0);
 * 
 * const { sql, values } = query.build();
 * // sql: "SELECT id, title, status FROM jobs WHERE organization_id = $1 AND status = $2 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20 OFFSET 0"
 * // values: [orgId, 'open']
 */
export class QueryBuilder {
  private table: string;
  private selectColumns: string[] = ['*'];
  private whereConditions: Array<{ column: string; operator: ComparisonOperator; value?: any; logicalOperator: LogicalOperator }> = [];
  private joins: JoinClause[] = [];
  private orderByClause: string = '';
  private limitValue?: number;
  private offsetValue?: number;
  private groupByClause: string = '';
  private havingClause: string = '';
  private parameterCount: number = 0;
  private parameters: any[] = [];

  /**
   * Constructor
   * 
   * @param table - Database table name
   */
  constructor(table: string) {
    this.table = table;
  }

  /**
   * Specifies columns to select
   * 
   * @param columns - Array of column names or single string
   * @returns this for chaining
   * 
   * @example
   * builder.select(['id', 'title', 'status']);
   * builder.select('id');
   */
  select(columns: string | string[]): QueryBuilder {
    if (typeof columns === 'string') {
      this.selectColumns = [columns];
    } else {
      this.selectColumns = columns;
    }
    return this;
  }

  /**
   * Adds a WHERE condition
   * 
   * @param column - Column name
   * @param operator - Comparison operator
   * @param value - Value to compare (omit for IS NULL / IS NOT NULL)
   * @param logicalOperator - AND or OR (defaults to AND)
   * @returns this for chaining
   * 
   * @example
   * builder
   *   .where('organization_id', '=', orgId)
   *   .where('status', 'IN', ['open', 'pending'])
   *   .where('deleted_at', 'IS NULL');
   */
  where(
    column: string,
    operator: ComparisonOperator,
    value?: any,
    logicalOperator: LogicalOperator = 'AND'
  ): QueryBuilder {
    this.whereConditions.push({
      column,
      operator,
      value,
      logicalOperator
    });
    return this;
  }

  /**
   * Adds a raw WHERE condition
   * 
   * Use for complex conditions that can't be expressed with simple operators
   * SECURITY: Ensure no user input is used directly in the condition string
   * 
   * @param condition - Raw SQL condition (e.g., "salary_min <= $1 AND salary_max >= $1")
   * @param values - Parameter values to bind
   * @param logicalOperator - AND or OR
   * @returns this for chaining
   * 
   * @example
   * builder.whereRaw('salary_min <= $1 AND salary_max >= $1', [80000]);
   */
  whereRaw(
    condition: string,
    values: any[] = [],
    logicalOperator: LogicalOperator = 'AND'
  ): QueryBuilder {
    // Add raw condition as special marker
    this.whereConditions.push({
      column: condition,
      operator: '=' as ComparisonOperator,
      value: { _raw: true, values },
      logicalOperator
    });
    return this;
  }

  /**
   * Adds a JOIN clause
   * 
   * @param type - JOIN type (INNER, LEFT, RIGHT, FULL)
   * @param table - Table to join
   * @param onCondition - ON condition (e.g., "jobs.workspace_id = workspaces.id")
   * @returns this for chaining
   * 
   * @example
   * builder.join('LEFT', 'workspaces', 'jobs.workspace_id = workspaces.id');
   */
  join(
    type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL',
    table: string,
    onCondition: string
  ): QueryBuilder {
    this.joins.push({ type, table, onCondition });
    return this;
  }

  /**
   * Adds ORDER BY clause
   * 
   * @param column - Column name
   * @param direction - ASC or DESC
   * @returns this for chaining
   * 
   * @example
   * builder.orderBy('created_at', 'DESC');
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    if (this.orderByClause) {
      this.orderByClause += `, ${column} ${direction}`;
    } else {
      this.orderByClause = `${column} ${direction}`;
    }
    return this;
  }

  /**
   * Sets LIMIT
   * 
   * @param limit - Maximum number of rows
   * @returns this for chaining
   * 
   * @example
   * builder.limit(20);
   */
  limit(limit: number): QueryBuilder {
    if (limit < 1) {
      throw new Error('LIMIT must be at least 1');
    }
    this.limitValue = limit;
    return this;
  }

  /**
   * Sets OFFSET
   * 
   * @param offset - Number of rows to skip
   * @returns this for chaining
   * 
   * @example
   * builder.offset(0);
   */
  offset(offset: number): QueryBuilder {
    if (offset < 0) {
      throw new Error('OFFSET cannot be negative');
    }
    this.offsetValue = offset;
    return this;
  }

  /**
   * Sets pagination (convenience method for limit + offset)
   * 
   * @param page - Page number (1-indexed)
   * @param pageSize - Items per page
   * @returns this for chaining
   * 
   * @example
   * builder.paginate(2, 20); // Page 2, 20 items per page
   */
  paginate(page: number, pageSize: number): QueryBuilder {
    if (page < 1) {
      throw new Error('Page must be at least 1');
    }
    const offset = (page - 1) * pageSize;
    this.limit(pageSize);
    this.offset(offset);
    return this;
  }

  /**
   * Adds GROUP BY clause
   * 
   * @param columns - Column names to group by
   * @returns this for chaining
   * 
   * @example
   * builder.groupBy(['department', 'status']);
   */
  groupBy(columns: string[]): QueryBuilder {
    this.groupByClause = `GROUP BY ${columns.join(', ')}`;
    return this;
  }

  /**
   * Adds HAVING clause (for GROUP BY filtering)
   * 
   * @param condition - HAVING condition (must reference aggregate function)
   * @returns this for chaining
   * 
   * @example
   * builder.having('COUNT(*) > 10');
   */
  having(condition: string): QueryBuilder {
    this.havingClause = `HAVING ${condition}`;
    return this;
  }

  /**
   * Builds the complete SQL query with parameterized values
   * 
   * @returns Object with sql and values for pg.query()
   * 
   * @example
   * const { sql, values } = builder.build();
   * const result = await pool.query(sql, values);
   */
  build(): { sql: string; values: any[] } {
    const parts: string[] = [];

    // 1. SELECT clause
    parts.push(`SELECT ${this.selectColumns.join(', ')} FROM ${this.table}`);

    // 2. JOIN clauses
    for (const join of this.joins) {
      parts.push(`${join.type} JOIN ${join.table} ON ${join.onCondition}`);
    }

    // 3. WHERE clause
    if (this.whereConditions.length > 0) {
      const whereClause = this.buildWhereClause();
      parts.push(whereClause);
    }

    // 4. GROUP BY clause
    if (this.groupByClause) {
      parts.push(this.groupByClause);
    }

    // 5. HAVING clause
    if (this.havingClause) {
      parts.push(this.havingClause);
    }

    // 6. ORDER BY clause
    if (this.orderByClause) {
      parts.push(`ORDER BY ${this.orderByClause}`);
    }

    // 7. LIMIT clause
    if (this.limitValue !== undefined) {
      this.parameterCount++;
      parts.push(`LIMIT $${this.parameterCount}`);
      this.parameters.push(this.limitValue);
    }

    // 8. OFFSET clause
    if (this.offsetValue !== undefined) {
      this.parameterCount++;
      parts.push(`OFFSET $${this.parameterCount}`);
      this.parameters.push(this.offsetValue);
    }

    const sql = parts.join(' ');

    return {
      sql,
      values: this.parameters
    };
  }

  /**
   * Builds the WHERE clause with all conditions
   * 
   * @returns WHERE clause string
   * @private
   */
  private buildWhereClause(): string {
    const conditions: string[] = [];
    this.parameters = []; // Reset parameters
    this.parameterCount = 0;

    for (const condition of this.whereConditions) {
      if (condition.value && condition.value._raw) {
        // Raw condition
        const rawValues = condition.value.values;
        const paramPlaceholders = rawValues.map(() => {
          this.parameterCount++;
          return `$${this.parameterCount}`;
        }).join(', ');
        
        conditions.push(condition.column.replace(/\$\d+/g, () => {
          const param = paramPlaceholders.split(', ').shift();
          paramPlaceholders.split(', ').shift(); // Advance
          return param || '';
        }));
        this.parameters.push(...rawValues);
      } else {
        // Standard condition
        this.parameterCount++;

        const columnPart = condition.column;

        if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
          conditions.push(`${columnPart} ${condition.operator}`);
        } else if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
          if (!Array.isArray(condition.value)) {
            throw new Error(`${condition.operator} requires an array value`);
          }
          const placeholders = condition.value.map(() => {
            this.parameterCount++;
            return `$${this.parameterCount}`;
          }).join(', ');
          conditions.push(`${columnPart} ${condition.operator} (${placeholders})`);
          this.parameters.push(...condition.value);
          this.parameterCount--; // Adjust since we incremented in the loop
        } else {
          conditions.push(`${columnPart} ${condition.operator} $${this.parameterCount}`);
          this.parameters.push(condition.value);
        }
      }
    }

    return `WHERE ${conditions.join(' AND ')}`;
  }

  /**
   * Gets the WHERE conditions for COUNT queries
   * 
   * @returns Array of WHERE conditions
   */
  getWhereConditions(): Array<{ column: string; operator: ComparisonOperator; value?: any }> {
    return this.whereConditions.map(c => ({
      column: c.column,
      operator: c.operator,
      value: c.value
    }));
  }

  /**
   * Clones the current query builder
   * 
   * Useful for building multiple queries with common base conditions
   * 
   * @returns New QueryBuilder instance with same configuration
   * 
   * @example
   * const baseQuery = new QueryBuilder('jobs')
   *   .where('organization_id', '=', orgId)
   *   .where('deleted_at', 'IS NULL');
   * 
   * const openJobsQuery = baseQuery.clone()
   *   .where('status', '=', 'open')
   *   .orderBy('created_at', 'DESC');
   * 
   * const closedJobsQuery = baseQuery.clone()
   *   .where('status', '=', 'closed');
   */
  clone(): QueryBuilder {
    const newBuilder = new QueryBuilder(this.table);
    newBuilder.selectColumns = [...this.selectColumns];
    newBuilder.whereConditions = JSON.parse(JSON.stringify(this.whereConditions));
    newBuilder.joins = JSON.parse(JSON.stringify(this.joins));
    newBuilder.orderByClause = this.orderByClause;
    newBuilder.limitValue = this.limitValue;
    newBuilder.offsetValue = this.offsetValue;
    newBuilder.groupByClause = this.groupByClause;
    newBuilder.havingClause = this.havingClause;
    return newBuilder;
  }
}

/**
 * Helper to build safe IN clause values
 * 
 * @param values - Array of values
 * @returns Array safe for use in IN clause
 * 
 * @example
 * const statuses = ['open', 'pending', 'closed'];
 * builder.where('status', 'IN', inList(statuses));
 */
export function inList(values: any[]): any[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('inList requires non-empty array');
  }
  return values;
}

/**
 * Helper to build LIKE pattern for searches
 * 
 * @param searchTerm - Search term
 * @param position - 'start', 'end', or 'contains'
 * @returns LIKE pattern
 * 
   * @example
 * // Search for names starting with "John"
 * builder.where('name', 'ILIKE', likePattern('John', 'start'));
 * 
 * // Search for emails containing "example"
 * builder.where('email', 'ILIKE', likePattern('example', 'contains'));
 */
export function likePattern(
  searchTerm: string,
  position: 'start' | 'end' | 'contains' = 'contains'
): string {
  const escaped = searchTerm.replace(/%/g, '\\%').replace(/_/g, '\\_');

  switch (position) {
    case 'start':
      return `${escaped}%`;
    case 'end':
      return `%${escaped}`;
    case 'contains':
    default:
      return `%${escaped}%`;
  }
}
