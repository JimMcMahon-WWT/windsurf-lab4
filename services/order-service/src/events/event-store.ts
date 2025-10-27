import { v4 as uuidv4 } from 'uuid';

import { pool } from '../config/database.config';
import { logger } from '../utils/logger.utils';

import { DomainEvent } from './base.event';

export interface EventStoreRecord {
  id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  event_version: number;
  event_data: any;
  metadata: any;
  created_at: Date;
  created_by?: string;
}

export interface Snapshot {
  aggregate_id: string;
  aggregate_type: string;
  snapshot_version: number;
  snapshot_data: any;
  created_at: Date;
}

export class EventStore {
  /**
   * Append a single event to the event store
   */
  async appendEvent(event: DomainEvent): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get the next version number for this aggregate
      const versionResult = await client.query(
        'SELECT COALESCE(MAX(event_version), 0) + 1 as next_version FROM event_store WHERE aggregate_id = $1',
        [event.aggregateId]
      );
      const nextVersion = versionResult.rows[0].next_version;

      // Insert the event
      await client.query(
        `INSERT INTO event_store 
         (id, aggregate_id, aggregate_type, event_type, event_version, event_data, metadata, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          event.aggregateId,
          event.aggregateType,
          event.eventType,
          nextVersion,
          event.data,
          event.metadata || {},
          event.metadata?.userId || null,
        ]
      );

      await client.query('COMMIT');
      logger.debug(`Event appended: ${event.eventType} for aggregate ${event.aggregateId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to append event:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Append multiple events atomically
   */
  async appendEvents(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const aggregateId = events[0].aggregateId;

      // Get the next version number
      const versionResult = await client.query(
        'SELECT COALESCE(MAX(event_version), 0) as current_version FROM event_store WHERE aggregate_id = $1',
        [aggregateId]
      );
      let currentVersion = versionResult.rows[0].current_version;

      // Insert all events
      for (const event of events) {
        currentVersion++;
        
        await client.query(
          `INSERT INTO event_store 
           (id, aggregate_id, aggregate_type, event_type, event_version, event_data, metadata, created_by) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            event.aggregateId,
            event.aggregateType,
            event.eventType,
            currentVersion,
            event.data,
            event.metadata || {},
            event.metadata?.userId || null,
          ]
        );
      }

      await client.query('COMMIT');
      logger.debug(`${events.length} events appended for aggregate ${aggregateId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to append events:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all events for an aggregate
   */
  async getEvents(aggregateId: string, fromVersion: number = 0): Promise<DomainEvent[]> {
    const result = await pool.query(
      `SELECT * FROM event_store 
       WHERE aggregate_id = $1 AND event_version > $2
       ORDER BY event_version ASC`,
      [aggregateId, fromVersion]
    );

    return result.rows.map((row: any) => ({
      eventId: row.id,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      eventType: row.event_type,
      eventVersion: row.event_version,
      timestamp: row.created_at,
      data: row.event_data,
      metadata: row.metadata,
    }));
  }

  /**
   * Get events by aggregate type
   */
  async getEventsByType(aggregateType: string, limit: number = 100): Promise<DomainEvent[]> {
    const result = await pool.query(
      `SELECT * FROM event_store 
       WHERE aggregate_type = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [aggregateType, limit]
    );

    return result.rows.map((row: any) => ({
      eventId: row.id,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      eventType: row.event_type,
      eventVersion: row.event_version,
      timestamp: row.created_at,
      data: row.event_data,
      metadata: row.metadata,
    }));
  }

  /**
   * Save a snapshot for performance optimization
   */
  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    await pool.query(
      `INSERT INTO event_snapshots 
       (aggregate_id, aggregate_type, snapshot_version, snapshot_data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (aggregate_id) 
       DO UPDATE SET 
         snapshot_version = EXCLUDED.snapshot_version,
         snapshot_data = EXCLUDED.snapshot_data,
         created_at = CURRENT_TIMESTAMP`,
      [
        snapshot.aggregate_id,
        snapshot.aggregate_type,
        snapshot.snapshot_version,
        snapshot.snapshot_data,
      ]
    );

    logger.debug(`Snapshot saved for aggregate ${snapshot.aggregate_id} at version ${snapshot.snapshot_version}`);
  }

  /**
   * Get the latest snapshot for an aggregate
   */
  async getSnapshot(aggregateId: string): Promise<Snapshot | null> {
    const result = await pool.query(
      'SELECT * FROM event_snapshots WHERE aggregate_id = $1',
      [aggregateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      aggregate_id: row.aggregate_id,
      aggregate_type: row.aggregate_type,
      snapshot_version: row.snapshot_version,
      snapshot_data: row.snapshot_data,
      created_at: row.created_at,
    };
  }

  /**
   * Get all events since a specific timestamp (for catch-up subscriptions)
   */
  async getEventsSince(timestamp: Date, limit: number = 100): Promise<DomainEvent[]> {
    const result = await pool.query(
      `SELECT * FROM event_store 
       WHERE created_at > $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [timestamp, limit]
    );

    return result.rows.map((row: any) => ({
      eventId: row.id,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      eventType: row.event_type,
      eventVersion: row.event_version,
      timestamp: row.created_at,
      data: row.event_data,
      metadata: row.metadata,
    }));
  }

  /**
   * Check if an aggregate exists
   */
  async aggregateExists(aggregateId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM event_store WHERE aggregate_id = $1)',
      [aggregateId]
    );
    return result.rows[0].exists;
  }

  /**
   * Get event count for an aggregate
   */
  async getEventCount(aggregateId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM event_store WHERE aggregate_id = $1',
      [aggregateId]
    );
    return parseInt(result.rows[0].count);
  }
}

export const eventStore = new EventStore();
